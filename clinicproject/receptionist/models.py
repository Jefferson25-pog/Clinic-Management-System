from django.db import models
from doctor.models import Consultation


class Patient(models.Model):
    name = models.CharField(max_length=100)
    dob = models.DateField()
    address = models.TextField()
    phone_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return self.name


class Bill(models.Model):
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE)
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.CharField(max_length=50)
