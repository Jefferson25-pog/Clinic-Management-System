from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'medicines', views.MedicineDetailsViewSet)
router.register(r'suppliers', views.SupplierDetailsViewSet)
router.register(r'stock', views.StockDetailsViewSet)
router.register(r'stock-orders', views.StockOrderingDetailsViewSet)
router.register(r'dispensing', views.DispensingMedicinesViewSet)
router.register(r'smart-pharmacy', views.PharmacySmartViewSet, basename='smart-pharmacy')

urlpatterns = [
    path('', include(router.urls)),
]