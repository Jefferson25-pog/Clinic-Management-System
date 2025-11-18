# In labtechapp/views.py - Cleaned up
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import LabTests, LabTestRequestDetails, LabTestResults
from .serializers import LabTestsSerializer, LabTestRequestDetailsSerializer, LabTestResultsSerializer

class IsLabTechUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Lab Technicians').exists():
            return True
        if hasattr(request.user, 'staff_details'):
            return request.user.staff_details.Role == 'Lab Technician'
        return False

class LabTestsViewSet(viewsets.ModelViewSet):
    queryset = LabTests.objects.all()
    serializer_class = LabTestsSerializer
    permission_classes = [IsAuthenticated]

class LabTestRequestDetailsViewSet(viewsets.ModelViewSet):
    queryset = LabTestRequestDetails.objects.all()
    serializer_class = LabTestRequestDetailsSerializer
    permission_classes = [IsAuthenticated, IsLabTechUser]

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        lab_request = self.get_object()
        new_status = request.data.get('status')
        
        if new_status in dict(LabTestRequestDetails.STATUS_CHOICES):
            lab_request.Status = new_status
            lab_request.save()
            return Response({'status': 'Status updated successfully'})
        return Response(
            {'error': 'Invalid status'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def pending_requests(self, request):
        """Get all pending lab test requests"""
        pending_requests = LabTestRequestDetails.objects.filter(Status='Requested')
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)

class LabTestResultsViewSet(viewsets.ModelViewSet):
    queryset = LabTestResults.objects.all()
    serializer_class = LabTestResultsSerializer
    permission_classes = [IsAuthenticated, IsLabTechUser]

    def create(self, request, *args, **kwargs):
        """Override create to ensure one result per request"""
        lab_request_id = request.data.get('LAB_REQUEST')  # Fixed field name
        
        if LabTestResults.objects.filter(LAB_REQUEST=lab_request_id).exists():  # Fixed field name
            return Response(
                {'error': 'Results already exist for this lab request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().create(request, *args, **kwargs)