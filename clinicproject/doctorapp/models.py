from django.db import models
from adminapp.models import Staff, Department
from receptionistapp.models import Patient


class Doctor(models.Model):
    staff = models.OneToOneField(Staff, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    consultation_fees = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=50)

    def __str__(self):
        return self.staff.name


class Appointment(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    date = models.DateField()
    token_no = models.IntegerField()
    status = models.CharField(max_length=50)

    class Meta:
        unique_together = ('doctor', 'date', 'token_no')


class Consultation(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE)
    symptoms = models.TextField()
    diagnosis = models.TextField()
    description = models.TextField()


class Prescription(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE)
    medicine = models.ForeignKey('pharmacist.Medicine', on_delete=models.CASCADE)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
