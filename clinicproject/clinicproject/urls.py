from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Custom Authentication System
    path('api/auth/', include('authentication.urls')),
    
    # App URLs
    path('api/admin/', include('adminapp.urls')),
    path('api/doctor/', include('doctorapp.urls')),
    path('api/reception/', include('receptionistapp.urls')),
    path('api/labtech/', include('labtechapp.urls')),
    path('api/pharmacist/', include('pharmacistapp.urls')),
]