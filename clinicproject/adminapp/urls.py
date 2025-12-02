from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'staffs', views.StaffDetailsViewSet)
router.register(r'departments', views.DepartmentsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]