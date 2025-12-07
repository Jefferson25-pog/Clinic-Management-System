# receptionistapp/views.py - COMPLETE UPDATED VERSION WITH SEARCH & FILTER
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone
from datetime import date, datetime, timedelta
from doctorapp.serializers import ConsultationDetailsSerializer
from .models import PatientDetail, AppointmentDetail, BillDetail
from .serializers import PatientDetailsSerializer, AppointmentDetailsSerializer, BillDetailsSerializer
from adminapp.models import StaffDetail
from adminapp.serializers import StaffDetailsSerializer

class IsReceptionistUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Receptionists').exists():
            return True
        if hasattr(request.user, 'staff_detail'):
            return request.user.staff_detail.Role == 'Receptionist'
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

class PatientDetailsViewSet(viewsets.ModelViewSet):
    queryset = PatientDetail.objects.all()
    serializer_class = PatientDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['PAT_ID', 'Patient_Name', 'Phone_Number', 'Email', 'Address']
    filterset_fields = ['Gender', 'Blood_Group']
    ordering_fields = ['PAT_ID', 'Patient_Name', 'created_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['post'])
    def register_patient(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if query:
            patients = PatientDetail.objects.filter(
                Q(PAT_ID__icontains=query) |
                Q(Patient_Name__icontains=query) |
                Q(Phone_Number__icontains=query) |
                Q(Email__icontains=query)
            )
            serializer = self.get_serializer(patients, many=True)
            return Response(serializer.data)
        return Response([])
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = PatientDetail.objects.count()
        today = date.today()
        today_count = PatientDetail.objects.filter(created_at__date=today).count()
        month_start = date(today.year, today.month, 1)
        month_count = PatientDetail.objects.filter(created_at__date__gte=month_start).count()
        
        return Response({
            'total_patients': total,
            'today_registrations': today_count,
            'this_month_registrations': month_count
        })

class AppointmentDetailsViewSet(viewsets.ModelViewSet):
    queryset = AppointmentDetail.objects.all()
    serializer_class = AppointmentDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'APPOINTMENT_ID', 'TOKEN_NO', 
        'PAT_ID__Patient_Name', 'PAT_ID__Phone_Number',
        'DOC_ID__Name', 'Reason'
    ]
    filterset_fields = ['Status', 'Priority', 'Date', 'DOC_ID', 'PAT_ID']
    ordering_fields = ['Date', 'Time', 'Priority', 'created_at']
    ordering = ['Date', 'Time']

    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        today = date.today()
        appointments = AppointmentDetail.objects.filter(Date=today)
        
        # Get filter parameters
        status_filter = request.query_params.get('status')
        doctor_filter = request.query_params.get('doctor_id')
        
        if status_filter:
            appointments = appointments.filter(Status=status_filter)
        if doctor_filter:
            appointments = appointments.filter(DOC_ID=doctor_filter)
        
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def schedule_appointment(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        doctor_id = request.query_params.get('doctor_id')
        appointment_date = request.query_params.get('date')
        
        if not doctor_id or not appointment_date:
            return Response({'error': 'doctor_id and date parameters are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            date_obj = datetime.strptime(appointment_date, '%Y-%m-%d').date()
            
            # Get existing appointments for that doctor on that date
            existing_appointments = AppointmentDetail.objects.filter(
                DOC_ID=doctor_id,
                Date=date_obj,
                Status='Scheduled'
            )
            
            # Generate available time slots (9 AM to 5 PM, every 30 minutes)
            time_slots = []
            for hour in range(9, 18):  # 9 AM to 5 PM
                for minute in [0, 30]:
                    time_slot = f"{hour:02d}:{minute:02d}"
                    
                    # Check if slot is booked
                    is_booked = existing_appointments.filter(Time=f"{hour:02d}:{minute:02d}:00").exists()
                    
                    time_slots.append({
                        'time': time_slot,
                        'available': not is_booked
                    })
            
            return Response({
                'doctor_id': doctor_id,
                'date': appointment_date,
                'time_slots': time_slots,
                'booked_slots': existing_appointments.count()
            })
            
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        except StaffDetail.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        
        if appointment.Status == 'Cancelled':
            return Response({'error': 'Appointment is already cancelled'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        appointment.Status = 'Cancelled'
        appointment.cancelled_by = request.user.username
        appointment.save()
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        
        if appointment.Status == 'Completed':
            return Response({'error': 'Appointment is already completed'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        appointment.Status = 'Completed'
        appointment.save()
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = date.today()
        
        stats = {
            'total': AppointmentDetail.objects.count(),
            'scheduled': AppointmentDetail.objects.filter(Status='Scheduled').count(),
            'completed': AppointmentDetail.objects.filter(Status='Completed').count(),
            'cancelled': AppointmentDetail.objects.filter(Status='Cancelled').count(),
            'today': AppointmentDetail.objects.filter(Date=today).count(),
            'today_scheduled': AppointmentDetail.objects.filter(Date=today, Status='Scheduled').count(),
            'today_completed': AppointmentDetail.objects.filter(Date=today, Status='Completed').count(),
        }
        
        return Response(stats)

class DoctorsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StaffDetail.objects.filter(Role='Doctor')
    serializer_class = StaffDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['Name', 'STAFF_ID', 'Department__Department_Name', 'Specialization']
    filterset_fields = ['Status', 'Department', 'Specialization']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by availability if requested
        available_only = self.request.query_params.get('available_only')
        if available_only and available_only.lower() == 'true':
            queryset = queryset.filter(Status='Available')
        
        # Filter by department if requested
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(Department__DEPT_ID=department)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def available_by_department(self, request):
        """Get available doctors grouped by department"""
        available_doctors = StaffDetail.objects.filter(
            Role='Doctor', 
            Status='Available'
        ).select_related('Department')
        
        # Group by department
        departments = {}
        for doctor in available_doctors:
            dept_name = doctor.Department.Department_Name if doctor.Department else 'No Department'
            if dept_name not in departments:
                departments[dept_name] = []
            
            departments[dept_name].append({
                'doctor_id': doctor.STAFF_ID,
                'doctor_name': doctor.Name,
                'consultation_fees': float(doctor.Consultation_fees),
                'email': doctor.Email,
                'phone': doctor.Phone_Number,
                'specialization': doctor.Specialization,
                'experience': doctor.years_of_experience
            })
        
        return Response({
            'departments': departments,
            'total_available': available_doctors.count()
        })
    
    @action(detail=False, methods=['get'])
    def check_doctor_availability(self, request):
        """Check if a specific doctor is available"""
        doctor_id = request.query_params.get('doctor_id')
        appointment_date = request.query_params.get('date')
        
        if not doctor_id:
            return Response({'error': 'doctor_id parameter is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            doctor = StaffDetail.objects.get(STAFF_ID=doctor_id, Role='Doctor')
            
            # Check if doctor has appointments on that date
            appointments_on_date = 0
            if appointment_date:
                try:
                    date_obj = datetime.strptime(appointment_date, '%Y-%m-%d').date()
                    appointments_on_date = AppointmentDetail.objects.filter(
                        DOC_ID=doctor,
                        Date=date_obj,
                        Status='Scheduled'
                    ).count()
                except ValueError:
                    return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'doctor_id': doctor.STAFF_ID,
                'doctor_name': doctor.Name,
                'status': doctor.Status,
                'status_display': doctor.get_Status_display(),
                'is_available': doctor.Status == 'Available',
                'appointments_on_date': appointments_on_date if appointment_date else 'Date not specified',
                'department': doctor.Department.Department_Name if doctor.Department else None,
                'consultation_fees': float(doctor.Consultation_fees),
                'specialization': doctor.Specialization
            })
            
        except StaffDetail.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

class BillDetailsViewSet(viewsets.ModelViewSet):
    queryset = BillDetail.objects.all()
    serializer_class = BillDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'BILL_ID', 'CONSULT_ID__TOKEN_NO__PAT_ID__Patient_Name',
        'CONSULT_ID__DOC_ID__Name', 'Transaction_ID'
    ]
    filterset_fields = ['Pay_Status', 'Payment_Mode', 'CONSULT_ID']
    ordering_fields = ['Created_Date', 'Total_Amount', 'BILL_ID']
    ordering = ['-Created_Date']

    def create(self, request, *args, **kwargs):
        consult_id = request.data.get('CONSULT_ID')
        
        if not consult_id:
            return Response(
                {'error': 'CONSULT_ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from doctorapp.models import ConsultationDetail
            consultation = ConsultationDetail.objects.get(id=consult_id)
            
            # Check if appointment is completed
            if consultation.TOKEN_NO.Status != 'Completed':
                return Response(
                    {'error': 'Cannot create bill for non-completed appointment'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if bill already exists
            if BillDetail.objects.filter(CONSULT_ID=consultation).exists():
                return Response(
                    {'error': 'Bill already exists for this consultation'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create bill with auto-calculation
            bill = BillDetail.objects.create(CONSULT_ID=consultation)
            
            # Update with any additional data from request
            serializer = self.get_serializer(bill, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                bill.delete()
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except ConsultationDetail.DoesNotExist:
            return Response(
                {'error': 'Consultation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        bill = self.get_object()
        bill.calculate_costs()
        bill.save()
        serializer = self.get_serializer(bill)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        bill = self.get_object()
        
        if bill.Pay_Status == 'Paid':
            return Response({'error': 'Bill is already marked as paid'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        payment_mode = request.data.get('Payment_Mode', 'Cash')
        transaction_id = request.data.get('Transaction_ID')
        paid_amount = request.data.get('paid_amount')
        
        # Determine payment status
        if paid_amount and float(paid_amount) < bill.Total_Amount:
            pay_status = 'Partial'
        else:
            pay_status = 'Paid'
        
        bill.Pay_Status = pay_status
        bill.Payment_Mode = payment_mode
        bill.Transaction_ID = transaction_id
        bill.save()
        
        serializer = self.get_serializer(bill)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_consultations(self, request):
        from doctorapp.models import ConsultationDetail
        
        # Get completed consultations without bills
        billed_consultations = BillDetail.objects.values_list('CONSULT_ID', flat=True)
        available_consultations = ConsultationDetail.objects.filter(
            TOKEN_NO__Status='Completed'
        ).exclude(
            id__in=billed_consultations
        ).select_related('TOKEN_NO__PAT_ID', 'DOC_ID')
        
        # Apply filters
        patient_filter = request.query_params.get('patient_id')
        doctor_filter = request.query_params.get('doctor_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if patient_filter:
            available_consultations = available_consultations.filter(TOKEN_NO__PAT_ID=patient_filter)
        if doctor_filter:
            available_consultations = available_consultations.filter(DOC_ID=doctor_filter)
        if date_from:
            available_consultations = available_consultations.filter(Created_Date__gte=date_from)

        serializer = ConsultationDetailsSerializer(available_consultations, many=True)
        return Response({
            'count': available_consultations.count(),
            'available_consultations': serializer.data
        })