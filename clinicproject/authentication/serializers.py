# authentication/serializers.py - FIXED ROLE ASSIGNMENT
from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework_simplejwt.tokens import RefreshToken
from adminapp.models import StaffDetail
from adminapp.serializers import StaffDetailsSerializer

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    role = serializers.SerializerMethodField()
    staff_detail = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    has_staff_account = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'is_staff', 'is_superuser', 'is_active', 'date_joined', 
                  'last_login', 'groups', 'role', 'staff_detail', 'has_staff_account']
        read_only_fields = ['is_staff', 'is_superuser', 'is_active', 
                          'date_joined', 'last_login', 'groups', 'role', 
                          'staff_detail', 'has_staff_account']
    
    def get_role(self, obj):
        try:
            if obj.is_superuser:
                return 'Super Admin'
            elif hasattr(obj, 'profile') and obj.profile.staff_detail:
                return obj.profile.staff_detail.Role
            elif hasattr(obj, 'profile') and obj.profile.is_admin_user:
                return 'Admin'
            elif obj.is_staff:
                return 'Staff'
            # Check groups for role
            elif obj.groups.exists():
                return obj.groups.first().name
            return 'User'
        except Exception as e:
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

class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError('Invalid credentials')
        
        if not (user.is_superuser or user.is_staff or 
                (hasattr(user, 'profile') and user.profile.is_admin_user)):
            raise serializers.ValidationError('Not authorized for admin access')
        
        refresh = RefreshToken.for_user(user)
        
        data['user'] = user
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        
        return data

class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise serializers.ValidationError('Invalid credentials')
        
        if not (hasattr(user, 'profile') and user.profile.staff_detail):
            raise serializers.ValidationError('No staff profile found')
        
        staff = user.profile.staff_detail
        if staff.Status not in ['Available', 'Busy']:
            raise serializers.ValidationError('Staff account is not active')
        
        refresh = RefreshToken.for_user(user)
        
        data['user'] = user
        data['staff_detail'] = staff
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        
        return data

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    role = serializers.CharField(write_only=True, required=False, default='User')
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'role']
    
    def validate(self, data):
        # Check if passwords match
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        
        # Check password strength
        if len(data['password']) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        # Check if username exists
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError("Username already exists")
        
        # Check if email exists
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError("Email already exists")
        
        # Validate role
        role = data.get('role', 'User')
        valid_roles = ['Admin', 'Super Admin', 'Doctor', 'Receptionist', 
                      'Pharmacist', 'Lab Technician', 'Staff', 'User']
        if role not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        return data
    
    def create(self, validated_data):
        role = validated_data.pop('role', 'User')
        confirm_password = validated_data.pop('confirm_password')
        
        # Create the user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Assign role based on group
        if role:
            # Get or create the group
            group, created = Group.objects.get_or_create(name=role)
            user.groups.add(group)
            
            # Handle Admin and Super Admin roles
            if role in ['Admin', 'Super Admin']:
                user.is_staff = True
                if role == 'Super Admin':
                    user.is_superuser = True
                user.save()
        
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

class PasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user
        staff = None
        
        if hasattr(user, 'profile'):
            staff = user.profile.staff_detail

        # Define role from groups first, then other attributes
        if user.groups.exists():
            role = user.groups.first().name
        elif user.is_superuser:
            role = "Super Admin"
        elif user.is_staff:
            role = "Staff"
        elif staff:
            role = staff.Role
        else:
            role = "User"

        data["role"] = role
        data["is_superuser"] = user.is_superuser
        data["username"] = user.username
        data["email"] = user.email
        
        # Add staff info if exists
        if staff:
            data["staff_id"] = staff.STAFF_IDA
            data["staff_name"] = staff.Name

        return data