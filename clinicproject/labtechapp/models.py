from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from django.core.exceptions import ValidationError
import re

class LabTest(models.Model):
    LAB_TEST_ID = models.AutoField(primary_key=True, verbose_name="Lab Test ID")
    Lab_Test_Name = models.CharField(
        max_length=100,
        verbose_name="Lab Test Name",
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
        verbose_name="Lab Test Cost",
        validators=[
            MinValueValidator(0, message='Lab test cost cannot be negative'),
            MinValueValidator(1, message='Lab test cost must be at least 1')
        ]
    )
    Description = models.TextField(
        blank=True,
        verbose_name="Description",
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
        if len(self.Lab_Test_Name.strip()) < 3:
            raise ValidationError({'Lab_Test_Name': 'Lab test name must be at least 3 characters long'})
        
        if self.Lab_Test_Cost <= 0:
            raise ValidationError({'Lab_Test_Cost': 'Lab test cost must be greater than 0'})
    
    class Meta:
        db_table = 'LAB_TESTS'
        verbose_name = 'Lab Test'
        verbose_name_plural = 'Lab Tests'

class LabTestResult(models.Model):
    RESULT_ID = models.AutoField(primary_key=True, verbose_name="Result ID")
    LAB_REQUEST = models.OneToOneField('doctorapp.LabTestRequestDetail', on_delete=models.CASCADE, verbose_name="Lab Request")
    Findings = models.TextField(
        verbose_name="Findings",
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
        verbose_name="Normal Range",
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\-\–\.]+$',
                message='Normal range can only contain letters, numbers, spaces, hyphens and dots'
            )
        ]
    )
    Remarks = models.TextField(
        blank=True,
        verbose_name="Remarks",
        validators=[
            RegexValidator(
                regex=r'^[A-Za-z0-9\s\.,!?\-\(\):;]+$',
                message='Remarks can only contain letters, numbers, spaces and basic punctuation'
            )
        ]
    )
    Result_Date = models.DateTimeField(auto_now_add=True, verbose_name="Result Date")
    
    def __str__(self):
        return f"Results for Request {self.LAB_REQUEST.LAB_REQUEST_ID}"
    
    def clean(self):
        if len(self.Findings.strip()) < 5:
            raise ValidationError({'Findings': 'Findings must be at least 5 characters long'})
        
        if self.Normal_Range and not re.match(r'^[\d\s\-\–\.a-zA-Z/]+$', self.Normal_Range):
            raise ValidationError({'Normal_Range': 'Normal range should be in format like "120-140 mg/dL"'})
    
    class Meta:
        db_table = 'LAB_TEST_RESULTS'
        verbose_name = 'Lab Test Result'
        verbose_name_plural = 'Lab Test Results'