# doctorapp/urls.py - UPDATED VERSION
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'appointments', views.AppointmentDetailsViewSet, basename='doctor-appointments')
router.register(r'consultations', views.ConsultationDetailsViewSet, basename='doctor-consultations')
router.register(r'prescriptions', views.PrescriptionViewSet, basename='doctor-prescriptions')
router.register(r'lab-tests', views.LabTestsViewSet, basename='doctor-lab-tests')
router.register(r'lab-test-requests', views.LabTestRequestViewSet, basename='doctor-lab-test-requests')
router.register(r'lab-results', views.LabResultsViewSet, basename='doctor-lab-results')
router.register(r'medicines', views.AvailableMedicinesViewSet, basename='doctor-medicines')
router.register(r'patient-medical-info', views.PatientMedicalInfoDoctorViewSet, basename='doctor-patient-medical-info')
router.register(r'availability', views.DoctorAvailabilityUpdateViewSet, basename='doctor-availability')
router.register(r'patients', views.PatientSearchViewSet, basename='doctor-patients')

# Dashboard stats endpoint
from .views import DoctorDashboardViewSet

urlpatterns = [
    path('', include(router.urls)),
    # Dashboard
    path('dashboard/stats/', DoctorDashboardViewSet.as_view({'get': 'stats'}), name='doctor-dashboard-stats'),
    path('consultations/<int:pk>/complete_consultation/', 
         views.ConsultationDetailsViewSet.as_view({'post': 'complete_consultation'}), 
         name='doctor-complete-consultation'),
    path('consultations/<int:pk>/bill_info/', 
         views.ConsultationDetailsViewSet.as_view({'get': 'bill_info'}), 
         name='doctor-consultation-bill'),
         path('consultations/create_from_appointment/', 
         views.ConsultationDetailsViewSet.as_view({'post': 'create_from_appointment'}), 
         name='doctor-create-from-appointment'),
]