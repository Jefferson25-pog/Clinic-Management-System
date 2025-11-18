from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App URLs
    path('api/admin/', include('adminapp.urls')),
    path('api/doctor/', include('doctorapp.urls')),
    path('api/receptionist/', include('receptionistapp.urls')),
    path('api/lab/', include('labtechapp.urls')),
    path('api/pharmacy/', include('pharmacistapp.urls')),
]