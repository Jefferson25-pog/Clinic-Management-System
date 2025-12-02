from rest_framework import serializers
from .models import MedicineDetail, SupplierDetail, StockDetails, StockOrderingDetail, DispensingMedicine
from datetime import date
import re

class MedicineDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineDetail
        fields = '__all__'
    
    def validate_Medicine_Name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Medicine name must be at least 2 characters long")
        if not re.match(r'^[A-Za-z0-9\s\-\(\)]+$', value):
            raise serializers.ValidationError("Medicine name can only contain letters, numbers, spaces, hyphens and parentheses")
        return value.strip()
    
    def validate_Dosage(self, value):
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Dosage must contain numeric values (e.g., 500 mg, 10 ml)")
        if not re.match(r'^[\d\.]+\s*[a-zA-Z]*$', value):
            raise serializers.ValidationError("Dosage should be in format like '500 mg' or '10 ml'")
        return value
    
    def validate_Price_per_Unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        if value > 10000:
            raise serializers.ValidationError("Price cannot exceed 10,000")
        return value

class SupplierDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierDetail
        fields = '__all__'
    
    def validate_Supplier_Name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Supplier name must be at least 2 characters long")
        if not re.match(r'^[A-Za-z\s\.\-&]+$', value):
            raise serializers.ValidationError("Supplier name can only contain letters, spaces, dots, hyphens and ampersand")
        return value.strip()
    
    def validate_Phone_Number(self, value):
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone number must be exactly 10 digits (no symbols or spaces)")
        return value

class StockDetailsSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = StockDetails
        fields = '__all__'
        read_only_fields = ['medicine_name', 'days_until_expiry']
    
    def get_days_until_expiry(self, obj):
        if obj.Earliest_Expiry:
            return (obj.Earliest_Expiry - date.today()).days
        return None
    
    def validate_Total_Stock_Availability(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock availability cannot be negative")
        if value > 100000:
            raise serializers.ValidationError("Stock cannot exceed 100,000 units")
        return value

class StockOrderingDetailsSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    supplier_name = serializers.CharField(source='SUPPLIER_ID.Supplier_Name', read_only=True)
    total_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = StockOrderingDetail
        fields = '__all__'
        read_only_fields = ['medicine_name', 'supplier_name', 'total_cost']
    
    def get_total_cost(self, obj):
        return obj.Qty_Supplied * obj.Supply_Cost
    
    def validate_Date_of_Supply(self, value):
        if value > date.today():
            raise serializers.ValidationError("Supply date cannot be in the future")
        return value
    
    def validate_Qty_Supplied(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity supplied must be greater than 0")
        if value > 10000:
            raise serializers.ValidationError("Quantity cannot exceed 10,000 units")
        return value
    
    def validate_Supply_Cost(self, value):
        if value <= 0:
            raise serializers.ValidationError("Supply cost must be greater than 0")
        if value > 1000000:
            raise serializers.ValidationError("Cost cannot exceed 1,000,000")
        return value

class DispensingMedicinesSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = DispensingMedicine
        fields = '__all__'
        read_only_fields = ['medicine_name', 'patient_name', 'doctor_name', 'total_price', 'Dispense_Date']
    
    def get_total_price(self, obj):
        return obj.Qty * obj.Price
    
    def validate_Qty(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        if value > 1000:
            raise serializers.ValidationError("Quantity cannot exceed 1000 units per dispense")
        return value
    
    def validate_Price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        if value > 10000:
            raise serializers.ValidationError("Price cannot exceed 10,000")
        return value
    
    def validate(self, data):
        # Check stock availability
        stock = StockDetails.objects.filter(
            MED_ID=data['MED_ID'],
            Stock_Availability__gte=data['Qty'],
            Expiry_Date__gt=date.today()
        ).first()
        
        if not stock:
            raise serializers.ValidationError(
                {"MED_ID": f"Insufficient stock or expired medicine for {data['MED_ID'].Medicine_Name}"}
            )
        
        # Auto-set price from medicine's price per unit if not provided
        if not data.get('Price'):
            data['Price'] = data['MED_ID'].Price_per_Unit
        
        return data