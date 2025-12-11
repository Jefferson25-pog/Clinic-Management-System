# authentication/serializers.py - COMPLETE FIXED VERSION
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework_simplejwt.tokens import RefreshToken
from adminapp.models import StaffDetail

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

# authentication/serializers.py - UPDATE UserSerializer
class UserSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    role = serializers.SerializerMethodField()
    staff_detail = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    has_staff_account = serializers.SerializerMethodField()
    custom_user_id = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'is_staff', 'is_superuser', 'is_active', 'date_joined', 
                  'last_login', 'groups', 'role', 'staff_detail', 
                  'has_staff_account', 'custom_user_id', 'profile']
        read_only_fields = ['is_staff', 'is_superuser', 'is_active', 
                          'date_joined', 'last_login', 'groups', 'role', 
                          'staff_detail', 'has_staff_account', 'custom_user_id', 'profile']
    
    def get_role(self, obj):
        try:
            # Priority 1: Super Admin
            if obj.is_superuser:
                return 'Super Admin'
            # Priority 2: Staff role from profile (MOST IMPORTANT)
            elif hasattr(obj, 'profile') and obj.profile.staff_detail:
                return obj.profile.staff_detail.Role
            # Priority 3: Admin user
            elif hasattr(obj, 'profile') and obj.profile.is_admin_user:
                return 'Admin'
            # Priority 4: Staff flag
            elif obj.is_staff:
                return 'Staff'
            # Priority 5: Group role
            elif obj.groups.exists():
                return obj.groups.first().name
            return 'User'
        except:
            return 'User'
    
    def get_staff_detail(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.staff_detail:
                staff = obj.profile.staff_detail
                return {
                    'staff_id': staff.STAFF_ID,
                    'name': staff.Name,
                    'role': staff.Role,
                    'email': staff.Email,
                    'phone': staff.Phone_Number,
                    'status': staff.Status,
                    'account_active': staff.account_active
                }
            return None
        except:
            return None
    
    def get_has_staff_account(self, obj):
        try:
            return hasattr(obj, 'profile') and obj.profile.staff_detail is not None
        except:
            return False
    
    def get_custom_user_id(self, obj):
        try:
            if hasattr(obj, 'profile'):
                return obj.profile.custom_user_id
        except:
            return None
    
    def get_profile(self, obj):
        try:
            if hasattr(obj, 'profile'):
                profile = obj.profile
                return {
                    'custom_user_id': profile.custom_user_id,
                    'user_type': profile.user_type,
                    'last_activity': profile.last_activity,
                    'created_at': profile.created_at,
                    'staff_detail_id': profile.staff_detail_id
                }
        except:
            return None

class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError('Invalid credentials')
        
        # Check user is active
        if not user.is_active:
            raise serializers.ValidationError('User account is inactive')
        
        # Admin users: superuser, staff, or admin profile
        if not (user.is_superuser or user.is_staff or 
                (hasattr(user, 'profile') and user.profile.is_admin_user)):
            raise serializers.ValidationError('Not authorized for admin access')
        
        # Don't allow staff users to use admin login
        if hasattr(user, 'profile') and user.profile.staff_detail:
            raise serializers.ValidationError('Staff users must use staff login')
        
        refresh = RefreshToken.for_user(user)
        
        data['user'] = user
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        
        return data

# authentication/serializers.py - ADD EXTRA VALIDATION
class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError('Invalid credentials')
        
        # Check user is active
        if not user.is_active:
            raise serializers.ValidationError('User account is inactive')
        
        # Check if user has profile
        if not hasattr(user, 'profile'):
            raise serializers.ValidationError('User profile not found. Please contact administrator.')
        
        # Check if user has staff profile
        if not user.profile.staff_detail:
            raise serializers.ValidationError('No staff profile linked to this user. Please contact administrator.')
        
        staff = user.profile.staff_detail
        
        # CRITICAL: Validate staff object
        if not staff:
            raise serializers.ValidationError('Staff profile exists but staff detail is empty')
        
        # Check if staff has Role attribute
        if not hasattr(staff, 'Role'):
            raise serializers.ValidationError('Staff role is not defined in database')
        
        if not staff.Role:
            raise serializers.ValidationError('Staff role is empty. Please contact administrator.')
        
        # Check staff account is active
        if not staff.account_active:
            raise serializers.ValidationError('Staff account is deactivated. Please contact administrator.')
        
        # IMPORTANT: Generate tokens
        try:
            refresh = RefreshToken.for_user(user)
            
            # Set data for view to handle
            data['user'] = user
            data['staff_detail'] = staff
            data['refresh'] = str(refresh)
            data['access'] = str(refresh.access_token)
            
            return data
            
        except Exception as e:
            raise serializers.ValidationError(f'Failed to generate authentication tokens: {str(e)}')

# authentication/serializers.py - UPDATE UserCreateSerializer
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    role = serializers.CharField(write_only=True, required=False, default='User')
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'role']
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"non_field_errors": ["Passwords do not match"]})
        
        if len(data['password']) < 8:
            raise serializers.ValidationError({"non_field_errors": ["Password must be at least 8 characters long"]})
        
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"non_field_errors": ["Username already exists"]})
        
        # Handle email validation - make it truly optional
        email = data.get('email', '').strip()
        
        if email:  # Only validate if email is provided and not empty
            # Validate email format
            if '@' not in email or '.' not in email:
                raise serializers.ValidationError({"email": ["Enter a valid email address."]})
            
            # Check if email exists (excluding empty strings)
            if User.objects.filter(email=email).exclude(email__in=['', None]).exists():
                raise serializers.ValidationError({"email": ["Email already exists."]})
        else:
            # Set to empty string if not provided
            data['email'] = ''
        
        role = data.get('role', 'User')
        valid_roles = ['Admin', 'Super Admin', 'Doctor', 'Receptionist', 
                      'Pharmacist', 'Lab Technician', 'Staff', 'User']
        if role not in valid_roles:
            raise serializers.ValidationError({"non_field_errors": [f"Invalid role. Must be one of: {', '.join(valid_roles)}"]})
        
        return data
    
    def create(self, validated_data):
        role = validated_data.pop('role', 'User')
        confirm_password = validated_data.pop('confirm_password')
        
        # Handle email - ensure it's empty string if not provided
        email = validated_data.get('email', '').strip()
        if not email:
            validated_data['email'] = ''
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],  # Will be empty string if not provided
            password=validated_data['password']
        )
        
        if role:
            try:
                group, created = Group.objects.get_or_create(name=role)
                user.groups.add(group)
                
                if role in ['Admin', 'Super Admin']:
                    user.is_staff = True
                    if role == 'Super Admin':
                        user.is_superuser = True
                    user.save()
            except Exception as e:
                # Log error but don't fail user creation
                print(f"Error adding group {role}: {e}")
        
        return user

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords don't match")
        
        if len(data['new_password']) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        return data

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user
        
        if user.is_superuser:
            role = "Super Admin"
        elif user.is_staff:
            role = "Admin"
        elif hasattr(user, 'profile') and user.profile.staff_detail:
            role = user.profile.staff_detail.Role
        elif user.groups.exists():
            role = user.groups.first().name
        else:
            role = "User"

        data["role"] = role
        data["is_superuser"] = user.is_superuser
        data["username"] = user.username
        data["email"] = user.email
        
        return data