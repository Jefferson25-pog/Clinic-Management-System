from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import PatientDetails, AppointmentDetails, ReceptionistLog, BillDetails
from .serializers import PatientDetailsSerializer, AppointmentDetailsSerializer, ReceptionistLogSerializer, BillDetailsSerializer
from adminapp.models import StaffDetails  # Import StaffDetails instead of Doctors
from adminapp.serializers import StaffDetailsSerializer

class IsReceptionistUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Receptionists').exists():
            return True
        if hasattr(request.user, 'staff_details'):
            return request.user.staff_details.Role == 'Receptionist'
        return False

class PatientDetailsViewSet(viewsets.ModelViewSet):
    queryset = PatientDetails.objects.all()
    serializer_class = PatientDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser]

    @action(detail=False, methods=['post'])
    def register_patient(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            # Log the action
            ReceptionistLog.objects.create(
                Action="Patient Registration",
                Details=f"Registered patient: {serializer.data['Patient_Name']}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AppointmentDetailsViewSet(viewsets.ModelViewSet):
    queryset = AppointmentDetails.objects.all()
    serializer_class = AppointmentDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser]

    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        from django.utils import timezone
        today = timezone.now().date()
        appointments = AppointmentDetails.objects.filter(Date__date=today)
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def schedule_appointment(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            # Log the action
            ReceptionistLog.objects.create(
                Action="Appointment Scheduled",
                Details=f"Scheduled appointment: Token {serializer.data['TOKEN_NO']}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReceptionistLogViewSet(viewsets.ModelViewSet):
    queryset = ReceptionistLog.objects.all()
    serializer_class = ReceptionistLogSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser]

class DoctorsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StaffDetails.objects.filter(Role='Doctor')  # Get doctors from StaffDetails
    serializer_class = StaffDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser]

class BillDetailsViewSet(viewsets.ModelViewSet):
    queryset = BillDetails.objects.all()
    serializer_class = BillDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser]

    def create(self, request, *args, **kwargs):
        """Create a bill - only CONSULT_ID is needed, costs are auto-calculated"""
        consult_id = request.data.get('CONSULT_ID')
        
        if not consult_id:
            return Response(
                {'error': 'CONSULT_ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from doctorapp.models import ConsultationDetails
            consultation = ConsultationDetails.objects.get(id=consult_id)
            
            # Check if bill already exists
            if BillDetails.objects.filter(CONSULT_ID=consultation).exists():
                return Response(
                    {'error': 'Bill already exists for this consultation'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create bill - costs will be auto-calculated in save()
            bill = BillDetails.objects.create(CONSULT_ID=consultation)
            
            # Log the action
            ReceptionistLog.objects.create(
                Action="Bill Generated",
                Details=f"Generated bill {bill.BILL_ID} for consultation {consult_id} - Total: ${bill.Total_Amount}"
            )
            
            serializer = self.get_serializer(bill)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ConsultationDetails.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Manually recalculate costs (useful if medicines/lab tests were added later)"""
        bill = self.get_object()
        bill.calculate_costs()
        bill.save()
        serializer = self.get_serializer(bill)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def available_consultations(self, request):
        """Get consultations that don't have bills yet"""
        from doctorapp.models import ConsultationDetails
        billed_consultations = BillDetails.objects.values_list('CONSULT_ID', flat=True)
        available_consultations = ConsultationDetails.objects.exclude(
            id__in=billed_consultations
        ).select_related('TOKEN_NO__PAT_ID', 'DOC_ID')
        
        options = []
        for consult in available_consultations:
            options.append({
                'CONSULT_ID': consult.id,
                'patient_name': consult.TOKEN_NO.PAT_ID.Patient_Name,
                'doctor_name': consult.DOC_ID.Name,
                'consultation_date': consult.Created_Date
            })
        
        return Response(options)