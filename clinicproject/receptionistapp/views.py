from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import PatientDetail, AppointmentDetail, ReceptionistLog, BillDetail
from .serializers import PatientDetailsSerializer, AppointmentDetailsSerializer, ReceptionistLogSerializer, BillDetailsSerializer
from adminapp.models import StaffDetail
from adminapp.serializers import StaffDetailsSerializer
from django.utils import timezone

class IsReceptionistUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Receptionists').exists():
            return True
        if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
            return request.user.staff_detail.Role == 'Receptionist'
        return False
    
class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
            return request.user.staff_detail.Role == 'Admin'
        return False

class PatientDetailsViewSet(viewsets.ModelViewSet):
    queryset = PatientDetail.objects.all()
    serializer_class = PatientDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]

    @action(detail=False, methods=['post'])
    def register_patient(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            ReceptionistLog.objects.create(
                Action="Patient Registration",
                Details=f"Registered patient: {serializer.data['Patient_Name']}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AppointmentDetailsViewSet(viewsets.ModelViewSet):
    queryset = AppointmentDetail.objects.all()
    serializer_class = AppointmentDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]

    @action(detail=False, methods=['get'])
    def today_appointments(self, request):
        today = timezone.now().date()
        appointments = AppointmentDetail.objects.filter(Date__date=today)
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def schedule_appointment(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            ReceptionistLog.objects.create(
                Action="Appointment Scheduled",
                Details=f"Scheduled appointment: Token {serializer.data['TOKEN_NO']}"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReceptionistLogViewSet(viewsets.ModelViewSet):
    queryset = ReceptionistLog.objects.all()
    serializer_class = ReceptionistLogSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]

class DoctorsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StaffDetail.objects.filter(Role='Doctor', Status='Available')  # 👈 Only show available doctors
    serializer_class = StaffDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def all_doctors(self, request):
        """Get all doctors (including unavailable ones) - for admin view"""
        if request.user.is_superuser or (hasattr(request.user, 'staff_detail') and request.user.staff_detail.Role == 'Admin'):
            all_doctors = StaffDetail.objects.filter(Role='Doctor')
            serializer = self.get_serializer(all_doctors, many=True)
            return Response({
                'count': all_doctors.count(),
                'doctors': serializer.data,
                'availability_summary': {
                    'available': all_doctors.filter(Status='Available').count(),
                    'busy': all_doctors.filter(Status='Busy').count(),
                    'on_leave': all_doctors.filter(Status='On Leave').count()
                }
            })
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
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
                'phone': doctor.Phone_Number
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
            return Response({'error': 'doctor_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            doctor = StaffDetail.objects.get(STAFF_ID=doctor_id, Role='Doctor')
            
            # Check if doctor has appointments on that date
            appointments_on_date = 0
            if appointment_date:
                try:
                    from datetime import datetime
                    date_obj = datetime.strptime(appointment_date, '%Y-%m-%d').date()
                    appointments_on_date = AppointmentDetail.objects.filter(
                        DOC_ID=doctor,
                        Date=date_obj,
                        Status='Scheduled'
                    ).count()
                except ValueError:
                    return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'doctor_id': doctor.STAFF_ID,
                'doctor_name': doctor.Name,
                'status': doctor.Status,
                'status_display': doctor.get_Status_display(),
                'is_available': doctor.Status == 'Available',
                'appointments_on_date': appointments_on_date if appointment_date else 'Date not specified',
                'department': doctor.Department.Department_Name if doctor.Department else None,
                'consultation_fees': float(doctor.Consultation_fees)
            })
            
        except StaffDetail.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

class BillDetailsViewSet(viewsets.ModelViewSet):
    queryset = BillDetail.objects.all()
    serializer_class = BillDetailsSerializer
    permission_classes = [IsAuthenticated, IsReceptionistUser | IsAdminUser]

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
            
            if BillDetail.objects.filter(CONSULT_ID=consultation).exists():
                return Response(
                    {'error': 'Bill already exists for this consultation'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            bill = BillDetail.objects.create(CONSULT_ID=consultation)
            
            ReceptionistLog.objects.create(
                Action="Bill Generated",
                Details=f"Generated bill {bill.BILL_ID} for consultation {consult_id} - Total: ${bill.Total_Amount}"
            )
            
            serializer = self.get_serializer(bill)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
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

    @action(detail=False, methods=['get'])
    def available_consultations(self, request):
        from doctorapp.models import ConsultationDetail
        billed_consultations = BillDetail.objects.values_list('CONSULT_ID', flat=True)
        available_consultations = ConsultationDetail.objects.exclude(
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