from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# Remove doctors route since doctors are now in adminapp
router.register(r'appointments', views.AppointmentDetailsViewSet)
router.register(r'consultations', views.ConsultationDetailsViewSet)
router.register(r'prescriptions', views.PrescriptionViewSet)
router.register(r'lab-tests', views.LabTestsViewSet, basename='doctor-lab-tests')
router.register(r'lab-test-requests', views.LabTestRequestViewSet, basename='doctor-lab-test-requests')

router.register(r'availability', views.DoctorAvailabilityViewSet, basename='doctor-availability')

urlpatterns = [
    path('', include(router.urls)),
    
]