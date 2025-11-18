from django.contrib import admin
from .models import MedicineDetails, SupplierDetails, StockDetails, StockOrderingDetails, DispensingMedicines

@admin.register(MedicineDetails)
class MedicineDetailsAdmin(admin.ModelAdmin):
    list_display = ['MED_ID', 'Medicine_Name', 'Dosage', 'Price_per_Unit']
    search_fields = ['Medicine_Name']

@admin.register(SupplierDetails)
class SupplierDetailsAdmin(admin.ModelAdmin):
    list_display = ['SUPPLIER_ID', 'Supplier_Name', 'Phone_Number']
    search_fields = ['Supplier_Name']

@admin.register(StockDetails)
class StockDetailsAdmin(admin.ModelAdmin):
    list_display = ['STOCK_ID', 'medicine_name', 'Expiry_Date', 'Stock_Availability', 'supplier_name']
    list_filter = ['Expiry_Date']
    search_fields = ['STOCK_ID', 'MED_ID__Medicine_Name']
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'
    
    def supplier_name(self, obj):
        return obj.SUPPLIER_ID.Supplier_Name
    supplier_name.short_description = 'Supplier'

@admin.register(StockOrderingDetails)
class StockOrderingDetailsAdmin(admin.ModelAdmin):
    list_display = ['SUPPLY_ID', 'supplier_name', 'medicine_name', 'Qty_Supplied', 'Date_of_Supply', 'Supply_Cost']
    list_filter = ['Date_of_Supply']
    
    def supplier_name(self, obj):
        return obj.SUPPLIER_ID.Supplier_Name
    supplier_name.short_description = 'Supplier'
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'

@admin.register(DispensingMedicines)
class DispensingMedicinesAdmin(admin.ModelAdmin):
    list_display = ['DISPENSE_ID', 'patient_name', 'medicine_name', 'Qty', 'Price', 'Dispense_Date']
    list_filter = ['Dispense_Date']
    
    def patient_name(self, obj):
        return obj.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name
    patient_name.short_description = 'Patient'
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'

