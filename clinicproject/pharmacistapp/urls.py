from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'medicine', views.MedicineDetailsViewSet)
router.register(r'supplier', views.SupplierDetailsViewSet)
router.register(r'stock', views.StockDetailsViewSet)
router.register(r'stock-order', views.StockOrderingDetailsViewSet)
router.register(r'dispensing', views.DispensingMedicinesViewSet)
router.register(r'smart-pharmacy', views.PharmacySmartViewSet, basename='smart-pharmacy')
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard')  # Add this line

urlpatterns = [
    path('', include(router.urls)),
]