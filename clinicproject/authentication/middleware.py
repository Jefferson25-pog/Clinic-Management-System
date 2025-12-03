import time
from django.utils.deprecation import MiddlewareMixin
from .models import ActivityMonitor, SystemLog, UserProfile
from django.utils import timezone

class ActivityMonitoringMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()
        return None
    
    def process_response(self, request, response):
        excluded_paths = ['/static/', '/media/', '/admin/', '/api/token/']
        if any(request.path.startswith(path) for path in excluded_paths):
            return response
        
        if request.path.startswith('/api/') and hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            if request.method == 'OPTIONS':
                return response
            
            user = request.user if request.user.is_authenticated else None
            
            action = self._determine_action(request)
            
            try:
                ActivityMonitor.objects.create(
                    user=user,
                    action=action,
                    endpoint=request.path,
                    method=request.method,
                    status_code=response.status_code,
                    duration=round(duration, 3),
                    metadata={
                        'query_params': dict(request.GET),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    }
                )
                
                if user and hasattr(user, 'profile'):
                    user.profile.last_activity = timezone.now()
                    user.profile.save()
                    
            except Exception as e:
                pass
        
        return response
    
    def _determine_action(self, request):
        method = request.method
        path = request.path
        
        if '/login' in path:
            return 'User Login'
        elif '/logout' in path:
            return 'User Logout'
        elif '/change-password' in path:
            return 'Password Change'
        elif '/system-logs' in path:
            return 'View System Logs'
        elif '/activity-monitor' in path:
            return 'View Activity Monitor'
        elif '/dashboard-stats' in path:
            return 'View Dashboard Stats'
        elif '/users/' in path:
            if method == 'POST':
                return 'Create User'
            elif method in ['PUT', 'PATCH']:
                return 'Update User'
            elif method == 'DELETE':
                return 'Delete User'
            else:
                return 'View Users'
        elif '/groups/' in path:
            if method == 'POST':
                return 'Create Group'
            elif method in ['PUT', 'PATCH']:
                return 'Update Group'
            elif method == 'DELETE':
                return 'Delete Group'
            else:
                return 'View Groups'
        elif '/staffs/' in path:
            if method == 'POST':
                return 'Create Staff'
            elif method in ['PUT', 'PATCH']:
                return 'Update Staff'
            elif method == 'DELETE':
                return 'Delete Staff'
            else:
                return 'View Staff'
        elif '/departments/' in path:
            if method == 'POST':
                return 'Create Department'
            elif method in ['PUT', 'PATCH']:
                return 'Update Department'
            elif method == 'DELETE':
                return 'Delete Department'
            else:
                return 'View Departments'
        
        return f'{method} {path}'

class LoggingMiddleware(MiddlewareMixin):
    
    def process_exception(self, request, exception):
        try:
            user = request.user if request.user.is_authenticated else None
            SystemLog.objects.create(
                level='ERROR',
                log_type='SYSTEM',
                user=user,
                ip_address=request.META.get('REMOTE_ADDR'),
                action=f'Exception: {type(exception).__name__}',
                details={
                    'exception': str(exception),
                    'path': request.path,
                    'method': request.method
                }
            )
        except:
            pass
        
        return None