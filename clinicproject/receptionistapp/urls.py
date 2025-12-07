# In receptionistapp/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'patients', views.PatientDetailsViewSet)
router.register(r'appointments', views.AppointmentDetailsViewSet)
router.register(r'doctors', views.DoctorsViewSet)
router.register(r'bills', views.BillDetailsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]