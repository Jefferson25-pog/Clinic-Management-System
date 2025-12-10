# doctorapp/views.py - COMPLETE FIXED VERSION
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import ConsultationDetail, Prescription, LabTestRequestDetail
from .serializers import ConsultationDetailsSerializer, PrescriptionSerializer, LabTestsSerializer, LabTestRequestDetailsSerializer
from receptionistapp.models import AppointmentDetail, PatientDetail
from receptionistapp.serializers import AppointmentDetailsSerializer, PatientDetailsSerializer
from pharmacistapp.models import StockDetails, MedicineDetail
from pharmacistapp.serializers import MedicineDetailsSerializer
from labtechapp.models import LabTest, LabTestResult
from labtechapp.serializers import LabTestResultsSerializer
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta, date
from authentication.models import SystemLog

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'staff_detail'):
            return request.user.staff_detail.Role == 'Doctor'
        return False

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'staff_detail'):
            return request.user.staff_detail.Role == 'Admin'
        return False

# ============= APPOINTMENTS =============
class AppointmentDetailsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AppointmentDetail.objects.all()
    serializer_class = AppointmentDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]

    @action(detail=False, methods=['get'])
    def my_appointments(self, request):
        """Get all appointments for the current doctor"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            appointments = AppointmentDetail.objects.filter(DOC_ID=doctor_id)
            serializer = self.get_serializer(appointments, many=True)
            return Response(serializer.data)
        return Response([])

    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        """Get today's appointments for the current doctor"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            today = timezone.now().date()
            
            today_appointments = AppointmentDetail.objects.filter(
                DOC_ID=doctor_id,
                Date=today,
                Status__in=['Scheduled', 'Completed']
            ).order_by('Date', 'Time')
            
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
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            today = timezone.now().date()
            
            upcoming_appointments = AppointmentDetail.objects.filter(
                DOC_ID=doctor_id,
                Date__gte=today,
                Status='Scheduled'
            ).order_by('Date', 'Time')
            
            serializer = self.get_serializer(upcoming_appointments, many=True)
            return Response(serializer.data)
        return Response([])

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update appointment status (Scheduled → Completed/Cancelled)"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            try:
                appointment = self.get_object()
                new_status = request.data.get('status')
                
                valid_statuses = ['Scheduled', 'Completed', 'Cancelled']
                if new_status not in valid_statuses:
                    return Response(
                        {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                appointment.Status = new_status
                appointment.save()
                
                serializer = self.get_serializer(appointment)
                return Response({
                    'message': f'Appointment status updated to {new_status}',
                    'appointment': serializer.data
                })
                
            except AppointmentDetail.DoesNotExist:
                return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark appointment as completed (convenience method)"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            try:
                appointment = self.get_object()
                
                appointment.Status = 'Completed'
                appointment.save()
                
                serializer = self.get_serializer(appointment)
                return Response({
                    'message': 'Appointment marked as completed',
                    'appointment': serializer.data
                })
                
            except AppointmentDetail.DoesNotExist:
                return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

# ============= CONSULTATIONS =============
class ConsultationDetailsViewSet(viewsets.ModelViewSet):
    queryset = ConsultationDetail.objects.all()
    serializer_class = ConsultationDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]

    def get_queryset(self):
        """Doctors can only see their own consultations"""
        if hasattr(self.request.user, 'staff_detail'):
            doctor_id = self.request.user.staff_detail.STAFF_ID
            return ConsultationDetail.objects.filter(DOC_ID=doctor_id)
        return ConsultationDetail.objects.none()

    def perform_create(self, serializer):
        """Auto-update appointment status when consultation is created"""
        consultation = serializer.save()
        appointment = consultation.TOKEN_NO
        appointment.Status = 'Completed'
        appointment.save()

    @action(detail=True, methods=['post'])
    def create_consultation(self, request, pk=None):
        """Create consultation from appointment and auto-update status"""
        try:
            appointment = AppointmentDetail.objects.get(TOKEN_NO=pk)
            consultation_data = request.data.copy()
            consultation_data['TOKEN_NO'] = pk
            
            if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
                consultation_data['DOC_ID'] = request.user.staff_detail.STAFF_ID
            
            serializer = self.get_serializer(data=consultation_data)
            if serializer.is_valid():
                consultation = serializer.save()
                
                appointment.Status = 'Completed'
                appointment.save()
                
                return Response({
                    'message': 'Consultation created and appointment marked as completed',
                    'consultation': serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except AppointmentDetail.DoesNotExist:
            return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def consultation_history(self, request):
        """Get consultation history for the current doctor with filtering options"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            
            patient_name = request.query_params.get('patient_name', None)
            date_from = request.query_params.get('date_from', None)
            date_to = request.query_params.get('date_to', None)
            days = request.query_params.get('days', None)
            
            consultations = ConsultationDetail.objects.filter(DOC_ID=doctor_id)
            
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
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            recent_consultations = ConsultationDetail.objects.filter(
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
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            today = timezone.now().date()
            
            today_consultations = ConsultationDetail.objects.filter(
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

# ============= PRESCRIPTIONS =============
class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]

    def get_queryset(self):
        """Doctors can only see prescriptions from their consultations"""
        if hasattr(self.request.user, 'staff_detail'):
            doctor_id = self.request.user.staff_detail.STAFF_ID
            return Prescription.objects.filter(CONSULT_ID__DOC_ID=doctor_id)
        return Prescription.objects.none()

    @action(detail=False, methods=['get'])
    def patient_prescriptions(self, request):
        """Get all prescriptions for a specific patient"""
        patient_id = request.query_params.get('patient_id', None)
        
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            
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

# ============= LAB TESTS =============
class LabTestsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]

# ============= LAB TEST REQUESTS =============
class LabTestRequestViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequestDetail.objects.all()
    serializer_class = LabTestRequestDetailsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]
    
    def get_queryset(self):
        """Doctors can only see their own lab test requests"""
        if hasattr(self.request.user, 'staff_detail'):
            doctor_id = self.request.user.staff_detail.STAFF_ID
            return LabTestRequestDetail.objects.filter(CONSULT_ID__DOC_ID=doctor_id)
        return LabTestRequestDetail.objects.none()
    
    def perform_create(self, serializer):
        """Auto-validate that doctor owns the consultation and set default priority"""
        consultation = serializer.validated_data['CONSULT_ID']
        
        if consultation.DOC_ID.STAFF_ID != self.request.user.staff_detail.STAFF_ID:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError("You can only request tests for your own consultations")
        
        if 'Priority' not in serializer.validated_data:
            serializer.validated_data['Priority'] = 'routine'
        
        if 'Assigned_Technician' in serializer.validated_data:
            del serializer.validated_data['Assigned_Technician']
        
        serializer.save()
    
    @action(detail=False, methods=['post'])
    def request_lab_test(self, request):
        """Simple endpoint to request a lab test with auto-validation"""
        consult_id = request.data.get('CONSULT_ID')
        lab_test_id = request.data.get('LAB_TEST_ID')
        notes = request.data.get('Notes', '')
        priority = request.data.get('Priority', 'routine')
        
        try:
            consultation = ConsultationDetail.objects.get(CONSULT_ID=consult_id)
            
            if consultation.DOC_ID.STAFF_ID != request.user.staff_detail.STAFF_ID:
                return Response(
                    {'error': 'You can only request tests for your own consultations'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            lab_test = LabTest.objects.get(LAB_TEST_ID=lab_test_id)
            
            lab_request = LabTestRequestDetail.objects.create(
                CONSULT_ID=consultation,
                LAB_TEST_ID=lab_test,
                Notes=notes,
                Priority=priority
            )
            
            serializer = self.get_serializer(lab_request)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ConsultationDetail.DoesNotExist:
            return Response({'error': 'Consultation not found'}, status=status.HTTP_404_NOT_FOUND)
        except LabTest.DoesNotExist:
            return Response({'error': 'Lab test not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def cancel_request(self, request, pk=None):
        """Allow doctors to cancel their own lab requests"""
        lab_request = self.get_object()
        
        if lab_request.CONSULT_ID.DOC_ID.STAFF_ID != request.user.staff_detail.STAFF_ID:
            return Response(
                {'error': 'You can only cancel your own lab requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if lab_request.Status == 'Completed':
            return Response(
                {'error': 'Cannot cancel a completed lab test'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        lab_request.Status = 'Cancelled'
        lab_request.save()
        
        serializer = self.get_serializer(lab_request)
        return Response({
            'message': 'Lab request cancelled successfully',
            'lab_request': serializer.data
        })

# ============= LAB RESULTS =============
class LabResultsViewSet(viewsets.ReadOnlyModelViewSet):
    """Doctor's view for lab results with patient and priority filtering"""
    serializer_class = LabTestResultsSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]
    
    def get_queryset(self):
        """Doctors can only see lab results for their own patients"""
        if hasattr(self.request.user, 'staff_detail'):
            doctor_id = self.request.user.staff_detail.STAFF_ID
            
            return LabTestResult.objects.filter(
                LAB_REQUEST__CONSULT_ID__DOC_ID=doctor_id
            )
        return LabTestResult.objects.none()
    
    @action(detail=False, methods=['get'])
    def patient_results(self, request):
        """Get lab results for a specific patient"""
        patient_id = request.query_params.get('patient_id', None)
        
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            
            if not patient_id:
                return Response(
                    {'error': 'patient_id parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            results = LabTestResult.objects.filter(
                LAB_REQUEST__CONSULT_ID__DOC_ID=doctor_id,
                LAB_REQUEST__CONSULT_ID__TOKEN_NO__PAT_ID=patient_id
            ).order_by('-Result_Date')
            
            serializer = self.get_serializer(results, many=True)
            return Response({
                'patient_id': patient_id,
                'total_results': results.count(),
                'results': serializer.data
            })
        return Response([])
    
    @action(detail=False, methods=['get'])
    def priority_results(self, request):
        """Get lab results filtered by priority/urgency level"""
        priority = request.query_params.get('priority', None)
        
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            
            valid_priorities = ['routine', 'priority', 'stat']
            if priority and priority not in valid_priorities:
                return Response(
                    {'error': f'Invalid priority. Must be one of: {", ".join(valid_priorities)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            results = LabTestResult.objects.filter(
                LAB_REQUEST__CONSULT_ID__DOC_ID=doctor_id
            )
            
            if priority:
                results = results.filter(LAB_REQUEST__Priority=priority)
            
            results = results.order_by(
                '-LAB_REQUEST__Priority',
                '-Result_Date'
            )
            
            serializer = self.get_serializer(results, many=True)
            
            return Response({
                'priority_filter': priority or 'all',
                'total_results': results.count(),
                'results_by_priority': {
                    'stat': results.filter(LAB_REQUEST__Priority='stat').count(),
                    'priority': results.filter(LAB_REQUEST__Priority='priority').count(),
                    'routine': results.filter(LAB_REQUEST__Priority='routine').count()
                },
                'results': serializer.data
            })
        return Response([])
    
    @action(detail=False, methods=['get'])
    def recent_results(self, request):
        """Get recent lab results (last 7 days) with urgency indicators"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            seven_days_ago = timezone.now() - timedelta(days=7)
            
            recent_results = LabTestResult.objects.filter(
                LAB_REQUEST__CONSULT_ID__DOC_ID=doctor_id,
                Result_Date__gte=seven_days_ago
            ).order_by('-LAB_REQUEST__Priority', '-Result_Date')
            
            serializer = self.get_serializer(recent_results, many=True)
            
            urgent_count = recent_results.filter(LAB_REQUEST__Priority='stat').count()
            priority_count = recent_results.filter(LAB_REQUEST__Priority='priority').count()
            
            return Response({
                'period': 'last_7_days',
                'total_results': recent_results.count(),
                'urgency_summary': {
                    'stat_urgent': urgent_count,
                    'priority_high': priority_count,
                    'routine_normal': recent_results.count() - urgent_count - priority_count
                },
                'results': serializer.data
            })
        return Response([])
    
    @action(detail=False, methods=['get'])
    def pending_results(self, request):
        """Get pending lab test requests (not yet completed)"""
        if hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Doctor':
            doctor_id = request.user.staff_detail.STAFF_ID
            
            pending_requests = LabTestRequestDetail.objects.filter(
                CONSULT_ID__DOC_ID=doctor_id,
                Status__in=['Requested', 'In Progress']
            ).order_by('-Priority', 'Requested_Date')
            
            requests_data = []
            for request_obj in pending_requests:
                requests_data.append({
                    'lab_request_id': request_obj.LAB_REQUEST_ID,
                    'patient_name': request_obj.CONSULT_ID.TOKEN_NO.PAT_ID.Patient_Name,
                    'patient_id': request_obj.CONSULT_ID.TOKEN_NO.PAT_ID.PAT_ID,
                    'test_name': request_obj.LAB_TEST_ID.Lab_Test_Name,
                    'priority': request_obj.Priority,
                    'priority_display': request_obj.get_Priority_display(),
                    'status': request_obj.Status,
                    'requested_date': request_obj.Requested_Date,
                    'assigned_technician': request_obj.Assigned_Technician.Name if request_obj.Assigned_Technician else 'Not Assigned',
                    'is_urgent': request_obj.Priority in ['stat', 'priority']
                })
            
            return Response({
                'total_pending': pending_requests.count(),
                'urgent_pending': pending_requests.filter(Priority__in=['stat', 'priority']).count(),
                'pending_requests': requests_data
            })
        return Response([])

# ============= DOCTOR AVAILABILITY =============
class DoctorAvailabilityViewSet(viewsets.ViewSet):
    """ViewSet for doctors to manage their availability"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    @action(detail=False, methods=['get'])
    def my_availability(self, request):
        """Get current doctor's availability status"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            return Response({
                'doctor_id': doctor.STAFF_ID,
                'doctor_name': doctor.Name,
                'current_status': doctor.Status,
                'status_display': doctor.get_Status_display(),
                'department': doctor.Department.Department_Name if doctor.Department else None,
                'consultation_fees': doctor.Consultation_fees,
                'can_change_status': True
            })
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def set_availability(self, request):
        """Set doctor's availability status"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            new_status = request.data.get('status')
            
            valid_statuses = ['Available', 'Busy', 'On Leave']
            if new_status not in valid_statuses:
                return Response({
                    'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            doctor.Status = new_status
            doctor.save()
            
            SystemLog.objects.create(
                level='INFO',
                log_type='USER',
                user=request.user,
                action=f'Doctor availability changed to {new_status}',
                details={
                    'doctor_id': doctor.STAFF_ID,
                    'doctor_name': doctor.Name,
                    'old_status': request.data.get('old_status', 'Unknown'),
                    'new_status': new_status
                }
            )
            
            return Response({
                'success': True,
                'message': f'Availability status updated to {new_status}',
                'doctor_id': doctor.STAFF_ID,
                'doctor_name': doctor.Name,
                'status': doctor.Status,
                'status_display': doctor.get_Status_display()
            })
        
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def set_available(self, request):
        """Convenience method to set status to Available"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            doctor.Status = 'Available'
            doctor.save()
            
            return Response({
                'success': True,
                'message': 'Status set to Available',
                'doctor_id': doctor.STAFF_ID,
                'status': doctor.Status
            })
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def set_busy(self, request):
        """Convenience method to set status to Busy"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            doctor.Status = 'Busy'
            doctor.save()
            
            return Response({
                'success': True,
                'message': 'Status set to Busy',
                'doctor_id': doctor.STAFF_ID,
                'status': doctor.Status
            })
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)

# ============= AVAILABLE MEDICINES =============
class AvailableMedicinesViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]
    serializer_class = MedicineDetailsSerializer

    def get_queryset(self):
        # Only medicines with available stock (>0 and not expired)
        return MedicineDetail.objects.filter(
            stockdetails__Total_Stock_Availability__gt=0,
            stockdetails__Earliest_Expiry__gt=date.today()
        ).distinct()

    @action(detail=False, methods=['get'])
    def with_stock(self, request):
        """Enhanced list: medicine + stock summary"""
        stocks = StockDetails.objects.select_related(
            'MED_ID'
        ).filter(
            Total_Stock_Availability__gt=0,
            Earliest_Expiry__gt=date.today()
        ).order_by('MED_ID__Medicine_Name')

        data = []
        for stock in stocks:
            med = stock.MED_ID
            data.append({
                'MED_ID': med.MED_ID,
                'Medicine_Name': med.Medicine_Name,
                'Dosage': med.Dosage,
                'Price_per_Unit': float(med.Price_per_Unit),
                'stock': {
                    'available': stock.Total_Stock_Availability,
                    'earliest_expiry': stock.Earliest_Expiry,
                    'days_until_expiry': (stock.Earliest_Expiry - date.today()).days,
                    'is_low_stock': stock.Total_Stock_Availability < stock.Minimum_Stock_Level
                }
            })
        return Response(data)

# ============= PATIENT SEARCH =============
class PatientSearchViewSet(viewsets.ViewSet):
    """ViewSet for patient search functionality for doctors"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search patients by various criteria"""
        search_term = request.query_params.get('search', '').strip()
        
        if not search_term:
            # Return recent patients if no search term
            week_ago = datetime.now() - timedelta(days=7)
            
            recent_patients = PatientDetail.objects.filter(
                appointments__Date__gte=week_ago
            ).distinct().order_by('-appointments__Date')[:10]
            
            serializer = PatientDetailsSerializer(recent_patients, many=True)
            return Response(serializer.data)

        # Build search query
        query = Q()
        
        # Exact PAT_ID match
        query |= Q(PAT_ID__iexact=search_term)
        
        # Partial matches
        query |= Q(PAT_ID__icontains=search_term)
        query |= Q(Patient_Name__icontains=search_term)
        
        # Phone number search
        phone_clean = ''.join(filter(str.isdigit, search_term))
        if phone_clean:
            query |= Q(Phone_Number__icontains=phone_clean)
            query |= Q(Emergency_Contact__icontains=phone_clean)
        
        # Email search
        if '@' in search_term:
            query |= Q(Email__iexact=search_term)
            query |= Q(Email__icontains=search_term)
        
        # Search by approximate age
        if search_term.isdigit() and len(search_term) <= 3:
            try:
                age = int(search_term)
                target_date = date.today() - timedelta(days=age*365)
                query |= Q(DOB__year=target_date.year)
            except:
                pass
        
        patients = PatientDetail.objects.filter(query).distinct().order_by('-created_at')[:20]
        serializer = PatientDetailsSerializer(patients, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get patients with recent appointments for the current doctor"""
        if hasattr(request.user, 'staff_detail'):
            doctor_id = request.user.staff_detail.STAFF_ID
            
            # Patients with appointments from this doctor in last 7 days
            week_ago = datetime.now() - timedelta(days=7)
            
            recent_patients = PatientDetail.objects.filter(
                appointments__DOC_ID=doctor_id,
                appointments__Date__gte=week_ago
            ).distinct().order_by('-appointments__Date')[:10]
            
            serializer = PatientDetailsSerializer(recent_patients, many=True)
            return Response(serializer.data)
        return Response([])
    
    @action(detail=True, methods=['get'])
    def appointments(self, request, pk=None):
        """Get appointments for a specific patient with current doctor"""
        if hasattr(request.user, 'staff_detail'):
            doctor_id = request.user.staff_detail.STAFF_ID
            
            appointments = AppointmentDetail.objects.filter(
                PAT_ID=pk,
                DOC_ID=doctor_id
            ).order_by('-Date', '-Time')
            
            serializer = AppointmentDetailsSerializer(appointments, many=True)
            return Response(serializer.data)
        return Response([])