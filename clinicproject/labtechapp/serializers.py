# In labtechapp/serializers.py - Cleaned up
from rest_framework import serializers
from .models import LabTests, LabTestRequestDetails, LabTestResults

class LabTestsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTests
        fields = ['LAB_TEST_ID', 'Lab_Test_Name', 'Lab_Test_Cost', 'Description']

class LabTestRequestDetailsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    test_name = serializers.CharField(source='LAB_TEST_ID.Lab_Test_Name', read_only=True)
    test_cost = serializers.DecimalField(source='LAB_TEST_ID.Lab_Test_Cost', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = LabTestRequestDetails
        fields = [
            'LAB_REQUEST_ID', 'CONSULT_ID', 'LAB_TEST_ID', 'Requested_Date', 
            'Status', 'Notes', 'patient_name', 'doctor_name', 'test_name', 'test_cost'
        ]
        read_only_fields = ['Requested_Date', 'patient_name', 'doctor_name', 'test_name', 'test_cost']

class LabTestResultsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='LAB_REQUEST.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)  # Fixed field reference
    test_name = serializers.CharField(source='LAB_REQUEST.LAB_TEST_ID.Lab_Test_Name', read_only=True)  # Fixed field reference
    
    class Meta:
        model = LabTestResults
        fields = [
            'RESULT_ID', 'LAB_REQUEST', 'Findings', 'Normal_Range',  # Fixed field name
            'Remarks', 'Result_Date', 'patient_name', 'test_name'
        ]
        read_only_fields = ['Result_Date', 'patient_name', 'test_name']