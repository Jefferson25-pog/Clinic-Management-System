from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from datetime import date
import re

class MedicineDetails(models.Model):
    MED_ID = models.AutoField(primary_key=True)
    Medicine_Name = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\-\(\)]+$',
                message='Medicine name can only contain letters, numbers, spaces, hyphens and parentheses'
            )
        ]
    )
    Dosage = models.CharField(
        max_length=50,
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
        validators=[
            MinValueValidator(0.01, message='Price must be at least 0.01'),
            MaxValueValidator(10000, message='Price cannot exceed 10000')
        ]
    )
    
    def __str__(self):
        return f"{self.Medicine_Name} - {self.Dosage} (${self.Price_per_Unit})"
    
    def clean(self):
        # Medicine name validation
        if len(self.Medicine_Name.strip()) < 2:
            raise ValidationError({'Medicine_Name': 'Medicine name must be at least 2 characters long'})
        
        # Dosage validation - must contain numbers
        if not any(char.isdigit() for char in self.Dosage):
            raise ValidationError({'Dosage': 'Dosage must contain numeric values'})
    
    class Meta:
        db_table = 'MEDICINE_DETAILS'

class SupplierDetails(models.Model):
    SUPPLIER_ID = models.AutoField(primary_key=True)
    Supplier_Name = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z\s\.\-&]+$',
                message='Supplier name can only contain letters, spaces, dots, hyphens and ampersand'
            )
        ]
    )
    Phone_Number = models.CharField(
        max_length=10,  # Fixed to 10 digits
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
        # Supplier name validation
        if len(self.Supplier_Name.strip()) < 2:
            raise ValidationError({'Supplier_Name': 'Supplier name must be at least 2 characters long'})
    
    class Meta:
        db_table = 'SUPPLIER_DETAILS'

class StockDetails(models.Model):
    STOCK_ID = models.AutoField(primary_key=True)
    MED_ID = models.ForeignKey('MedicineDetails', on_delete=models.CASCADE)
    Expiry_Date = models.DateField()
    Stock_Availability = models.IntegerField(
        default=0,
        validators=[
            MinValueValidator(0, message='Stock cannot be negative'),
            MaxValueValidator(100000, message='Stock cannot exceed 100,000 units')
        ]
    )
    SUPPLIER_ID = models.ForeignKey('SupplierDetails', on_delete=models.CASCADE)
    
    def __str__(self):
        return f"Stock {self.STOCK_ID} - {self.MED_ID.Medicine_Name} (Qty: {self.Stock_Availability})"
    
    def clean(self):
        # Expiry date validation
        if self.Expiry_Date and self.Expiry_Date <= date.today():
            raise ValidationError({'Expiry_Date': 'Expiry date must be in the future'})
        
        # Stock validation
        if self.Stock_Availability < 0:
            raise ValidationError({'Stock_Availability': 'Stock availability cannot be negative'})
    
    class Meta:
        db_table = 'STOCK_DETAILS'

class StockOrderingDetails(models.Model):
    SUPPLY_ID = models.AutoField(primary_key=True)
    SUPPLIER_ID = models.ForeignKey('SupplierDetails', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('MedicineDetails', on_delete=models.CASCADE)
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
    
    def __str__(self):
        return f"Supply {self.SUPPLY_ID} - {self.MED_ID.Medicine_Name} from {self.SUPPLIER_ID.Supplier_Name}"
    
    def clean(self):
        # Date validation
        if self.Date_of_Supply and self.Date_of_Supply > date.today():
            raise ValidationError({'Date_of_Supply': 'Supply date cannot be in the future'})
        
        # Cost validation
        if self.Supply_Cost <= 0:
            raise ValidationError({'Supply_Cost': 'Supply cost must be greater than 0'})
        
        # Quantity validation
        if self.Qty_Supplied <= 0:
            raise ValidationError({'Qty_Supplied': 'Quantity supplied must be greater than 0'})
    
    class Meta:
        db_table = 'STOCK_ORDERING_DETAILS'

class DispensingMedicines(models.Model):
    DISPENSE_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetails', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('MedicineDetails', on_delete=models.CASCADE)
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
    
    def __str__(self):
        return f"Dispense {self.DISPENSE_ID} - {self.MED_ID.Medicine_Name} x{self.Qty} for {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name}"
    
    def clean(self):
        # Quantity validation
        if self.Qty <= 0:
            raise ValidationError({'Qty': 'Quantity must be greater than 0'})
        
        # Price validation
        if self.Price <= 0:
            raise ValidationError({'Price': 'Price must be greater than 0'})
    
    class Meta:
        db_table = 'DISPENSING_MEDICINES'