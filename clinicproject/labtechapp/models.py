# In labtechapp/models.py - Cleaned up version
from django.db import models
from django.core.validators import MinValueValidator

class LabTests(models.Model):
    LAB_TEST_ID = models.AutoField(primary_key=True)
    Lab_Test_Name = models.CharField(max_length=100)
    Lab_Test_Cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    Description = models.TextField(blank=True)  # Added description instead of location
    
    def __str__(self):
        return f"{self.Lab_Test_Name} (${self.Lab_Test_Cost})"
    
    class Meta:
        db_table = 'LAB_TESTS'

class LabTestRequestDetails(models.Model):
    STATUS_CHOICES = [
        ('Requested', 'Requested'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    LAB_REQUEST_ID = models.AutoField(primary_key=True)
    CONSULT_ID = models.ForeignKey('doctorapp.ConsultationDetails', on_delete=models.CASCADE)
    LAB_TEST_ID = models.ForeignKey('LabTests', on_delete=models.CASCADE)
    Requested_Date = models.DateTimeField(auto_now_add=True)  # Renamed for clarity
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Requested')  # Renamed
    Notes = models.TextField(blank=True)  # Simplified name
    
    def __str__(self):
        return f"Lab Request {self.LAB_REQUEST_ID} - {self.LAB_TEST_ID.Lab_Test_Name}"
    
    class Meta:
        db_table = 'LAB_TEST_REQUEST_DETAILS'

class LabTestResults(models.Model):
    RESULT_ID = models.AutoField(primary_key=True)
    LAB_REQUEST = models.OneToOneField('LabTestRequestDetails', on_delete=models.CASCADE)  # Fixed field name
    Findings = models.TextField()
    Normal_Range = models.CharField(max_length=100, blank=True)
    Remarks = models.TextField(blank=True)
    Result_Date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Results for Request {self.LAB_REQUEST.LAB_REQUEST_ID}"  # Fixed reference
    
    class Meta:
        db_table = 'LAB_TEST_RESULTS'