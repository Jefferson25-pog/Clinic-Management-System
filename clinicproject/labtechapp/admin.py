# In labtechapp/admin.py - Cleaned up
from django.contrib import admin
from .models import LabTests, LabTestRequestDetails, LabTestResults

@admin.register(LabTests)
class LabTestsAdmin(admin.ModelAdmin):
    list_display = ['LAB_TEST_ID', 'Lab_Test_Name', 'Lab_Test_Cost']
    search_fields = ['Lab_Test_Name']
    list_filter = ['Lab_Test_Cost']

@admin.register(LabTestRequestDetails)
class LabTestRequestDetailsAdmin(admin.ModelAdmin):
    list_display = [
        'LAB_REQUEST_ID', 'patient_name', 'test_name', 'test_cost', 
        'Requested_Date', 'Status'
    ]
    list_filter = ['Status', 'Requested_Date']
    search_fields = ['LAB_REQUEST_ID', 'CONSULT_ID__TOKEN_NO__PAT_ID__Patient_Name']
    readonly_fields = ['Requested_Date']
    
    def patient_name(self, obj):
        try:
            return obj.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name
        except AttributeError:
            return "N/A"
    patient_name.short_description = 'Patient'
    
    def test_name(self, obj):
        try:
            return obj.LAB_TEST_ID.Lab_Test_Name
        except AttributeError:
            return "N/A"
    test_name.short_description = 'Test'
    
    def test_cost(self, obj):
        try:
            return obj.LAB_TEST_ID.Lab_Test_Cost
        except AttributeError:
            return "N/A"
    test_cost.short_description = 'Cost'

@admin.register(LabTestResults)
class LabTestResultsAdmin(admin.ModelAdmin):
    list_display = ['RESULT_ID', 'patient_name', 'test_name', 'Result_Date']
    search_fields = ['RESULT_ID', 'LAB_REQUEST__LAB_REQUEST_ID']  # Fixed field reference
    readonly_fields = ['Result_Date']
    
    def patient_name(self, obj):
        try:
            return obj.LAB_REQUEST.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name  # Fixed field reference
        except AttributeError:
            return "N/A"
    patient_name.short_description = 'Patient'
    
    def test_name(self, obj):
        try:
            return obj.LAB_REQUEST.LAB_TEST_ID.Lab_Test_Name  # Fixed field reference
        except AttributeError:
            return "N/A"
    test_name.short_description = 'Test'