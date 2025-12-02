from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tests', views.LabTestsViewSet)
router.register(r'requests', views.LabTestRequestDetailsViewSet)
router.register(r'results', views.LabTestResultsViewSet)
router.register(r'smart-assignment', views.SmartLabAssignmentViewSet, basename='smart-assignment')

urlpatterns = [
    path('', include(router.urls)),
]