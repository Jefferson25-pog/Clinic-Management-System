# receptionistapp/views.py - COMPLETE UPDATED VERSION WITH SEARCH & FILTER
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone
from datetime import date, datetime, timedelta
from doctorapp.serializers import ConsultationDetailsSerializer
from .models import PatientDetail, AppointmentDetail, BillDetail
from .serializers import PatientDetailsSerializer, AppointmentDetailsSerializer, BillDetailsSerializer
from adminapp.models import StaffDetail
from adminapp.serializers import StaffDetailsSerializer
from rest_framework.pagination import PageNumberPagination

class IsDoctorUser(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'staff_detail'):
            return request.user.staff_detail.Role == 'Doctor'
        return False
    
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
    
    @action(detail=False, methods=['get'])  # THIS LINE WAS MISALIGNED
    def stats(self, request):  # THIS METHOD WAS NOT PROPERLY INSIDE THE CLASS
        """Get comprehensive patient statistics"""
        today = date.today()
        
        # Get this month range
        first_day = today.replace(day=1)
        
        # Total patients
        total = PatientDetail.objects.count()
        
        # Today's registrations
        today_count = PatientDetail.objects.filter(created_at__date=today).count()
        
        # This month registrations
        month_count = PatientDetail.objects.filter(
            created_at__date__gte=first_day,
            created_at__date__lte=today
        ).count()
        
        # By gender - FIXED: Use 'PAT_ID' instead of 'id'
        gender_stats = PatientDetail.objects.values('Gender').annotate(
            count=Count('PAT_ID')  # FIXED HERE
        ).order_by('Gender')
        
        # By blood group - FIXED: Use 'PAT_ID' instead of 'id'
        blood_group_stats = PatientDetail.objects.values('Blood_Group').annotate(
            count=Count('PAT_ID')  # FIXED HERE
        ).order_by('Blood_Group')
        
        # Recent registrations (last 7 days)
        seven_days_ago = today - timedelta(days=7)
        recent_stats = PatientDetail.objects.filter(
            created_at__date__gte=seven_days_ago
        ).values('created_at__date').annotate(
            count=Count('PAT_ID')  # FIXED HERE
        ).order_by('created_at__date')
        
        return Response({
            'total': total,
            'today': today_count,
            'this_month': month_count,
            'last_7_days': PatientDetail.objects.filter(created_at__date__gte=seven_days_ago).count(),
            'gender_stats': {stat['Gender'] or 'Unknown': stat['count'] for stat in gender_stats},
            'blood_group_stats': {stat['Blood_Group'] or 'Unknown': stat['count'] for stat in blood_group_stats},
            'recent_registrations': [
                {'date': stat['created_at__date'].strftime('%Y-%m-%d'), 'count': stat['count']}
                for stat in recent_stats
            ]
        })
    
    @action(detail=False, methods=['get'])
    def advanced_search(self, request):
        """Advanced search with multiple filters"""
        query_params = request.query_params
        
        # Build dynamic filters
        filters = Q()
        
        # Text search
        search_query = query_params.get('search', '')
        if search_query:
            filters &= (
                Q(PAT_ID__icontains=search_query) |
                Q(Patient_Name__icontains=search_query) |
                Q(Phone_Number__icontains=search_query) |
                Q(Email__icontains=search_query) |
                Q(Address__icontains=search_query) |
                Q(Occupation__icontains=search_query)
            )
        
        # Gender filter
        gender = query_params.get('gender', '')
        if gender:
            filters &= Q(Gender=gender)
        
        # Blood group filter
        blood_group = query_params.get('blood_group', '')
        if blood_group:
            filters &= Q(Blood_Group=blood_group)
        
        # Date range filters
        date_from = query_params.get('date_from', '')
        date_to = query_params.get('date_to', '')
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                filters &= Q(created_at__date__gte=date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                filters &= Q(created_at__date__lte=date_to_obj)
            except ValueError:
                pass
        
        # Age range filters
        min_age = query_params.get('min_age', '')
        max_age = query_params.get('max_age', '')
        
        if min_age or max_age:
            today = date.today()
            
            # Calculate date ranges for age
            if min_age:
                max_dob = today.replace(year=today.year - int(min_age))
                filters &= Q(DOB__lte=max_dob)
            
            if max_age:
                min_dob = today.replace(year=today.year - int(max_age) - 1)
                filters &= Q(DOB__gte=min_dob)
        
        # Apply ordering
        ordering = query_params.get('ordering', '-created_at')
        valid_ordering = ['PAT_ID', 'Patient_Name', 'created_at', 'DOB']
        if ordering.lstrip('-') in valid_ordering:
            patients = PatientDetail.objects.filter(filters).order_by(ordering)
        else:
            patients = PatientDetail.objects.filter(filters).order_by('-created_at')
        
        # Pagination
        page = int(query_params.get('page', 1))
        page_size = int(query_params.get('page_size', 10))
        
        total_count = patients.count()
        start = (page - 1) * page_size
        end = start + page_size
        
        serializer = self.get_serializer(patients[start:end], many=True)
        
        return Response({
            'results': serializer.data,
            'count': total_count,
            'total_pages': (total_count + page_size - 1) // page_size,
            'current_page': page,
            'page_size': page_size,
            'has_next': end < total_count,
            'has_previous': page > 1
        })
    
class AppointmentPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'results': data,
            'next': self.get_next_link(),
            'previous': self.get_previous_link()
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
    pagination_class = AppointmentPagination  # ADD THIS LINE
    
    # Override get_queryset to handle date filtering better
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Handle date filter from frontend
        date_param = self.request.query_params.get('date')
        if date_param:
            try:
                # Convert string date to date object
                date_obj = datetime.strptime(date_param, '%Y-%m-%d').date()
                queryset = queryset.filter(Date=date_obj)
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        
        # Handle status filter
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(Status=status_param)
        
        # Handle priority filter
        priority_param = self.request.query_params.get('priority')
        if priority_param:
            queryset = queryset.filter(Priority=priority_param)
        
        return queryset
    
    # Add this method to handle filter combinations better
    def list(self, request, *args, **kwargs):
        # Get the filtered queryset
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # Keep your existing actions...
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
        
        # Apply pagination to today_appointments too
        page = self.paginate_queryset(appointments)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

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
    
# receptionistapp/views.py - Add these views
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PatientMedicalInfo
from .serializers import PatientMedicalInfoSerializer

class PatientMedicalInfoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing patient medical information.
    Only doctors can create/update medical info.
    """
    queryset = PatientMedicalInfo.objects.all()
    serializer_class = PatientMedicalInfoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Only doctors can create/update medical info.
        Receptionists can only view.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsDoctorUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        """Set the doctor who created/updated the medical info"""
        serializer.save(last_updated_by=self.request.user.staff_detail)
    
    def perform_update(self, serializer):
        """Set the doctor who updated the medical info"""
        serializer.save(last_updated_by=self.request.user.staff_detail)
    
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
                serializer.save(last_updated_by=request.user.staff_detail)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)