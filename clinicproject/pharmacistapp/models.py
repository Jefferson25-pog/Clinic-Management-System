from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from datetime import date

class MedicineDetails(models.Model):
    MED_ID = models.AutoField(primary_key=True)
    Medicine_Name = models.CharField(max_length=100)
    Dosage = models.CharField(max_length=50)
    Price_per_Unit = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[
            MinValueValidator(0, message='Price cannot be negative'),
            MaxValueValidator(10000, message='Price cannot exceed 10000')
        ]
    )
    
    def __str__(self):
        return f"{self.Medicine_Name} - {self.Dosage} (${self.Price_per_Unit})"
    
    class Meta:
        db_table = 'MEDICINE_DETAILS'

class SupplierDetails(models.Model):
    SUPPLIER_ID = models.AutoField(primary_key=True)
    Supplier_Name = models.CharField(max_length=100)
    Phone_Number = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Enter a valid phone number'
            )
        ]
    )
    
    def __str__(self):
        return f"{self.Supplier_Name} ({self.Phone_Number})"
    
    class Meta:
        db_table = 'SUPPLIER_DETAILS'

class StockDetails(models.Model):
    STOCK_ID = models.AutoField(primary_key=True)
    MED_ID = models.ForeignKey('MedicineDetails', on_delete=models.CASCADE)
    Expiry_Date = models.DateField()
    Stock_Availability = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0, message='Stock cannot be negative')]
    )
    SUPPLIER_ID = models.ForeignKey('SupplierDetails', on_delete=models.CASCADE)
    
    def __str__(self):
        return f"Stock {self.STOCK_ID} - {self.MED_ID.Medicine_Name} (Qty: {self.Stock_Availability})"
    
    def clean(self):
        if self.Expiry_Date and self.Expiry_Date < date.today():
            raise ValidationError({'Expiry_Date': 'Expiry date cannot be in the past'})
    
    class Meta:
        db_table = 'STOCK_DETAILS'

class StockOrderingDetails(models.Model):
    SUPPLY_ID = models.AutoField(primary_key=True)
    SUPPLIER_ID = models.ForeignKey('SupplierDetails', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('MedicineDetails', on_delete=models.CASCADE)
    Qty_Supplied = models.IntegerField(
        validators=[MinValueValidator(1, message='Quantity must be at least 1')]
    )
    Date_of_Supply = models.DateField()
    Supply_Cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0, message='Cost cannot be negative')]
    )
    
    def __str__(self):
        return f"Supply {self.SUPPLY_ID} - {self.MED_ID.Medicine_Name} from {self.SUPPLIER_ID.Supplier_Name}"
    
    def clean(self):
        if self.Date_of_Supply and self.Date_of_Supply > date.today():
            raise ValidationError({'Date_of_Supply': 'Supply date cannot be in the future'})
    
    class Meta:
        db_table = 'STOCK_ORDERING_DETAILS'

class DispensingMedicines(models.Model):
    DISPENSE_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetails', on_delete=models.CASCADE)
    MED_ID = models.ForeignKey('MedicineDetails', on_delete=models.CASCADE)
    Qty = models.IntegerField(
        validators=[MinValueValidator(1, message='Quantity must be at least 1')]
    )
    Price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0, message='Price cannot be negative')]
    )
    Dispense_Date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Dispense {self.DISPENSE_ID} - {self.MED_ID.Medicine_Name} x{self.Qty} for {self.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name}"
    
    class Meta:
        db_table = 'DISPENSING_MEDICINES'