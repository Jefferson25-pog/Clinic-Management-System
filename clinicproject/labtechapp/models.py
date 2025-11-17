from django.db import models
from doctorapp.models import Consultation


class LabTest(models.Model):
    name = models.CharField(max_length=100)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=100)


class LabTestRequest(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE)
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE)
    date_of_request = models.DateField()
    status = models.CharField(max_length=50)
    notes = models.TextField(blank=True, null=True)


class LabTestResult(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE)
    results = models.TextField()
