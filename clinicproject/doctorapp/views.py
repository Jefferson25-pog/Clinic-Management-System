from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import ConsultationDetails, Prescription
from .serializers import ConsultationDetailsSerializer, PrescriptionSerializer  # Import from current app
from receptionistapp.models import PatientDetails, AppointmentDetails
from receptionistapp.serializers import PatientDetailsSerializer, AppointmentDetailsSerializer
from labtechapp.models import LabTests, LabTestRequestDetails
from labtechapp.serializers import LabTestsSerializer, LabTestRequestDetailsSerializer

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Superusers can access everything
        if request.user.is_superuser:
            return True
            
        # Regular users need Doctor role
        if hasattr(request.user, 'staff_details'):
            return request.user.staff_details.Role == 'Doctor'
            
        return False

class PatientDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PatientDetails.objects.all()
    serializer_class = PatientDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

class AppointmentDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AppointmentDetails.objects.all()
    serializer_class = AppointmentDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    @action(detail=False, methods=['get'])
    def my_appointments(self, request):
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            appointments = AppointmentDetails.objects.filter(DOC_ID=doctor_id)
            serializer = self.get_serializer(appointments, many=True)
            return Response(serializer.data)
        return Response([])

class ConsultationDetailsViewSet(viewsets.ModelViewSet):
    queryset = ConsultationDetails.objects.all()
    serializer_class = ConsultationDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    @action(detail=True, methods=['post'])
    def create_consultation(self, request, pk=None):
        appointment = AppointmentDetails.objects.get(TOKEN_NO=pk)
        consultation_data = request.data.copy()
        consultation_data['TOKEN_NO'] = pk
        
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            consultation_data['DOC_ID'] = request.user.staff_details.STAFF_ID
        
        serializer = self.get_serializer(data=consultation_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

class LabTestsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabTests.objects.all()
    serializer_class = LabTestsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

class LabTestRequestViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequestDetails.objects.all()
    serializer_class = LabTestRequestDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get_queryset(self):
        if hasattr(self.request.user, 'staff_details'):
            doctor_id = self.request.user.staff_details.STAFF_ID
            return LabTestRequestDetails.objects.filter(CONSULT_ID__DOC_ID=doctor_id)
        return LabTestRequestDetails.objects.none()
    
    @action(detail=False, methods=['post'])
    def request_lab_test(self, request):
        consult_id = request.data.get('CONSULT_ID')
        lab_test_id = request.data.get('LAB_TEST_ID')
        notes = request.data.get('Notes_Description', '')
        
        try:
            consultation = ConsultationDetails.objects.get(CONSULT_ID=consult_id)
            
            if consultation.DOC_ID.STAFF_ID != request.user.staff_details.STAFF_ID:
                return Response(
                    {'error': 'You can only request tests for your own consultations'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            lab_test = LabTests.objects.get(LAB_TEST_ID=lab_test_id)
            
            lab_request = LabTestRequestDetails.objects.create(
                CONSULT_ID=consultation,
                LAB_TEST_ID=lab_test,
                Notes_Description=notes
            )
            
            serializer = self.get_serializer(lab_request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ConsultationDetails.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except LabTests.DoesNotExist:
            return Response(
                {'error': 'Lab test not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )