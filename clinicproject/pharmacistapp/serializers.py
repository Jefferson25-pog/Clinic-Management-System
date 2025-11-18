from rest_framework import serializers
from .models import MedicineDetails, SupplierDetails, StockDetails, StockOrderingDetails, DispensingMedicines
from datetime import date
import re

class MedicineDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineDetails
        fields = '__all__'
    
    def validate_Price_per_Unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value
    
    def validate_Medicine_Name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Medicine name must be at least 2 characters long")
        return value.strip()

class SupplierDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierDetails
        fields = '__all__'
    
    def validate_Phone_Number(self, value):
        if not re.match(r'^\+?1?\d{9,15}$', value):
            raise serializers.ValidationError("Enter a valid phone number")
        return value

class StockDetailsSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    supplier_name = serializers.CharField(source='SUPPLIER_ID.Supplier_Name', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = StockDetails
        fields = '__all__'
        read_only_fields = ['medicine_name', 'supplier_name', 'days_until_expiry']
    
    def get_days_until_expiry(self, obj):
        if obj.Expiry_Date:
            return (obj.Expiry_Date - date.today()).days
        return None
    
    def validate_Expiry_Date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Expiry date cannot be in the past")
        return value
    
    def validate_Stock_Availability(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock availability cannot be negative")
        return value

class StockOrderingDetailsSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    supplier_name = serializers.CharField(source='SUPPLIER_ID.Supplier_Name', read_only=True)
    total_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = StockOrderingDetails
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
        return value

class DispensingMedicinesSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='MED_ID.Medicine_Name', read_only=True)
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = DispensingMedicines
        fields = '__all__'
        read_only_fields = ['medicine_name', 'patient_name', 'doctor_name', 'total_price', 'Dispense_Date']
    
    def get_total_price(self, obj):
        return obj.Qty * obj.Price
    
    def validate_Qty(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
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
        
        # Auto-set price from medicine's price per unit
        if not data.get('Price'):
            data['Price'] = data['MED_ID'].Price_per_Unit
        
        return data