# Create a new file: doctorapp/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ConsultationDetail
from receptionistapp.models import BillDetail
from django.utils import timezone

@receiver(post_save, sender=ConsultationDetail)
def handle_consultation_completion(sender, instance, created, **kwargs):
    """
    Signal to handle consultation completion
    1. Update appointment status
    2. Create auto-generated bill
    """
    if not created and instance.Consultation_Status == 'completed':
        # Update appointment status
        appointment = instance.TOKEN_NO
        if appointment.Status != 'Completed':
            appointment.Status = 'Completed'
            appointment.completed_at = timezone.now()
            appointment.save()
        
        # Create auto-generated bill if it doesn't exist
        if not BillDetail.objects.filter(CONSULT_ID=instance).exists():
            try:
                bill = BillDetail.objects.create(
                    CONSULT_ID=instance,
                    auto_generated=True,
                    Notes=f"Auto-generated bill for consultation {instance.CONSULT_ID}"
                )
                # Force recalculation
                bill.calculate_costs()
                bill.save()
            except Exception as e:
                print(f"Error creating auto bill: {e}")

# In doctorapp/apps.py - Add this:
from django.apps import AppConfig

class DoctorappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'doctorapp'
    
    def ready(self):
        import doctorapp.signals