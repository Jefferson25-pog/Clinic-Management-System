# authentication/models.py - COMPLETE FIXED VERSION
from django.db import models
from django.contrib.auth.models import User, Group
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import date
import uuid

# authentication/models.py - UPDATE UserProfile model
class UserProfile(models.Model):
    USER_TYPE_CHOICES = [
        ('STANDALONE', 'Standalone User'),
        ('STAFF_LINKED', 'Linked to Staff'),
        ('ADMIN', 'Admin User'),
        ('SUPER_ADMIN', 'Super Admin'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    staff_detail = models.ForeignKey('adminapp.StaffDetail', on_delete=models.SET_NULL, null=True, blank=True)
    is_admin_user = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    custom_user_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='STANDALONE')
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"{self.user.username} - {self.staff_detail.Role if self.staff_detail else 'Standalone'}"
    
    def save(self, *args, **kwargs):
        if not self.custom_user_id:
            # Generate custom user ID based on user type
            if self.user.is_superuser:
                prefix = "SUPER"
                self.user_type = 'SUPER_ADMIN'
            elif self.user.is_staff or self.is_admin_user:
                prefix = "ADMIN"
                self.user_type = 'ADMIN'
            elif self.staff_detail:
                role_prefixes = {
                    'Doctor': 'DOC',
                    'Receptionist': 'REC',
                    'Pharmacist': 'PHRM',
                    'Lab Technician': 'LBTCH',
                    'Admin': 'ADM'
                }
                prefix = role_prefixes.get(self.staff_detail.Role, 'STAFF')
                self.user_type = 'STAFF_LINKED'
            else:
                prefix = "USER"
                self.user_type = 'STANDALONE'
            
            # Find the next number
            last_user = UserProfile.objects.filter(
                custom_user_id__startswith=prefix
            ).order_by('custom_user_id').last()
            
            if last_user and last_user.custom_user_id:
                try:
                    # Extract number from something like "USER-0001"
                    import re
                    match = re.search(r'(\d+)$', last_user.custom_user_id)
                    if match:
                        last_num = int(match.group(1))
                        new_num = last_num + 1
                    else:
                        new_num = 1
                except:
                    new_num = 1
            else:
                new_num = 1
            
            self.custom_user_id = f"{prefix}-{new_num:04d}"
        
        super().save(*args, **kwargs)

class SystemLog(models.Model):
    LOG_LEVEL_CHOICES = [
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('DEBUG', 'Debug'),
        ('SECURITY', 'Security'),
    ]
    
    LOG_TYPE_CHOICES = [
        ('AUTH', 'Authentication'),
        ('USER', 'User Management'),
        ('DATA', 'Data Operation'),
        ('SYSTEM', 'System Operation'),
        ('SECURITY', 'Security'),
    ]
    
    id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=10, choices=LOG_LEVEL_CHOICES)
    log_type = models.CharField(max_length=10, choices=LOG_TYPE_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    action = models.CharField(max_length=255)
    details = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'system_logs'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.timestamp} - {self.level} - {self.action}"

class LoginHistory(models.Model):
    LOGIN_TYPE_CHOICES = [
        ('ADMIN', 'Admin Login'),
        ('STAFF', 'Staff Login'),
        ('FAILED', 'Failed Login'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    username = models.CharField(max_length=150)
    login_type = models.CharField(max_length=10, choices=LOGIN_TYPE_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    success = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    logout_timestamp = models.DateTimeField(null=True, blank=True)
    session_duration = models.IntegerField(null=True, blank=True, help_text="Session duration in seconds")
    details = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'login_history'
        ordering = ['-timestamp']
        verbose_name = 'Login History'
        verbose_name_plural = 'Login History'
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.username} - {self.get_login_type_display()} - {status} - {self.timestamp}"
    
    def mark_logout(self):
        """Mark the logout time and calculate session duration"""
        if self.success and not self.logout_timestamp:
            self.logout_timestamp = timezone.now()
            if self.timestamp:
                self.session_duration = (self.logout_timestamp - self.timestamp).seconds
            self.save()
    
    def get_session_duration_display(self):
        """Format session duration for display"""
        # For failed logins, return N/A
        if not self.success:
            return "N/A"
        
        # For successful logins without logout timestamp
        if not self.session_duration and not self.logout_timestamp:
            return "Still active"
        
        # For successful logins with session duration
        if not self.session_duration:
            return "N/A"
        
        hours = self.session_duration // 3600
        minutes = (self.session_duration % 3600) // 60
        seconds = self.session_duration % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    
    @property
    def is_active(self):
        """Check if session is still active"""
        return self.success and not self.logout_timestamp
    
    def save(self, *args, **kwargs):
        # For failed logins, always set logout_timestamp to None and session_duration to None
        if not self.success:
            self.logout_timestamp = None
            self.session_duration = None
        
        super().save(*args, **kwargs)

class ActivityMonitor(models.Model):
    id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    endpoint = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField(null=True, blank=True)
    duration = models.FloatField(help_text="Duration in seconds", null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'activity_monitor'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()