from django.contrib import admin
from .models import LabTest, LabTestResult

@admin.register(LabTest)
class LabTestsAdmin(admin.ModelAdmin):
    list_display = ['LAB_TEST_ID', 'Lab_Test_Name', 'Lab_Test_Cost']
    search_fields = ['Lab_Test_Name']
    list_filter = ['Lab_Test_Cost']

@admin.register(LabTestResult)
class LabTestResultsAdmin(admin.ModelAdmin):
    list_display = ['RESULT_ID', 'patient_name', 'test_name', 'Result_Date']
    search_fields = ['RESULT_ID', 'LAB_REQUEST__LAB_REQUEST_ID']
    readonly_fields = ['Result_Date']
    
    def patient_name(self, obj):
        try:
            return obj.LAB_REQUEST.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name
        except AttributeError:
            return "N/A"
    patient_name.short_description = 'Patient'
    
    def test_name(self, obj):
        try:
            return obj.LAB_REQUEST.LAB_TEST_ID.Lab_Test_Name
        except AttributeError:
            return "N/A"
    test_name.short_description = 'Test'