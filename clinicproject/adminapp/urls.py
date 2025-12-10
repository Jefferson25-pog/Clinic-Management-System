# adminapp/urls.py - UPDATED
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'staffs', views.StaffDetailsViewSet, basename='staff')
router.register(r'departments', views.DepartmentsViewSet, basename='department')
router.register(r'groups', views.GroupViewSet, basename='group')

# Register doctor self-management view
router.register(r'doctor-self', views.DoctorSelfView, basename='doctor-self')

urlpatterns = [
    # Admin URLs
    path('', include(router.urls)),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard-stats'),
]