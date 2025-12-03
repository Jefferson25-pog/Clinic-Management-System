from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import SystemLog

@receiver(post_save, sender=User)
def log_user_save(sender, instance, created, **kwargs):
    if created:
        SystemLog.objects.create(
            level='INFO',
            log_type='USER',
            user=instance,
            action='User created',
            details={'username': instance.username, 'email': instance.email}
        )