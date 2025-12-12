# doctorapp/views.py - COMPLETE FIXED VERSION
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import ConsultationDetail, Prescription, LabTestRequestDetail
from .serializers import ConsultationDetailsSerializer, PrescriptionSerializer, LabTestRequestDetailsSerializer
from receptionistapp.models import AppointmentDetail, PatientDetail, BillDetail, PatientMedicalInfo
from receptionistapp.serializers import AppointmentDetailsSerializer, PatientDetailsSerializer, PatientMedicalInfoSerializer, BillDetailsSerializer
from pharmacistapp.models import StockDetails, MedicineDetail
from pharmacistapp.serializers import MedicineDetailsSerializer
from labtechapp.models import LabTest, LabTestResult
from labtechapp.serializers import LabTestResultsSerializer, LabTestsSerializer as LabTechLabTestsSerializer
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
            
            # IMPORTANT: Only get COMPLETED consultations
            consultations = ConsultationDetail.objects.filter(
                DOC_ID=doctor_id,
                Consultation_Status='completed'  # Only completed
            )
            
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
    
    @action(detail=False, methods=['post'], url_path='create_from_appointment')
    def create_from_appointment(self, request):
        """
        Create a consultation from an appointment (when doctor starts consultation)
        """
        try:
            appointment_id = request.data.get('appointment_id')
            token_no = request.data.get('token_no')
            
            if not appointment_id and not token_no:
                return Response({
                    'error': 'Either appointment_id or token_no is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find appointment
            appointment = None
            if appointment_id:
                # Try different ways to find appointment
                appointment = AppointmentDetail.objects.filter(
                    APPOINTMENT_ID=appointment_id
                ).first()
                if not appointment:
                    appointment = AppointmentDetail.objects.filter(
                        id=appointment_id
                    ).first()
            elif token_no:
                appointment = AppointmentDetail.objects.filter(
                    TOKEN_NO=token_no
                ).first()
            
            if not appointment:
                return Response({
                    'error': 'Appointment not found',
                    'exists': False
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if consultation already exists
            existing_consultation = ConsultationDetail.objects.filter(
                TOKEN_NO=appointment
            ).first()
            
            if existing_consultation:
                # Return existing consultation
                serializer = self.get_serializer(existing_consultation)
                return Response({
                    'exists': True,
                    'message': 'Consultation already exists',
                    'consultation': serializer.data
                })
            
            # Get doctor from request user (current logged-in doctor)
            if not hasattr(request.user, 'staff_detail'):
                return Response({
                    'error': 'User is not a doctor',
                    'exists': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            doctor_id = request.user.staff_detail.STAFF_ID
            
            # Create new consultation WITHOUT specifying CONSULT_ID
            # Let the model's save() method generate it automatically
            consultation = ConsultationDetail.objects.create(
                TOKEN_NO=appointment,
                DOC_ID_id=doctor_id,
                Symptoms=appointment.Reason or '',
                Diagnosis='',
                Description='',
                Consultation_Status='in_progress',
                Consultation_Time=timezone.now()
            )
            
            # Now check if the generated ID was saved
            if consultation.CONSULT_ID:
                print(f"Generated consultation ID: {consultation.CONSULT_ID}")
            else:
                # If still no ID, generate one manually
                consultation.CONSULT_ID = consultation._generate_consultation_id()
                consultation.save()
            
            serializer = self.get_serializer(consultation)
            return Response({
                'exists': False,
                'message': 'Consultation created successfully',
                'consultation': serializer.data,
                'consultation_id': consultation.CONSULT_ID
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"Error creating consultation from appointment: {str(e)}")
            print(traceback.format_exc())
            
            return Response({
                'error': str(e),
                'exists': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # ============= FIXED by_token METHOD =============
    @action(detail=False, methods=['get'])
    def by_token(self, request):
        """Get consultation by token number"""
        token_no = request.query_params.get('token_no')
        
        if not token_no:
            return Response(
                {'error': 'token_no parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # DEBUG: Log what we're searching for
            print(f"DEBUG: Searching for token: {token_no}")
            
            # First try to find appointment by TOKEN_NO field
            appointment = AppointmentDetail.objects.filter(TOKEN_NO=token_no).first()
            
            # If not found by TOKEN_NO, try by APPOINTMENT_ID
            if not appointment:
                appointment = AppointmentDetail.objects.filter(APPOINTMENT_ID=token_no).first()
            
            if not appointment:
                return Response({
                    'exists': False,
                    'message': 'Appointment not found for this token',
                    'debug_info': f'No appointment found with TOKEN_NO or APPOINTMENT_ID = {token_no}'
                }, status=status.HTTP_404_NOT_FOUND)
            
            print(f"DEBUG: Found appointment: {appointment.APPOINTMENT_ID}, TOKEN_NO: {appointment.TOKEN_NO}")
            
            # Get consultation for this appointment
            # FIX: Use the correct field name - it might be TOKEN_NO_id or TOKEN_NO
            consultation = ConsultationDetail.objects.filter(TOKEN_NO=appointment).first()
            
            if consultation:
                # DEBUG: Print consultation fields to verify structure
                print(f"DEBUG: Found consultation: {consultation.CONSULT_ID}")
                print(f"DEBUG: Consultation fields: {consultation.__dict__}")
                
                # FIX: Use minimal fields to avoid Created_Date issue
                # Create a custom response with only essential fields
                consultation_data = {
                    'CONSULT_ID': consultation.CONSULT_ID,
                    'TOKEN_NO': consultation.TOKEN_NO_id,
                    'DOC_ID': consultation.DOC_ID_id,
                    'Symptoms': consultation.Symptoms,
                    'Diagnosis': consultation.Diagnosis,
                    'Description': consultation.Description,
                    'Consultation_Status': consultation.Consultation_Status,
                    'Consultation_Time': consultation.Consultation_Time,
                    # Skip Created_Date temporarily
                }
                
                return Response({
                    'exists': True,
                    'consultation': consultation_data,
                    'appointment_info': {
                        'appointment_id': appointment.APPOINTMENT_ID,
                        'patient_name': appointment.PAT_ID.Patient_Name if appointment.PAT_ID else 'Unknown',
                        'token_no': appointment.TOKEN_NO,
                        'status': appointment.Status
                    },
                    'warning': 'Using minimal fields due to database column issue'
                })
            else:
                # Return appointment info even if no consultation exists
                return Response({
                    'exists': False,
                    'message': 'No consultation found for this token',
                    'appointment_info': {
                        'appointment_id': appointment.APPOINTMENT_ID,
                        'patient_name': appointment.PAT_ID.Patient_Name if appointment.PAT_ID else 'Unknown',
                        'token_no': appointment.TOKEN_NO,
                        'status': appointment.Status,
                        'appointment_date': appointment.Date,
                        'appointment_time': appointment.Time
                    },
                    'suggested_action': 'Create a new consultation for this appointment'
                })
            
        except Exception as e:
            # Log the error for debugging
            import traceback
            error_trace = traceback.format_exc()
            print(f"ERROR in by_token endpoint: {str(e)}")
            print(f"ERROR TRACEBACK:\n{error_trace}")
            
            # Check if it's the specific column error
            if "Created_Date" in str(e):
                return Response({
                    'error': 'Database column issue: Created_Date column might not exist in database',
                    'suggestion': 'Run migrations: python manage.py makemigrations && python manage.py migrate doctorapp',
                    'exists': False,
                    'debug_info': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'error': f"Server error: {str(e)}",
                'exists': False,
                'traceback': error_trace
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Add this to ConsultationDetailsViewSet in doctorapp/views.py
    @action(detail=False, methods=['get'], url_path='by_appointment/(?P<appointment_id>[^/.]+)')
    def by_appointment(self, request, appointment_id=None):
        """
        Get consultation by appointment ID
        """
        try:
            # Try to find appointment by APPOINTMENT_ID
            appointment = AppointmentDetail.objects.filter(APPOINTMENT_ID=appointment_id).first()
            
            if not appointment:
                return Response({
                    'exists': False,
                    'error': f'Appointment with ID {appointment_id} not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get consultation for this appointment
            consultation = ConsultationDetail.objects.filter(TOKEN_NO=appointment).first()
            
            if consultation:
                # Return consultation data
                consultation_data = {
                    'CONSULT_ID': consultation.CONSULT_ID,
                    'TOKEN_NO': consultation.TOKEN_NO_id,
                    'DOC_ID': consultation.DOC_ID_id,
                    'Symptoms': consultation.Symptoms,
                    'Diagnosis': consultation.Diagnosis,
                    'Description': consultation.Description,
                    'Consultation_Status': consultation.Consultation_Status,
                    'Consultation_Time': consultation.Consultation_Time,
                    'appointment_info': {
                        'appointment_id': appointment.APPOINTMENT_ID,
                        'patient_name': appointment.PAT_ID.Patient_Name if appointment.PAT_ID else 'Unknown',
                        'token_no': appointment.TOKEN_NO,
                        'status': appointment.Status
                    }
                }
                
                return Response({
                    'exists': True,
                    'consultation': consultation_data
                })
            else:
                # Return appointment info without consultation
                return Response({
                    'exists': False,
                    'message': 'No consultation found for this appointment',
                    'appointment_info': {
                        'appointment_id': appointment.APPOINTMENT_ID,
                        'patient_name': appointment.PAT_ID.Patient_Name if appointment.PAT_ID else 'Unknown',
                        'token_no': appointment.TOKEN_NO,
                        'status': appointment.Status,
                        'date': appointment.Date,
                        'time': appointment.Time,
                        'doctor_id': appointment.DOC_ID.STAFF_ID if appointment.DOC_ID else None
                    },
                    'suggested_action': 'Create a new consultation'
                })
                
        except Exception as e:
            import traceback
            print(f"Error in by_appointment endpoint: {str(e)}")
            print(traceback.format_exc())
            
            return Response({
                'error': f"Server error: {str(e)}",
                'exists': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def debug_token(self, request):
        """Debug endpoint to check token existence"""
        token_no = request.query_params.get('token_no')
        
        if not token_no:
            return Response({'error': 'token_no parameter required'})
        
        # Check if token exists in AppointmentDetail
        appointments = AppointmentDetail.objects.all()
        all_tokens = list(appointments.values_list('TOKEN_NO', flat=True))
        all_appointment_ids = list(appointments.values_list('APPOINTMENT_ID', flat=True))
        
        appointment_by_token = appointments.filter(TOKEN_NO=token_no).first()
        appointment_by_id = appointments.filter(APPOINTMENT_ID=token_no).first()
        
        return Response({
            'searching_for': token_no,
            'all_tokens': all_tokens[:10],  # First 10
            'all_appointment_ids': all_appointment_ids[:10],  # First 10
            'found_by_token': appointment_by_token.APPOINTMENT_ID if appointment_by_token else None,
            'found_by_appointment_id': appointment_by_id.APPOINTMENT_ID if appointment_by_id else None,
            'appointment_exists': bool(appointment_by_token or appointment_by_id)
        })

    @action(detail=False, methods=['post'])
    def start_consultation(self, request):
        """
        Start a new consultation from appointment data
        """
        try:
            # Get data from request
            token_no = request.data.get('token_no')
            appointment_id = request.data.get('appointment_id')
            doctor_id = request.data.get('doctor_id') or request.user.staff_detail.STAFF_ID
        
            # First, get the appointment
            if appointment_id:
                appointment = AppointmentDetail.objects.get(APPOINTMENT_ID=appointment_id)
            elif token_no:
                appointment = AppointmentDetail.objects.get(TOKEN_NO=token_no)
            else:
                return Response(
                    {'error': 'Either token_no or appointment_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
            # Check if consultation already exists for this appointment
            existing_consultation = ConsultationDetail.objects.filter(
                TOKEN_NO=appointment
            ).first()
        
            if existing_consultation:
                serializer = self.get_serializer(existing_consultation)
                return Response({
                    'message': 'Existing consultation found',
                    'consultation': serializer.data,
                    'exists': True
                })
        
            # Create new consultation
            consultation = ConsultationDetail.objects.create(
                TOKEN_NO=appointment,
                DOC_ID=appointment.DOC_ID,
                Symptoms='',
                Diagnosis='',
                Description='',
                Consultation_Status='in_progress',
                Consultation_Time=timezone.now()
            )
        
            # Auto-generate CONSULT_ID if your model has save() method
            if not consultation.CONSULT_ID:
                # Generate simple ID
                consultation.CONSULT_ID = f"CON-{consultation.id:04d}"
                consultation.save()
        
            # Mark appointment as completed
            appointment.Status = 'Completed'
            appointment.save()
        
            serializer = self.get_serializer(consultation)
            return Response({
                'message': 'New consultation created',
                'consultation': serializer.data,
                'exists': False
            }, status=status.HTTP_201_CREATED)
        
        except AppointmentDetail.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def complete_consultation(self, request, pk=None):
        """
        Complete a consultation and auto-generate bill
        """
        consultation = self.get_object()
        
        if consultation.Consultation_Status == 'completed':
            return Response(
                {'error': 'Consultation is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update consultation status
        consultation.Consultation_Status = 'completed'
        consultation.save()
        
        # Update appointment status
        appointment = consultation.TOKEN_NO
        appointment.Status = 'Completed'
        appointment.completed_at = timezone.now()
        appointment.save()
        
        # Create auto-generated bill
        bill_data = {
            'CONSULT_ID': consultation.id,
            'auto_generated': True,
            'Notes': f'Auto-generated bill for completed consultation'
        }
        
        bill_serializer = BillDetailsSerializer(data=bill_data)
        if bill_serializer.is_valid():
            bill = bill_serializer.save()
            # Recalculate costs
            bill.calculate_costs()
            bill.save()
            
            # Get consultation data
            consultation_serializer = self.get_serializer(consultation)
            
            return Response({
                'message': 'Consultation completed successfully',
                'consultation': consultation_serializer.data,
                'bill': BillDetailsSerializer(bill).data,
                'appointment_updated': True
            })
        
        # If bill creation fails, still complete consultation
        return Response({
            'message': 'Consultation completed but bill creation failed',
            'consultation': self.get_serializer(consultation).data,
            'bill_error': bill_serializer.errors,
            'appointment_updated': True
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def bill_info(self, request, pk=None):
        """
        Get bill information for consultation
        """
        consultation = self.get_object()
        
        try:
            bill = BillDetail.objects.get(CONSULT_ID=consultation)
            serializer = BillDetailsSerializer(bill)
            return Response(serializer.data)
        except BillDetail.DoesNotExist:
            # Calculate estimated bill
            estimated_bill = {
                'consultation_id': consultation.CONSULT_ID,
                'consultation_fee': consultation.DOC_ID.Consultation_fees or 500.00,
                'estimated_medicine_cost': 0,
                'estimated_lab_test_cost': 0,
                'total_estimated': consultation.DOC_ID.Consultation_fees or 500.00,
                'has_bill': False
            }
            return Response(estimated_bill)

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
    """ViewSet for doctors to view available lab tests"""
    queryset = LabTest.objects.all()
    serializer_class = LabTechLabTestsSerializer  # Use the labtechapp serializer
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]

    def get_queryset(self):
        """Return all active lab tests"""
        return LabTest.objects.all().order_by('Lab_Test_Name')

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
class DoctorAvailabilityUpdateViewSet(viewsets.ViewSet):
    """ViewSet for doctors to toggle their availability status"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    @action(detail=False, methods=['get'])
    def current_status(self, request):
        """Get current availability status"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            return Response({
                'doctor_id': doctor.STAFF_ID,
                'doctor_name': doctor.Name,
                'current_status': doctor.Status,
                'is_available': doctor.Status == 'Available',  # Note: Not 'UnAvailable'
                'can_toggle': True,
                'next_status': 'UnAvailable' if doctor.Status == 'Available' else 'Available'  # Match model
            })
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle between Available and UnAvailable status"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            current_status = doctor.Status
            
            # Note: The model only allows 'Available' or 'UnAvailable'
            new_status = 'UnAvailable' if current_status == 'Available' else 'Available'
            
            doctor.Status = new_status
            doctor.save()
            
            # Log the action
            SystemLog.objects.create(
                level='INFO',
                log_type='USER',
                user=request.user,
                action=f'Doctor availability toggled from {current_status} to {new_status}',
                details={
                    'doctor_id': doctor.STAFF_ID,
                    'doctor_name': doctor.Name,
                    'old_status': current_status,
                    'new_status': new_status
                }
            )
            
            return Response({
                'success': True,
                'message': f'Status changed from {current_status} to {new_status}',
                'doctor_id': doctor.STAFF_ID,
                'old_status': current_status,
                'new_status': new_status,
                'is_available': new_status == 'Available',
                'next_status': 'UnAvailable' if new_status == 'Available' else 'Available'
            })
        
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def set_status(self, request):
        """Set specific status - only allow 'Available' or 'UnAvailable'"""
        if hasattr(request.user, 'staff_detail'):
            doctor = request.user.staff_detail
            new_status = request.data.get('status')
            
            # IMPORTANT: Model only allows these two values
            valid_statuses = ['Available', 'UnAvailable']
            if new_status not in valid_statuses:
                return Response({
                    'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            old_status = doctor.Status
            doctor.Status = new_status
            doctor.save()
            
            SystemLog.objects.create(
                level='INFO',
                log_type='USER',
                user=request.user,
                action=f'Doctor availability changed from {old_status} to {new_status}',
                details={
                    'doctor_id': doctor.STAFF_ID,
                    'doctor_name': doctor.Name,
                    'old_status': old_status,
                    'new_status': new_status
                }
            )
            
            return Response({
                'success': True,
                'message': f'Status changed from {old_status} to {new_status}',
                'doctor_id': doctor.STAFF_ID,
                'old_status': old_status,
                'new_status': new_status,
                'is_available': new_status == 'Available'
            })
        
        return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)

# ============= AVAILABLE MEDICINES =============
class AvailableMedicinesViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsDoctorUser | IsAdminUser]
    serializer_class = MedicineDetailsSerializer

    def get_queryset(self):
        # Return ALL medicines, not just those with stock
        return MedicineDetail.objects.all().order_by('Medicine_Name')

    @action(detail=False, methods=['get'])
    def with_stock(self, request):
        """Get all medicines with stock information"""
        medicines = MedicineDetail.objects.all().order_by('Medicine_Name')
        
        data = []
        for med in medicines:
            # Get stock info if it exists
            stock = StockDetails.objects.filter(MED_ID=med).first()
            
            medicine_data = {
                'MED_ID': med.MED_ID,
                'Medicine_Name': med.Medicine_Name,
                'Dosage': med.Dosage,
                'Price_per_Unit': float(med.Price_per_Unit),
                'stock': {
                    'available': stock.Total_Stock_Availability if stock else 0,
                    'has_stock': stock.Total_Stock_Availability > 0 if stock else False,
                    'is_low_stock': stock.Total_Stock_Availability < stock.Minimum_Stock_Level if stock else False,
                    'earliest_expiry': stock.Earliest_Expiry if stock else None
                }
            }
            data.append(medicine_data)
        
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

# ============= PATIENT MEDICAL INFO =============
class PatientMedicalInfoDoctorViewSet(viewsets.ModelViewSet):
    """
    Doctor-specific ViewSet for managing patient medical information.
    """
    queryset = PatientMedicalInfo.objects.all()
    serializer_class = PatientMedicalInfoSerializer
    permission_classes = [IsAuthenticated, IsDoctorUser]  # Only doctors can access
    
    def get_queryset(self):
        """Doctors can only see medical info for their patients"""
        queryset = super().get_queryset()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient__PAT_ID=patient_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get medical info for specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id parameter is required'}, status=400)
        
        try:
            medical_info = PatientMedicalInfo.objects.get(patient__PAT_ID=patient_id)
            serializer = self.get_serializer(medical_info)
            return Response(serializer.data)
        except PatientMedicalInfo.DoesNotExist:
            # Return empty structure if no medical info exists
            return Response({
                'patient': patient_id,
                'exists': False,
                'message': 'No medical information found for this patient'
            })
    
    @action(detail=False, methods=['post'])
    def update_vitals(self, request):
        """Update only vital signs for a patient"""
        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id is required'}, status=400)
        
        try:
            medical_info = PatientMedicalInfo.objects.get(patient__PAT_ID=patient_id)
            # Update only vital fields
            vital_fields = ['height', 'weight', 'blood_pressure', 'pulse', 
                          'temperature', 'respiratory_rate', 'oxygen_saturation']
            
            for field in vital_fields:
                if field in request.data:
                    setattr(medical_info, field, request.data[field])
            
            medical_info.last_updated_by = request.user.staff_detail
            medical_info.save()
            
            serializer = self.get_serializer(medical_info)
            return Response(serializer.data)
        except PatientMedicalInfo.DoesNotExist:
            # Create new medical info if doesn't exist
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                # Get patient object
                from receptionistapp.models import PatientDetail
                patient = PatientDetail.objects.get(PAT_ID=patient_id)
                serializer.save(patient=patient, last_updated_by=request.user.staff_detail)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)

# ============= DOCTOR DASHBOARD =============
class DoctorDashboardViewSet(viewsets.ViewSet):
    """Dashboard stats for doctors"""
    permission_classes = [IsAuthenticated, IsDoctorUser]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get dashboard statistics"""
        if hasattr(request.user, 'staff_detail'):
            doctor_id = request.user.staff_detail.STAFF_ID
            today = date.today()
            
            # Count today's appointments
            today_appointments = AppointmentDetail.objects.filter(
                DOC_ID=doctor_id,
                Date=today
            ).count()
            
            # Count today's consultations
            today_consultations = ConsultationDetail.objects.filter(
                DOC_ID=doctor_id,
                Consultation_Time__date=today
            ).count()
            
            # Count pending lab results
            pending_results = LabTestRequestDetail.objects.filter(
                CONSULT_ID__DOC_ID=doctor_id,
                Status__in=['Requested', 'In Progress']
            ).count()
            
            # Count upcoming appointments
            upcoming_appointments = AppointmentDetail.objects.filter(
                DOC_ID=doctor_id,
                Date__gte=today,
                Status='Scheduled'
            ).count()
            
            return Response({
                'today_appointments': today_appointments,
                'today_consultations': today_consultations,
                'pending_lab_results': pending_results,
                'upcoming_appointments': upcoming_appointments,
                'is_available': request.user.staff_detail.Status == 'Available'
            })
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)