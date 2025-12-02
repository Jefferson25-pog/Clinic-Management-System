from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import MedicineDetail, SupplierDetail, StockDetails, StockOrderingDetail, DispensingMedicine
from .serializers import MedicineDetailsSerializer, SupplierDetailsSerializer, StockDetailsSerializer, StockOrderingDetailsSerializer, DispensingMedicinesSerializer
from datetime import date, timedelta
from django.utils import timezone

class IsPharmacistUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='Pharmacists').exists():
            return True
        if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
            return request.user.staff_detail.Role == 'Pharmacist'
        return False
    
class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'staff_detail'):  # FIXED: staff_detail
            return request.user.staff_detail.Role == 'Admin'
        return False

class MedicineDetailsViewSet(viewsets.ModelViewSet):
    queryset = MedicineDetail.objects.all()
    serializer_class = MedicineDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser | IsAdminUser]

class SupplierDetailsViewSet(viewsets.ModelViewSet):
    queryset = SupplierDetail.objects.all()
    serializer_class = SupplierDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser | IsAdminUser]

class StockDetailsViewSet(viewsets.ModelViewSet):
    queryset = StockDetails.objects.all()
    serializer_class = StockDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser | IsAdminUser]

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get medicines with low stock (< 10 units)"""
        low_stock_items = StockDetails.objects.filter(Total_Stock_Availability__lt=10)
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired_medicines(self, request):
        """Get expired or near-expiry medicines"""
        near_expiry = date.today() + timedelta(days=30)
        expired_medicines = StockDetails.objects.filter(Earliest_Expiry__lte=near_expiry)
        serializer = self.get_serializer(expired_medicines, many=True)
        return Response(serializer.data)

class StockOrderingDetailsViewSet(viewsets.ModelViewSet):
    queryset = StockOrderingDetail.objects.all()
    serializer_class = StockOrderingDetailsSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser | IsAdminUser]

class DispensingMedicinesViewSet(viewsets.ModelViewSet):
    queryset = DispensingMedicine.objects.all()
    serializer_class = DispensingMedicinesSerializer
    permission_classes = [IsAuthenticated, IsPharmacistUser | IsAdminUser]

    @action(detail=False, methods=['get'])
    def today_dispensing(self, request):
        """Get today's dispensing records"""
        today = timezone.now().date()
        today_dispensing = DispensingMedicine.objects.filter(Dispense_Date__date=today)
        serializer = self.get_serializer(today_dispensing, many=True)
        return Response(serializer.data)
    
class PharmacySmartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsPharmacistUser | IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def expiry_alerts(self, request):
        """Get medicines expiring in next 30 days"""
        expiry_threshold = date.today() + timedelta(days=30)
        expiring_medicines = StockDetails.objects.filter(
            Earliest_Expiry__lte=expiry_threshold,
            Earliest_Expiry__gte=date.today()
        ).select_related('MED_ID')
        
        serializer = StockDetailsSerializer(expiring_medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def auto_reorder_suggestions(self, request):
        """Suggest medicines that need reordering based on consumption"""
        from django.db.models import Sum, F
        
        # Get medicines with stock below minimum level
        low_stock = StockDetails.objects.filter(
            Total_Stock_Availability__lt=F('Minimum_Stock_Level')
        ).select_related('MED_ID')
        
        suggestions = []
        for stock in low_stock:
            # Calculate average monthly consumption
            thirty_days_ago = date.today() - timedelta(days=30)
            monthly_consumption = DispensingMedicine.objects.filter(
                MED_ID=stock.MED_ID,
                Dispense_Date__gte=thirty_days_ago
            ).aggregate(total=Sum('Qty'))['total'] or 0
            
            suggested_order = max(
                stock.Minimum_Stock_Level * 2,
                monthly_consumption
            )
            
            suggestions.append({
                'medicine_id': stock.MED_ID.MED_ID,
                'medicine_name': stock.MED_ID.Medicine_Name,
                'current_stock': stock.Total_Stock_Availability,
                'minimum_stock': stock.Minimum_Stock_Level,
                'suggested_order_quantity': suggested_order,
            })
        
        return Response(suggestions)