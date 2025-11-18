from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import MedicineDetails, SupplierDetails, StockDetails, StockOrderingDetails, DispensingMedicines
from .serializers import MedicineDetailsSerializer, SupplierDetailsSerializer, StockDetailsSerializer, StockOrderingDetailsSerializer, DispensingMedicinesSerializer

class IsPharmacistUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Pharmacists').exists():
            return True
        if hasattr(request.user, 'staff_details'):
            return request.user.staff_details.Role == 'Pharmacist'
        return False

class MedicineDetailsViewSet(viewsets.ModelViewSet):
    queryset = MedicineDetails.objects.all()
    serializer_class = MedicineDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser]

class SupplierDetailsViewSet(viewsets.ModelViewSet):
    queryset = SupplierDetails.objects.all()
    serializer_class = SupplierDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser]

class StockDetailsViewSet(viewsets.ModelViewSet):
    queryset = StockDetails.objects.all()
    serializer_class = StockDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser]

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get medicines with low stock (< 10 units)"""
        low_stock_items = StockDetails.objects.filter(Stock_Availability__lt=10)
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired_medicines(self, request):
        """Get expired or near-expiry medicines"""
        from datetime import date, timedelta
        near_expiry = date.today() + timedelta(days=30)
        expired_medicines = StockDetails.objects.filter(Expiry_Date__lte=near_expiry)
        serializer = self.get_serializer(expired_medicines, many=True)
        return Response(serializer.data)

class StockOrderingDetailsViewSet(viewsets.ModelViewSet):
    queryset = StockOrderingDetails.objects.all()
    serializer_class = StockOrderingDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser]

    @action(detail=False, methods=['post'])
    def order_stock(self, request):
        """Create a stock order and update stock availability"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            stock_order = serializer.save()
            
            # Update stock availability
            stock_item, created = StockDetails.objects.get_or_create(
                MED_ID=stock_order.MED_ID,
                SUPPLIER_ID=stock_order.SUPPLIER_ID,
                defaults={
                    'Expiry_Date': request.data.get('expiry_date'),  # You might want to add this field
                    'Stock_Availability': stock_order.Qty_Supplied
                }
            )
            
            if not created:
                stock_item.Stock_Availability += stock_order.Qty_Supplied
                stock_item.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DispensingMedicinesViewSet(viewsets.ModelViewSet):
    queryset = DispensingMedicines.objects.all()
    serializer_class = DispensingMedicinesSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser]

    @action(detail=False, methods=['post'])
    def dispense_medicine(self, request):
        """Dispense medicine and update stock"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            dispensing = serializer.save()
            
            # Update stock availability
            try:
                stock_item = StockDetails.objects.get(
                    MED_ID=dispensing.MED_ID,
                    Stock_Availability__gte=dispensing.Qty,
                    Expiry_Date__gt=date.today()
                )
                stock_item.Stock_Availability -= dispensing.Qty
                stock_item.save()
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except StockDetails.DoesNotExist:
                return Response(
                    {'error': 'Insufficient stock or expired medicine'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def today_dispensing(self, request):
        """Get today's dispensing records"""
        from django.utils import timezone
        today = timezone.now().date()
        today_dispensing = DispensingMedicines.objects.filter(Dispense_Date__date=today)
        serializer = self.get_serializer(today_dispensing, many=True)
        return Response(serializer.data)