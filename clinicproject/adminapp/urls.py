# adminapp/urls.py - ADD '/admin/' prefix
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'staffs', views.StaffDetailsViewSet, basename='staff')
router.register(r'departments', views.DepartmentsViewSet, basename='department')
router.register(r'groups', views.GroupViewSet, basename='group')

urlpatterns = [
    # Add 'admin/' prefix here
    path('', include(router.urls)),
]