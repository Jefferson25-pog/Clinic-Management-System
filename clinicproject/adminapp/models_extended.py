from django.db import models
from django.contrib.auth.models import User, Group
from django.db.models.signals import post_save
from django.dispatch import receiver
import json
from datetime import datetime

# Profile model to extend User
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    staff_detail = models.ForeignKey('adminapp.StaffDetail', on_delete=models.SET_NULL, null=True, blank=True)
    is_admin_user = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"{self.user.username} - {self.staff_detail.Role if self.staff_detail else 'Admin'}"

# Signal to create profile automatically
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

# System Log model
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
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['level']),
            models.Index(fields=['user']),
        ]
        verbose_name = 'System Log'
        verbose_name_plural = 'System Logs'
    
    def __str__(self):
        return f"{self.timestamp} - {self.level} - {self.action}"

# Activity Monitor model
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
        verbose_name = 'Activity Monitor'
        verbose_name_plural = 'Activity Monitor'
    
    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action}"

# Group permissions mapping
class GroupPermission(models.Model):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name='permissions')
    can_manage_users = models.BooleanField(default=False)
    can_manage_staff = models.BooleanField(default=False)
    can_view_logs = models.BooleanField(default=False)
    can_manage_system = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'group_permissions'
        verbose_name = 'Group Permission'
        verbose_name_plural = 'Group Permissions'
    
    def __str__(self):
        return f"Permissions for {self.group.name}"