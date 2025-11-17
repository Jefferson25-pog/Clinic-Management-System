from django.db import models


class Supplier(models.Model):
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)


class Stock(models.Model):
    expiry_date = models.DateField()
    stock_available = models.IntegerField()
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)


class Medicine(models.Model):
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    price_per_unit = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)


class Dispense(models.Model):
    consultation = models.ForeignKey('doctor.Consultation', on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    qty = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)


class StockOrder(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    qty_supplied = models.IntegerField()
    date_of_supply = models.DateField()
    supply_cost = models.DecimalField(max_digits=10, decimal_places=2)
