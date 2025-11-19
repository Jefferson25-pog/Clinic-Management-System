from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import ConsultationDetails, Prescription, LabTestRequestDetails
from .serializers import ConsultationDetailsSerializer, PrescriptionSerializer, LabTestsSerializer, LabTestRequestDetailsSerializer
from receptionistapp.models import AppointmentDetails
from receptionistapp.serializers import AppointmentDetailsSerializer
from rest_framework import serializers
from labtechapp.models import LabTests
from django.utils import timezone
from datetime import date, datetime, timedelta
from django.db.models import Q

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'staff_details'):
            return request.user.staff_details.Role == 'Doctor'
        return False

class AppointmentDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AppointmentDetails.objects.all()
    serializer_class = AppointmentDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    @action(detail=False, methods=['get'])
    def my_appointments(self, request):
        """Get all appointments for the current doctor"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            appointments = AppointmentDetails.objects.filter(DOC_ID=doctor_id)
            serializer = self.get_serializer(appointments, many=True)
            return Response(serializer.data)
        return Response([])

    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        """Get today's appointments for the current doctor"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            today = timezone.now().date()
            
            today_appointments = AppointmentDetails.objects.filter(
                DOC_ID=doctor_id,
                Date=today,
                Status__in=['Scheduled', 'Completed']  # Include both scheduled and completed appointments for today
            ).order_by('Date')
            
            serializer = self.get_serializer(today_appointments, many=True)
            return Response({
                'date': today,
                'count': today_appointments.count(),
                'appointments': serializer.data
            })
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def upcoming_appointments(self, request):
        """Get upcoming appointments (today and future) for the current doctor"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            today = timezone.now().date()
            
            upcoming_appointments = AppointmentDetails.objects.filter(
                DOC_ID=doctor_id,
                Date__gte=today,
                Status='Scheduled'
            ).order_by('Date')
            
            serializer = self.get_serializer(upcoming_appointments, many=True)
            return Response(serializer.data)
        return Response([])

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update appointment status (Scheduled → Completed/Cancelled)"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            try:
                appointment = self.get_object()
                new_status = request.data.get('status')
                
                # Validate status
                valid_statuses = ['Scheduled', 'Completed', 'Cancelled']
                if new_status not in valid_statuses:
                    return Response(
                        {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Update status
                appointment.Status = new_status
                appointment.save()
                
                serializer = self.get_serializer(appointment)
                return Response({
                    'message': f'Appointment status updated to {new_status}',
                    'appointment': serializer.data
                })
                
            except AppointmentDetails.DoesNotExist:
                return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark appointment as completed (convenience method)"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            try:
                appointment = self.get_object()
                
                # Update status to completed
                appointment.Status = 'Completed'
                appointment.save()
                
                serializer = self.get_serializer(appointment)
                return Response({
                    'message': 'Appointment marked as completed',
                    'appointment': serializer.data
                })
                
            except AppointmentDetails.DoesNotExist:
                return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

class ConsultationDetailsViewSet(viewsets.ModelViewSet):
    queryset = ConsultationDetails.objects.all()
    serializer_class = ConsultationDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def get_queryset(self):
        """Doctors can only see their own consultations"""
        if hasattr(self.request.user, 'staff_details'):
            doctor_id = self.request.user.staff_details.STAFF_ID
            return ConsultationDetails.objects.filter(DOC_ID=doctor_id)
        return ConsultationDetails.objects.none()

    def perform_create(self, serializer):
        """Auto-update appointment status when consultation is created"""
        consultation = serializer.save()
        
        # Update the associated appointment status to 'Completed'
        appointment = consultation.TOKEN_NO
        appointment.Status = 'Completed'
        appointment.save()

    @action(detail=True, methods=['post'])
    def create_consultation(self, request, pk=None):
        """Create consultation from appointment and auto-update status"""
        try:
            appointment = AppointmentDetails.objects.get(TOKEN_NO=pk)
            consultation_data = request.data.copy()
            consultation_data['TOKEN_NO'] = pk
            
            if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
                consultation_data['DOC_ID'] = request.user.staff_details.STAFF_ID
            
            serializer = self.get_serializer(data=consultation_data)
            if serializer.is_valid():
                consultation = serializer.save()
                
                # Update appointment status to 'Completed'
                appointment.Status = 'Completed'
                appointment.save()
                
                return Response({
                    'message': 'Consultation created and appointment marked as completed',
                    'consultation': serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except AppointmentDetails.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def consultation_history(self, request):
        """Get consultation history for the current doctor with filtering options"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            
            # Get filter parameters
            patient_name = request.query_params.get('patient_name', None)
            date_from = request.query_params.get('date_from', None)
            date_to = request.query_params.get('date_to', None)
            days = request.query_params.get('days', None)
            
            # Start with all consultations for this doctor
            consultations = ConsultationDetails.objects.filter(DOC_ID=doctor_id)
            
            # Apply filters
            if patient_name:
                consultations = consultations.filter(
                    TOKEN_NO__PAT_ID__Patient_Name__icontains=patient_name
                )
            
            if date_from:
                try:
                    date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                    consultations = consultations.filter(Consultation_Time__date__gte=date_from_obj)
                except ValueError:
                    return Response({'error': 'Invalid date_from format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
            
            if date_to:
                try:
                    date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                    consultations = consultations.filter(Consultation_Time__date__lte=date_to_obj)
                except ValueError:
                    return Response({'error': 'Invalid date_to format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
            
            if days:
                try:
                    days_int = int(days)
                    start_date = timezone.now().date() - timedelta(days=days_int)
                    consultations = consultations.filter(Consultation_Time__date__gte=start_date)
                except ValueError:
                    return Response({'error': 'Invalid days format. Use integer'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Order by most recent first
            consultations = consultations.order_by('-Consultation_Time')
            
            serializer = self.get_serializer(consultations, many=True)
            
            return Response({
                'total_consultations': consultations.count(),
                'filters_applied': {
                    'patient_name': patient_name,
                    'date_from': date_from,
                    'date_to': date_to,
                    'days': days
                },
                'consultations': serializer.data
            })
        return Response([])

    @action(detail=False, methods=['get'])
    def recent_consultations(self, request):
        """Get recent consultations (last 30 days) for the current doctor"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            recent_consultations = ConsultationDetails.objects.filter(
                DOC_ID=doctor_id,
                Consultation_Time__gte=thirty_days_ago
            ).order_by('-Consultation_Time')
            
            serializer = self.get_serializer(recent_consultations, many=True)
            return Response({
                'period': 'last_30_days',
                'count': recent_consultations.count(),
                'consultations': serializer.data
            })
        return Response([])

    @action(detail=False, methods=['get'])
    def today_consultations(self, request):
        """Get today's consultations for the current doctor"""
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            today = timezone.now().date()
            
            today_consultations = ConsultationDetails.objects.filter(
                DOC_ID=doctor_id,
                Consultation_Time__date=today
            ).order_by('-Consultation_Time')
            
            serializer = self.get_serializer(today_consultations, many=True)
            return Response({
                'date': today,
                'count': today_consultations.count(),
                'consultations': serializer.data
            })
        return Response([])

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def get_queryset(self):
        """Doctors can only see prescriptions from their consultations"""
        if hasattr(self.request.user, 'staff_details'):
            doctor_id = self.request.user.staff_details.STAFF_ID
            return Prescription.objects.filter(CONSULT_ID__DOC_ID=doctor_id)
        return Prescription.objects.none()

    @action(detail=False, methods=['get'])
    def patient_prescriptions(self, request):
        """Get all prescriptions for a specific patient"""
        patient_id = request.query_params.get('patient_id', None)
        
        if hasattr(request.user, 'staff_details') and request.user.staff_details.Role == 'Doctor':
            doctor_id = request.user.staff_details.STAFF_ID
            
            if patient_id:
                prescriptions = Prescription.objects.filter(
                    CONSULT_ID__DOC_ID=doctor_id,
                    CONSULT_ID__TOKEN_NO__PAT_ID=patient_id
                ).order_by('-CONSULT_ID__Consultation_Time')
                
                serializer = self.get_serializer(prescriptions, many=True)
                return Response(serializer.data)
            else:
                return Response({'error': 'patient_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        return Response([])

class LabTestsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabTests.objects.all()
    serializer_class = LabTestsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]

class LabTestRequestViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequestDetails.objects.all()
    serializer_class = LabTestRequestDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    def get_queryset(self):
        """Doctors can only see their own lab test requests"""
        if hasattr(self.request.user, 'staff_details'):
            doctor_id = self.request.user.staff_details.STAFF_ID
            return LabTestRequestDetails.objects.filter(CONSULT_ID__DOC_ID=doctor_id)
        return LabTestRequestDetails.objects.none()
    
    def perform_create(self, serializer):
        """Auto-validate that doctor owns the consultation"""
        consultation = serializer.validated_data['CONSULT_ID']
        if consultation.DOC_ID.STAFF_ID != self.request.user.staff_details.STAFF_ID:
            raise serializers.ValidationError("You can only request tests for your own consultations")
        serializer.save()
    
    @action(detail=False, methods=['post'])
    def request_lab_test(self, request):
        """Simple endpoint to request a lab test"""
        consult_id = request.data.get('CONSULT_ID')
        lab_test_id = request.data.get('LAB_TEST_ID')
        notes = request.data.get('Notes', '')
        
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
                Notes=notes
            )
            
            serializer = self.get_serializer(lab_request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ConsultationDetails.DoesNotExist:
            return Response({'error': 'Consultation not found'}, status=status.HTTP_404_NOT_FOUND)
        except LabTests.DoesNotExist:
            return Response({'error': 'Lab test not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get all lab test requests for current doctor"""
        if hasattr(request.user, 'staff_details'):
            doctor_id = request.user.staff_details.STAFF_ID
            requests = LabTestRequestDetails.objects.filter(CONSULT_ID__DOC_ID=doctor_id)
            serializer = self.get_serializer(requests, many=True)
            return Response(serializer.data)
        return Response([])