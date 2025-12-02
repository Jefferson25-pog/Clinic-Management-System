from django.contrib import admin
from .models import PatientDetail, AppointmentDetail, ReceptionistLog, BillDetail

@admin.register(PatientDetail)
class PatientDetailsAdmin(admin.ModelAdmin):
    list_display = ['PAT_ID', 'Patient_Name', 'DOB', 'Phone_Number', 'Email']
    search_fields = ['Patient_Name', 'PAT_ID', 'Phone_Number']
    list_filter = ['DOB']

@admin.register(AppointmentDetail)
class AppointmentDetailsAdmin(admin.ModelAdmin):
    list_display = ['TOKEN_NO', 'patient_name', 'doctor_name', 'Date', 'Status']
    list_filter = ['Status', 'Date']
    search_fields = ['TOKEN_NO', 'PAT_ID__Patient_Name']
    
    def patient_name(self, obj):
        return obj.PAT_ID.Patient_Name if obj.PAT_ID else "No Patient"
    patient_name.short_description = 'Patient'
    
    def doctor_name(self, obj):
        # FIXED: DOC_ID is directly a StaffDetails object, not a Doctor with STAFF_ID
        if obj.DOC_ID and hasattr(obj.DOC_ID, 'Name'):
            return obj.DOC_ID.Name
        return "No Doctor"
    doctor_name.short_description = 'Doctor'

@admin.register(ReceptionistLog)
class ReceptionistLogAdmin(admin.ModelAdmin):
    list_display = ['LOG_ID', 'Action', 'Timestamp']
    list_filter = ['Timestamp']
    search_fields = ['Action', 'Details']

@admin.register(BillDetail)
class BillDetailsAdmin(admin.ModelAdmin):
    list_display = [
        'BILL_ID', 'patient_name', 'consultation_cost', 'medicine_cost', 
        'labtest_cost', 'Total_Amount', 'Pay_Status', 'Payment_Mode', 'Created_Date'
    ]
    list_filter = ['Pay_Status', 'Created_Date', 'Payment_Mode']
    search_fields = ['BILL_ID', 'CONSULT_ID__TOKEN_NO__PAT_ID__Patient_Name']
    readonly_fields = [
        'Total_Amount', 'Created_Date', 'consultation_cost', 
        'medicine_cost', 'labtest_cost'
    ]
    
    def patient_name(self, obj):
        return obj.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name
    patient_name.short_description = 'Patient'
    
    def consultation_cost(self, obj):
        return obj.Consultation_Cost
    consultation_cost.short_description = 'Consultation Cost'
    
    def medicine_cost(self, obj):
        return obj.Medicine_Cost
    medicine_cost.short_description = 'Medicine Cost'
    
    def labtest_cost(self, obj):
        return obj.LabTest_Cost
    labtest_cost.short_description = 'Lab Test Cost'