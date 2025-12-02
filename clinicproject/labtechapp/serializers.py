from rest_framework import serializers
from .models import LabTest, LabTestResult
from doctorapp.models import LabTestRequestDetail
import re

class LabTestsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = ['LAB_TEST_ID', 'Lab_Test_Name', 'Lab_Test_Cost', 'Description']
    
    def validate_Lab_Test_Name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Lab test name must be at least 3 characters long")
        if not re.match(r'^[A-Za-z0-9\s\-\(\)]+$', value):
            raise serializers.ValidationError("Lab test name can only contain letters, numbers, spaces, hyphens and parentheses")
        return value.strip()
    
    def validate_Lab_Test_Cost(self, value):
        if value <= 0:
            raise serializers.ValidationError("Lab test cost must be greater than 0")
        if value > 100000:  # Maximum cost limit
            raise serializers.ValidationError("Lab test cost cannot exceed 100,000")
        return value
    
    def validate_Description(self, value):
        if value and not re.match(r'^[A-Za-z0-9\s\.,!?\-\(\):;]+$', value):
            raise serializers.ValidationError("Description can only contain letters, numbers, spaces and basic punctuation")
        return value

class SimpleLabRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    doctor_name = serializers.CharField(source='CONSULT_ID.DOC_ID.Name', read_only=True)
    test_name = serializers.CharField(source='LAB_TEST_ID.Lab_Test_Name', read_only=True)
    
    class Meta:
        model = LabTestRequestDetail
        fields = ['LAB_REQUEST_ID', 'CONSULT_ID', 'LAB_TEST_ID', 'Requested_Date', 'Status', 'Notes', 'patient_name', 'doctor_name', 'test_name']

class LabTestResultsSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='LAB_REQUEST.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name', read_only=True)
    test_name = serializers.CharField(source='LAB_REQUEST.LAB_TEST_ID.Lab_Test_Name', read_only=True)
    
    class Meta:
        model = LabTestResult
        fields = [
            'RESULT_ID', 'LAB_REQUEST', 'Findings', 'Normal_Range',
            'Remarks', 'Result_Date', 'patient_name', 'test_name'
        ]
        read_only_fields = ['Result_Date', 'patient_name', 'test_name']
    
    def validate_Findings(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Findings must be at least 5 characters long")
        if not re.match(r'^[A-Za-z0-9\s\.,!?\-\(\):;/]+$', value):
            raise serializers.ValidationError("Findings can only contain letters, numbers, spaces and basic punctuation")
        return value.strip()
    
    def validate_Normal_Range(self, value):
        if value and not re.match(r'^[\d\s\-\–\.a-zA-Z/]+$', value):
            raise serializers.ValidationError("Normal range should be in format like '120-140 mg/dL'")
        return value
    
    def validate_Remarks(self, value):
        if value and not re.match(r'^[A-Za-z0-9\s\.,!?\-\(\):;]+$', value):
            raise serializers.ValidationError("Remarks can only contain letters, numbers, spaces and basic punctuation")
        return value