# doctorapp/urls.py - COMPLETE FIXED VERSION
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'appointments', views.AppointmentDetailsViewSet)
router.register(r'consultations', views.ConsultationDetailsViewSet)
router.register(r'prescriptions', views.PrescriptionViewSet)
router.register(r'lab-tests', views.LabTestsViewSet, basename='doctor-lab-tests')
router.register(r'lab-test-requests', views.LabTestRequestViewSet, basename='doctor-lab-test-requests')
router.register(r'lab-results', views.LabResultsViewSet, basename='doctor-lab-results')
router.register(r'medicines', views.AvailableMedicinesViewSet, basename='doctor-medicines')
router.register(r'availability', views.DoctorAvailabilityViewSet, basename='doctor-availability')
router.register(r'patients', views.PatientSearchViewSet, basename='doctor-patients')

urlpatterns = [
    path('', include(router.urls)),
]

# Add patient-specific routes
urlpatterns += [
    path('patients/<str:pk>/appointments/', 
         views.PatientSearchViewSet.as_view({'get': 'appointments'}), 
         name='doctor-patient-appointments'),
]