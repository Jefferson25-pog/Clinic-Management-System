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

    @action(detail=True, methods=['post'])
    def calculate_bill(self, request, pk=None):
        """Auto-calculate all costs from related modules"""
        bill = self.get_object()
        bill.calculate_costs()
        serializer = self.get_serializer(bill)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_payment_status(self, request, pk=None):
        """Update payment status and mode"""
        bill = self.get_object()
        new_status = request.data.get('status')
        payment_mode = request.data.get('payment_mode')
        
        valid_statuses = ['Pending', 'Paid', 'Partial', 'Insurance Pending', 'Rejected']
        valid_modes = ['Cash', 'Card', 'Online', 'Insurance', 'Mixed', None]
        
        if new_status in valid_statuses:
            bill.Pay_Status = new_status
            if payment_mode in valid_modes:
                bill.Payment_Mode = payment_mode
            bill.save()
            return Response({'status': 'payment status updated'})
        return Response({'error': 'invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def pending_bills(self, request):
        """Get all pending bills"""
        pending_bills = BillDetails.objects.filter(Pay_Status='Pending')
        serializer = self.get_serializer(pending_bills, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def generate_bill(self, request):
        """Generate a new bill for a consultation (auto-calculate costs)"""
        consult_id = request.data.get('CONSULT_ID')
        
        try:
            from doctorapp.models import ConsultationDetails
            consultation = ConsultationDetails.objects.get(CONSULT_ID=consult_id)
            
            # Check if bill already exists
            existing_bill = BillDetails.objects.filter(CONSULT_ID=consultation).first()
            if existing_bill:
                return Response(
                    {'error': 'Bill already exists for this consultation'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create new bill with auto-calculated costs
            bill = BillDetails.objects.create(CONSULT_ID=consultation)
            bill.calculate_costs()  # Auto-calculate all costs
            
            # Log the action
            ReceptionistLog.objects.create(
                Action="Bill Generated",
                Details=f"Generated bill {bill.BILL_ID} for consultation {consult_id}"
            )
            
            serializer = self.get_serializer(bill)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ConsultationDetails.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )