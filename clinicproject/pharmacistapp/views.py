from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from .models import MedicineDetail, SupplierDetail, StockDetails, StockOrderingDetail, DispensingMedicine, MedicineBatch  # ADD MedicineBatch here
from .serializers import MedicineDetailsSerializer, SupplierDetailsSerializer, StockDetailsSerializer, StockOrderingDetailsSerializer, DispensingMedicinesSerializer
from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Sum, F  # ADD this import

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
    permission_classes = []

class SupplierDetailsViewSet(viewsets.ModelViewSet):
    queryset = SupplierDetail.objects.all()
    serializer_class = SupplierDetailsSerializer
    permission_classes = []

class StockDetailsViewSet(viewsets.ModelViewSet):
    queryset = StockDetails.objects.all()
    serializer_class = StockDetailsSerializer
    permission_classes = []

    def get_queryset(self):
        """Update stock summaries before returning"""
        # Update all stock summaries
        for stock in StockDetails.objects.all():
            stock.update_stock_summary()
        return StockDetails.objects.all()

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get medicines with low stock (< 10 units)"""
        # First update all stock summaries
        for stock in StockDetails.objects.all():
            stock.update_stock_summary()
        
        low_stock_items = StockDetails.objects.filter(Total_Stock_Availability__lt=10)
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired_medicines(self, request):
        """Get expired or near-expiry medicines"""
        near_expiry = date.today() + timedelta(days=30)
        
        # Get expired batches
        expired_batches = MedicineBatch.objects.filter(
            Expiry_Date__lte=date.today(),
            Is_Active=True,
            Quantity_Available__gt=0
        ).select_related('MED_ID')
        
        # Get near expiry batches
        near_expiry_batches = MedicineBatch.objects.filter(
            Expiry_Date__gt=date.today(),
            Expiry_Date__lte=near_expiry,
            Is_Active=True,
            Quantity_Available__gt=0
        ).select_related('MED_ID')
        
        result = []
        for batch in expired_batches:
            result.append({
                'medicine_name': batch.MED_ID.Medicine_Name,
                'batch_number': batch.Batch_Number,
                'expiry_date': batch.Expiry_Date,
                'quantity': batch.Quantity_Available,
                'status': 'Expired',
                'days_ago': (date.today() - batch.Expiry_Date).days
            })
        
        for batch in near_expiry_batches:
            result.append({
                'medicine_name': batch.MED_ID.Medicine_Name,
                'batch_number': batch.Batch_Number,
                'expiry_date': batch.Expiry_Date,
                'quantity': batch.Quantity_Available,
                'status': 'Near Expiry',
                'days_left': (batch.Expiry_Date - date.today()).days
            })
        
        return Response(result)

class StockOrderingDetailsViewSet(viewsets.ModelViewSet):
    queryset = StockOrderingDetail.objects.all()
    serializer_class = StockOrderingDetailsSerializer
    permission_classes = []

class DispensingMedicinesViewSet(viewsets.ModelViewSet):
    queryset = DispensingMedicine.objects.all()
    serializer_class = DispensingMedicinesSerializer
    permission_classes = []

    @action(detail=False, methods=['get'])
    def today_dispensing(self, request):
        """Get today's dispensing records"""
        today = timezone.now().date()
        today_dispensing = DispensingMedicine.objects.filter(Dispense_Date__date=today)
        serializer = self.get_serializer(today_dispensing, many=True)
        return Response(serializer.data)
    
class PharmacySmartViewSet(viewsets.ViewSet):
    permission_classes = []
    
    @action(detail=False, methods=['get'])
    def expiry_alerts(self, request):
        """Get medicines expiring in next 30 days"""
        expiry_threshold = date.today() + timedelta(days=30)
        
        # Query MedicineBatch directly
        expiring_batches = MedicineBatch.objects.filter(
            Expiry_Date__gt=date.today(),
            Expiry_Date__lte=expiry_threshold,
            Is_Active=True,
            Quantity_Available__gt=0
        ).select_related('MED_ID').order_by('Expiry_Date')
        
        alerts = []
        for batch in expiring_batches:
            alerts.append({
                'medicine_id': batch.MED_ID.MED_ID,
                'medicine_name': batch.MED_ID.Medicine_Name,
                'batch_number': batch.Batch_Number,
                'expiry_date': batch.Expiry_Date,
                'days_until_expiry': (batch.Expiry_Date - date.today()).days,
                'quantity': batch.Quantity_Available,
                'dosage': batch.MED_ID.Dosage,
                'supplier': batch.SUPPLIER_ID.Supplier_Name if batch.SUPPLIER_ID else None
            })
        
        return Response(alerts)
    
    @action(detail=False, methods=['get'])
    def auto_reorder_suggestions(self, request):
        """Suggest medicines that need reordering based on consumption"""
        # First ensure all stock summaries are updated
        for stock in StockDetails.objects.all():
            stock.update_stock_summary()
        
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
            
            # Get latest supplier from MedicineBatch
            latest_batch = MedicineBatch.objects.filter(
                MED_ID=stock.MED_ID
            ).order_by('-Purchase_Date').first()
            
            suggested_order = max(
                stock.Minimum_Stock_Level * 2,
                monthly_consumption,
                50  # Minimum order quantity
            )
            
            suggestions.append({
                'medicine_id': stock.MED_ID.MED_ID,
                'medicine_name': stock.MED_ID.Medicine_Name,
                'current_stock': stock.Total_Stock_Availability,
                'minimum_stock': stock.Minimum_Stock_Level,
                'suggested_order_quantity': suggested_order,
                'supplier': latest_batch.SUPPLIER_ID.Supplier_Name if latest_batch and latest_batch.SUPPLIER_ID else 'No supplier',
                'supplier_id': latest_batch.SUPPLIER_ID.SUPPLIER_ID if latest_batch and latest_batch.SUPPLIER_ID else None,
                'unit_price': stock.MED_ID.Price_per_Unit
            })
        
        return Response(suggestions)

# ADD THIS NEW CLASS AT THE END
class DashboardViewSet(viewsets.ViewSet):
    permission_classes = []
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get dashboard statistics"""
        # Update all stock summaries first
        for stock in StockDetails.objects.all():
            stock.update_stock_summary()
        
        # Total medicines count
        total_medicines = MedicineDetail.objects.count()
        
        # Low stock items count
        low_stock_count = StockDetails.objects.filter(
            Total_Stock_Availability__lt=10
        ).count()
        
        # Today's dispensing count
        today = timezone.now().date()
        today_dispensing_count = DispensingMedicine.objects.filter(
            Dispense_Date__date=today
        ).count()
        
        # Expiring soon count (next 30 days)
        thirty_days_later = today + timedelta(days=30)
        expiring_soon_count = MedicineBatch.objects.filter(
            Expiry_Date__gte=today,
            Expiry_Date__lte=thirty_days_later,
            Is_Active=True,
            Quantity_Available__gt=0
        ).count()
        
        return Response({
            'totalMedicines': total_medicines,
            'lowStockItems': low_stock_count,
            'todayDispensing': today_dispensing_count,
            'expiringSoon': expiring_soon_count
        })