from django.contrib import admin
from .models import MedicineDetail, SupplierDetail, StockDetails, StockOrderingDetail, DispensingMedicine, MedicineBatch, StockAlert

@admin.register(MedicineDetail)
class MedicineDetailsAdmin(admin.ModelAdmin):
    list_display = ['MED_ID', 'Medicine_Name', 'Dosage', 'Price_per_Unit']
    search_fields = ['Medicine_Name']

@admin.register(SupplierDetail)
class SupplierDetailsAdmin(admin.ModelAdmin):
    list_display = ['SUPPLIER_ID', 'Supplier_Name', 'Phone_Number']
    search_fields = ['Supplier_Name']

@admin.register(MedicineBatch)
class MedicineBatchAdmin(admin.ModelAdmin):
    list_display = ['BATCH_ID', 'medicine_name', 'Batch_Number', 'Expiry_Date', 'Quantity_Available', 'Purchase_Date', 'supplier_name']
    list_filter = ['Expiry_Date', 'Purchase_Date']
    search_fields = ['BATCH_ID', 'MED_ID__Medicine_Name', 'Batch_Number']
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'
    
    def supplier_name(self, obj):
        return obj.SUPPLIER_ID.Supplier_Name
    supplier_name.short_description = 'Supplier'

@admin.register(StockDetails)
class StockDetailsAdmin(admin.ModelAdmin):
    list_display = ['STOCK_ID', 'medicine_name', 'earliest_expiry', 'total_stock', 'min_stock_level']
    list_filter = ['Earliest_Expiry']
    search_fields = ['STOCK_ID', 'MED_ID__Medicine_Name']
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'
    
    def earliest_expiry(self, obj):
        return obj.Earliest_Expiry
    earliest_expiry.short_description = 'Earliest Expiry'
    
    def total_stock(self, obj):
        return obj.Total_Stock_Availability
    total_stock.short_description = 'Total Stock'
    
    def min_stock_level(self, obj):
        return obj.Minimum_Stock_Level
    min_stock_level.short_description = 'Min Stock Level'

@admin.register(StockOrderingDetail)
class StockOrderingDetailsAdmin(admin.ModelAdmin):
    list_display = ['SUPPLY_ID', 'supplier_name', 'medicine_name', 'Qty_Supplied', 'Date_of_Supply', 'Supply_Cost', 'Batch_Number']
    list_filter = ['Date_of_Supply']
    
    def supplier_name(self, obj):
        return obj.SUPPLIER_ID.Supplier_Name
    supplier_name.short_description = 'Supplier'
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'

@admin.register(DispensingMedicine)
class DispensingMedicinesAdmin(admin.ModelAdmin):
    list_display = ['DISPENSE_ID', 'patient_name', 'medicine_name', 'Qty', 'Price', 'Dispense_Date', 'batch_used']
    list_filter = ['Dispense_Date']
    
    def patient_name(self, obj):
        return obj.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name
    patient_name.short_description = 'Patient'
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'
    
    def batch_used(self, obj):
        return obj.Batch_Used.Batch_Number if obj.Batch_Used else 'N/A'
    batch_used.short_description = 'Batch Used'

@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ['ALERT_ID', 'medicine_name', 'Alert_Type', 'Is_Active', 'Created_Date']
    list_filter = ['Alert_Type', 'Is_Active', 'Created_Date']
    search_fields = ['MED_ID__Medicine_Name']
    
    def medicine_name(self, obj):
        return obj.MED_ID.Medicine_Name
    medicine_name.short_description = 'Medicine'