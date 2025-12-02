from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import LabTest, LabTestResult
from .serializers import LabTestsSerializer, SimpleLabRequestSerializer, LabTestResultsSerializer
from doctorapp.models import LabTestRequestDetail
from adminapp.models import StaffDetail
from django.db.models import Q

class IsLabTechUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Lab Technicians').exists():
            return True
        if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
            return request.user.staff_detail.Role == 'Lab Technician'
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

class LabTestsViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestsSerializer
    permission_classes = [IsAuthenticated, IsLabTechUser | IsAdminUser]

class LabTestRequestDetailsViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequestDetail.objects.all()
    serializer_class = SimpleLabRequestSerializer
    permission_classes = [IsAuthenticated, IsLabTechUser | IsAdminUser]

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        lab_request = self.get_object()
        new_status = request.data.get('status')
        
        # FIXED: Use literal list instead of STATUS_CHOICES
        if new_status in ['Requested', 'In Progress', 'Completed', 'Cancelled']:
            lab_request.Status = new_status
            lab_request.save()
            return Response({'status': 'Status updated successfully'})
        return Response(
            {'error': 'Invalid status'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        pending_requests = LabTestRequestDetail.objects.filter(Status='Requested')
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get requests assigned to current lab tech"""
        if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
            tech_id = request.user.staff_detail.STAFF_ID  # FIXED
            my_requests = LabTestRequestDetail.objects.filter(Assigned_Technician=tech_id)
            serializer = self.get_serializer(my_requests, many=True)
            return Response(serializer.data)
        return Response([])

class LabTestResultsViewSet(viewsets.ModelViewSet):
    queryset = LabTestResult.objects.all()
    serializer_class = LabTestResultsSerializer
    permission_classes = [IsAuthenticated, IsLabTechUser | IsAdminUser]

    def create(self, request, *args, **kwargs):
        lab_request_id = request.data.get('LAB_REQUEST')
        if LabTestResult.objects.filter(LAB_REQUEST=lab_request_id).exists():
            return Response(
                {'error': 'Results already exist for this lab request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)

class SmartLabAssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsLabTechUser | IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def technician_workload(self, request):
        """Get workload for all lab technicians"""
        techs = StaffDetail.objects.filter(Role='Lab Technician')
        
        workload_data = []
        for tech in techs:
            pending_count = LabTestRequestDetail.objects.filter(
                Assigned_Technician=tech,
                Status__in=['Requested', 'In Progress']
            ).count()
            
            workload_data.append({
                'technician_id': tech.STAFF_ID,
                'technician_name': tech.Name,
                'pending_requests': pending_count,
                'status': 'Available' if pending_count < 30 else 'Busy'
            })
        
        return Response(workload_data)
    
    @action(detail=False, methods=['post'])
    def auto_assign_request(self, request):
        """Automatically assign lab request to least busy technician"""
        lab_request_id = request.data.get('lab_request_id')
        
        try:
            lab_request = LabTestRequestDetail.objects.get(LAB_REQUEST_ID=lab_request_id)
            
            # Find available technicians with pending count
            techs = StaffDetail.objects.filter(Role='Lab Technician', Status='Available')
            
            available_techs = []
            for tech in techs:
                pending_count = LabTestRequestDetail.objects.filter(
                    Assigned_Technician=tech,
                    Status__in=['Requested', 'In Progress']
                ).count()
                
                # Include tech if they have <30 pending OR this is a stat priority request
                if pending_count < 30 or lab_request.Priority == 'stat':
                    available_techs.append((tech, pending_count))
            
            if available_techs:
                # Sort by pending count (least busy first)
                available_techs.sort(key=lambda x: x[1])
                best_tech = available_techs[0][0]
                
                lab_request.Assigned_Technician = best_tech
                lab_request.save()
                
                return Response({
                    'message': f'Request assigned to {best_tech.Name}',
                    'technician_id': best_tech.STAFF_ID,
                    'technician_name': best_tech.Name
                })
            else:
                return Response(
                    {'error': 'No available technicians. All technicians have 30+ pending requests.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except LabTestRequestDetail.DoesNotExist:
            return Response(
                {'error': 'Lab request not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def assign_to_me(self, request):
        """Assign a specific request to current lab tech"""
        lab_request_id = request.data.get('lab_request_id')
        
        try:
            lab_request = LabTestRequestDetail.objects.get(LAB_REQUEST_ID=lab_request_id)
            
            if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
                current_tech = request.user.staff_detail  # FIXED
                
                # Check if current user is a lab tech
                if current_tech.Role != 'Lab Technician':
                    return Response(
                        {'error': 'Only lab technicians can assign requests to themselves'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                lab_request.Assigned_Technician = current_tech
                lab_request.save()
                
                return Response({
                    'message': f'Request assigned to you ({current_tech.Name})',
                    'lab_request_id': lab_request.LAB_REQUEST_ID
                })
            else:
                return Response(
                    {'error': 'User does not have staff details'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except LabTestRequestDetail.DoesNotExist:
            return Response(
                {'error': 'Lab request not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )