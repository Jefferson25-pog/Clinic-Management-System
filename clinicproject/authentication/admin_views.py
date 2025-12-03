# Create a new file: authentication/admin_views.py
from django.contrib import admin
from django.utils import timezone
from datetime import timedelta
from .models import LoginHistory

class LoginStatsAdmin(admin.ModelAdmin):
    # This will be a custom admin view
    
    def changelist_view(self, request, extra_context=None):
        # Add statistics to the admin page
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        stats = {
            'total_logins': LoginHistory.objects.filter(success=True).count(),
            'total_failed': LoginHistory.objects.filter(success=False).count(),
            'today_logins': LoginHistory.objects.filter(
                timestamp__date=today, 
                success=True
            ).count(),
            'today_failed': LoginHistory.objects.filter(
                timestamp__date=today, 
                success=False
            ).count(),
            'week_logins': LoginHistory.objects.filter(
                timestamp__date__gte=week_ago, 
                success=True
            ).count(),
            'admin_logins': LoginHistory.objects.filter(
                login_type='ADMIN', 
                success=True
            ).count(),
            'staff_logins': LoginHistory.objects.filter(
                login_type='STAFF', 
                success=True
            ).count(),
        }
        
        # Get recent successful logins (last 10)
        recent_logins = LoginHistory.objects.filter(
            success=True
        ).order_by('-timestamp')[:10]
        
        # Get failed attempts (last 10)
        recent_failed = LoginHistory.objects.filter(
            success=False
        ).order_by('-timestamp')[:10]
        
        extra_context = {
            'stats': stats,
            'recent_logins': recent_logins,
            'recent_failed': recent_failed,
        }
        
        return super().changelist_view(request, extra_context=extra_context)