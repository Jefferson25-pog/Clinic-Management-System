from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re

class LabTests(models.Model):
    LAB_TEST_ID = models.AutoField(primary_key=True)
    Lab_Test_Name = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\-\(\)]+$',
                message='Lab test name can only contain letters, numbers, spaces, hyphens and parentheses'
            )
        ]
    )
    Lab_Test_Cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[
            MinValueValidator(0, message='Lab test cost cannot be negative'),
            MinValueValidator(1, message='Lab test cost must be at least 1')
        ]
    )
    Description = models.TextField(
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\.,!?\-\(\):;]+$',
                message='Description can only contain letters, numbers, spaces and basic punctuation'
            )
        ]
    )
    
    def __str__(self):
        return f"{self.Lab_Test_Name} (${self.Lab_Test_Cost})"
    
    def clean(self):
        # Lab test name validation
        if len(self.Lab_Test_Name.strip()) < 3:
            raise ValidationError({'Lab_Test_Name': 'Lab test name must be at least 3 characters long'})
        
        # Cost validation
        if self.Lab_Test_Cost <= 0:
            raise ValidationError({'Lab_Test_Cost': 'Lab test cost must be greater than 0'})
    
    class Meta:
        db_table = 'LAB_TESTS'

class LabTestResults(models.Model):
    RESULT_ID = models.AutoField(primary_key=True)
    LAB_REQUEST = models.OneToOneField('doctorapp.LabTestRequestDetails', on_delete=models.CASCADE)
    Findings = models.TextField(
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\.,!?\-\(\):;/]+$',
                message='Findings can only contain letters, numbers, spaces and basic punctuation'
            )
        ]
    )
    Normal_Range = models.CharField(
        max_length=100, 
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\-\–\.]+$',
                message='Normal range can only contain letters, numbers, spaces, hyphens and dots'
            )
        ]
    )
    Remarks = models.TextField(
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\.,!?\-\(\):;]+$',
                message='Remarks can only contain letters, numbers, spaces and basic punctuation'
            )
        ]
    )
    Result_Date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Results for Request {self.LAB_REQUEST.LAB_REQUEST_ID}"
    
    def clean(self):
        # Findings validation
        if len(self.Findings.strip()) < 5:
            raise ValidationError({'Findings': 'Findings must be at least 5 characters long'})
        
        # Normal range format validation (e.g., "120-140 mg/dL")
        if self.Normal_Range and not re.match(r'^[\d\s\-\–\.a-zA-Z/]+$', self.Normal_Range):
            raise ValidationError({'Normal_Range': 'Normal range should be in format like "120-140 mg/dL"'})
    
    class Meta:
        db_table = 'LAB_TEST_RESULTS'