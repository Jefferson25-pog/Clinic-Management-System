from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from datetime import date
import re


class MedicineDetail(models.Model):
    MED_ID = models.AutoField(primary_key=True, verbose_name="Medicine ID")
    Medicine_Name = models.CharField(
        max_length=100,
        verbose_name="Medicine Name",
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\-\(\)]+$',
                message='Medicine name can only contain letters, numbers, spaces, hyphens and parentheses'
            )   
        ]
    )
    Dosage = models.CharField(
        max_length=50,
        verbose_name="Dosage",
        validators=[
            RegexValidator(
                regex=r'^[\d\.]+\s*[a-zA-Z]*$',
                message='Dosage should be in format like "500 mg" or "10 ml"'
            )
        ]
    )
    Price_per_Unit = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name="Price per Unit",
        validators=[
            MinValueValidator(0.01, message='Price must be at least 0.01'),
            MaxValueValidator(10000, message='Price cannot exceed 10000')
        ]
    )
    
    def __str__(self):
        return f"{self.Medicine_Name} - {self.Dosage} (${self.Price_per_Unit})"
    
    def clean(self):
        if len(self.Medicine_Name.strip()) < 2:
            raise ValidationError({'Medicine_Name': 'Medicine name must be at least 2 characters long'})
        
        if not any(char.isdigit() for char in self.Dosage):
            raise ValidationError({'Dosage': 'Dosage must contain numeric values'})
    
    class Meta:
        db_table = 'MEDICINE_DETAILS'
        verbose_name = 'Medicine Detail'
        verbose_name_plural = 'Medicine Details'

class SupplierDetail(models.Model):
    SUPPLIER_ID = models.AutoField(primary_key=True, verbose_name="Supplier ID")
    Supplier_Name = models.CharField(
        max_length=100,
        verbose_name="Supplier Name",
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z\s\.\-&]+$',
                message='Supplier name can only contain letters, spaces, dots, hyphens and ampersand'
            )
        ]
    )
    Phone_Number = models.CharField(
        max_length=10,
        verbose_name="Phone Number",
        validators=[
            RegexValidator(
                regex=r'^\d{10}$',
                message='Phone number must be exactly 10 digits (no symbols or spaces)'
            )
        ]
    )
    
    def __str__(self):
        return f"{self.Supplier_Name} ({self.Phone_Number})"
    
    def clean(self):
        if len(self.Supplier_Name.strip()) < 2:
            raise ValidationError({'Supplier_Name': 'Supplier name must be at least 2 characters long'})
    
    class Meta:
        db_table = 'SUPPLIER_DETAILS'
        verbose_name = 'Supplier Detail'
        verbose_name_plural = 'Supplier Details'

class MedicineBatch(models.Model):
    BATCH_ID = models.AutoField(primary_key=True, verbose_name="Batch ID")
    MED_ID = models.ForeignKey('MedicineDetail', on_delete=models.CASCADE, verbose_name="Medicine")
    SUPPLIER_ID = models.ForeignKey('SupplierDetail', on_delete=models.CASCADE, verbose_name="Supplier")
    Batch_Number = models.CharField(max_length=100, unique=True, verbose_name="Batch Number")
    Expiry_Date = models.DateField(verbose_name="Expiry Date")
    Quantity_Received = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Quantity Received")
    Quantity_Available = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Available quantity in this batch",
        verbose_name="Quantity Available"
    )
    Purchase_Date = models.DateField(auto_now_add=True, verbose_name="Purchase Date")
    Unit_Cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name="Unit Cost"
    )
    Is_Active = models.BooleanField(default=True, verbose_name="Is Active")
    
    def __str__(self):
        return f"Batch {self.Batch_Number} - {self.MED_ID.Medicine_Name} (Exp: {self.Expiry_Date})"
    
    def clean(self):
        if self.Expiry_Date and self.Expiry_Date <= date.today():
            raise ValidationError({'Expiry_Date': 'Expiry date must be in the future'})
        
        if self.Quantity_Available > self.Quantity_Received:
            raise ValidationError({'Quantity_Available': 'Available quantity cannot exceed received quantity'})
    
    class Meta:
        db_table = 'MEDICINE_BATCHES'
        verbose_name = 'Medicine Batch'
        verbose_name_plural = 'Medicine Batches'
        ordering = ['Expiry_Date']

 # FIFO - earliest expiry first

class StockDetails(models.Model):
    STOCK_ID = models.AutoField(primary_key=True)
    MED_ID = models.ForeignKey('MedicineDetail', on_delete=models.CASCADE)
    # These fields now become calculated summaries
    Earliest_Expiry = models.DateField(null=True, blank=True, help_text="Earliest expiry among active batches")
    Total_Stock_Availability = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Total available stock across all batches"
    )
    Minimum_Stock_Level = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0)],
        help_text="Alert when total stock goes below this level"
    )
    
    def __str__(self):
        return f"Stock Summary - {self.MED_ID.Medicine_Name} (Total: {self.Total_Stock_Availability})"
    
    def update_stock_summary(self):
        """Update summary fields from active batches"""
        active_batches = MedicineBatch.objects.filter(
            MED_ID=self.MED_ID,
            Is_Active=True,
            Quantity_Available__gt=0
        )
        
        if active_batches.exists():
            self.Total_Stock_Availability = sum(batch.Quantity_Available for batch in active_batches)
            self.Earliest_Expiry = min(batch.Expiry_Date for batch in active_batches)
        else:
            self.Total_Stock_Availability = 0
            self.Earliest_Expiry = None
        
        self.save()
    
    def get_available_batches(self, quantity_needed):
        """Get batches for dispensing using FIFO (earliest expiry first)"""
        return MedicineBatch.objects.filter(
            MED_ID=self.MED_ID,
            Is_Active=True,
            Quantity_Available__gt=0,
            Expiry_Date__gt=date.today()
        ).order_by('Expiry_Date')
    
    def clean(self):
        if self.Minimum_Stock_Level < 0:
            raise ValidationError({'Minimum_Stock_Level': 'Minimum stock level cannot be negative'})
    
    class Meta:
        db_table = 'STOCK_DETAILS'
        verbose_name_plural = "Stock Summaries"

class StockOrderingDetail(models.Model):
    SUPPLY_ID = models.AutoField(primary_key=True)
    SUPPLIER_ID = models.ForeignKey('SupplierDetail', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('MedicineDetail', on_delete=models.CASCADE)
    Qty_Supplied = models.IntegerField(
        validators=[
            MinValueValidator(1, message='Quantity must be at least 1'),
            MaxValueValidator(10000, message='Quantity cannot exceed 10,000 units')
        ]
    )
    Date_of_Supply = models.DateField()
    Supply_Cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[
            MinValueValidator(0.01, message='Cost must be at least 0.01'),
            MaxValueValidator(1000000, message='Cost cannot exceed 1,000,000')
        ]
    )
    Batch_Number = models.CharField(max_length=100, blank=True, help_text="Auto-generated if empty")
    Expiry_Date = models.DateField(help_text="Expiry date for this supply batch")
    
    def __str__(self):
        return f"Supply {self.SUPPLY_ID} - {self.MED_ID.Medicine_Name} from {self.SUPPLIER_ID.Supplier_Name}"
    
    def save(self, *args, **kwargs):
        # Auto-generate batch number if not provided
        if not self.Batch_Number:
            self.Batch_Number = f"BATCH-{self.MED_ID.MED_ID}-{date.today().strftime('%Y%m%d')}"
        
        super().save(*args, **kwargs)
        
        # Create or update medicine batch
        self.create_or_update_batch()
    
    def create_or_update_batch(self):
        """Create a new medicine batch from this supply"""
        batch, created = MedicineBatch.objects.get_or_create(
            Batch_Number=self.Batch_Number,
            defaults={
                'MED_ID': self.MED_ID,
                'SUPPLIER_ID': self.SUPPLIER_ID,
                'Expiry_Date': self.Expiry_Date,
                'Quantity_Received': self.Qty_Supplied,
                'Quantity_Available': self.Qty_Supplied,
                'Unit_Cost': self.Supply_Cost / self.Qty_Supplied
            }
        )
        
        if not created:
            # Update existing batch
            batch.Quantity_Received += self.Qty_Supplied
            batch.Quantity_Available += self.Qty_Supplied
            batch.save()
        
        # Update stock summary
        stock_summary, _ = StockDetails.objects.get_or_create(MED_ID=self.MED_ID)
        stock_summary.update_stock_summary()
    
    def clean(self):
        # Date validation
        if self.Date_of_Supply and self.Date_of_Supply > date.today():
            raise ValidationError({'Date_of_Supply': 'Supply date cannot be in the future'})
        
        if self.Expiry_Date and self.Expiry_Date <= date.today():
            raise ValidationError({'Expiry_Date': 'Expiry date must be in the future'})
        
        # Cost validation
        if self.Supply_Cost <= 0:
            raise ValidationError({'Supply_Cost': 'Supply cost must be greater than 0'})
        
        # Quantity validation
        if self.Qty_Supplied <= 0:
            raise ValidationError({'Qty_Supplied': 'Quantity supplied must be greater than 0'})
    
    class Meta:
        db_table = 'STOCK_ORDERING_DETAILS'

class DispensingMedicine(models.Model):
    DISPENSE_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetail', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('MedicineDetail', on_delete=models.CASCADE)
    Qty = models.IntegerField(
        validators=[
            MinValueValidator(1, message='Quantity must be at least 1'),
            MaxValueValidator(1000, message='Quantity cannot exceed 1000 units per dispense')
        ]
    )
    Price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[
            MinValueValidator(0.01, message='Price must be at least 0.01'),
            MaxValueValidator(10000, message='Price cannot exceed 10,000')
        ]
    )
    Dispense_Date = models.DateTimeField(auto_now_add=True)
    Batch_Used = models.ForeignKey('MedicineBatch', on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"Dispense {self.DISPENSE_ID} - {self.MED_ID.Medicine_Name} x{self.Qty} for {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name}"
    
    def save(self, *args, **kwargs):
        # Auto-assign price if not provided
        if not self.Price:
            self.Price = self.MED_ID.Price_per_Unit
        
        # Handle batch allocation and stock reduction
        if not self.pk:  # Only on creation
            self.allocate_batch_and_reduce_stock()
        
        super().save(*args, **kwargs)
    
    def allocate_batch_and_reduce_stock(self):
        """Allocate medicine from batches using FIFO and reduce stock"""
        stock_summary = StockDetails.objects.filter(MED_ID=self.MED_ID).first()
        if not stock_summary:
            raise ValidationError(f"No stock available for {self.MED_ID.Medicine_Name}")
        
        batches = stock_summary.get_available_batches(self.Qty)
        if not batches.exists():
            raise ValidationError(f"Insufficient stock for {self.MED_ID.Medicine_Name}")
        
        remaining_qty = self.Qty
        batches_used = []
        
        for batch in batches:
            if remaining_qty <= 0:
                break
            
            if batch.Quantity_Available >= remaining_qty:
                # This batch can fulfill remaining quantity
                batch.Quantity_Available -= remaining_qty
                batch.save()
                self.Batch_Used = batch
                remaining_qty = 0
                break
            else:
                # Use entire batch and move to next
                remaining_qty -= batch.Quantity_Available
                batch.Quantity_Available = 0
                batch.save()
                batches_used.append(batch)
        
        if remaining_qty > 0:
            raise ValidationError(f"Only {self.Qty - remaining_qty} units available for {self.MED_ID.Medicine_Name}")
        
        # Update stock summary
        stock_summary.update_stock_summary()
    
    def clean(self):
        # Quantity validation
        if self.Qty <= 0:
            raise ValidationError({'Qty': 'Quantity must be greater than 0'})
        
        # Price validation
        if self.Price <= 0:
            raise ValidationError({'Price': 'Price must be greater than 0'})
    
    class Meta:
        db_table = 'DISPENSING_MEDICINES'

class StockAlert(models.Model):
    ALERT_TYPES = [
        ('low_stock', 'Low Stock'),
        ('near_expiry', 'Near Expiry'),
        ('out_of_stock', 'Out of Stock'),
        ('expired', 'Expired Medicine')
    ]
    
    ALERT_ID = models.AutoField(primary_key=True)
    MED_ID = models.ForeignKey('MedicineDetail', on_delete=models.CASCADE)
    Alert_Type = models.CharField(max_length=20, choices=ALERT_TYPES)
    Message = models.TextField()
    Is_Active = models.BooleanField(default=True)
    Created_Date = models.DateTimeField(auto_now_add=True)
    Resolved_Date = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Alert: {self.Alert_Type} - {self.MED_ID.Medicine_Name}"
    
    class Meta:
        db_table = 'STOCK_ALERTS'
        ordering = ['-Created_Date']