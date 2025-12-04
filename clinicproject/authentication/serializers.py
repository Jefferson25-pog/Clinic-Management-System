from rest_framework import serializers
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate
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
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'groups', 'role', 'staff_detail']
        read_only_fields = ['is_staff', 'is_superuser']
    
    def get_role(self, obj):
        try:
            if obj.is_superuser:
                return 'Super Admin'
            elif hasattr(obj, 'staff_detail') and obj.staff_detail:
                return obj.staff_detail.Role
            elif hasattr(obj, 'profile') and obj.profile.is_admin_user:
                return 'Admin'
            return 'User'
        except:
            return 'User'
    
    def get_staff_detail(self, obj):
        try:
            if hasattr(obj, 'staff_detail') and obj.staff_detail:
                return StaffDetailsSerializer(obj.staff_detail).data
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
        
        if not hasattr(user, 'staff_detail') or user.staff_detail is None:
            raise serializers.ValidationError('No staff profile found')
        
        if user.staff_detail.Status not in ['Available', 'Busy']:
            raise serializers.ValidationError('Staff account is not active')
        
        refresh = RefreshToken.for_user(user)
        
        data['user'] = user
        data['staff_detail'] = user.staff_detail
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        
        return data

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
    
    def create(self, validated_data):
        role = validated_data.pop('role', 'User')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        group, created = Group.objects.get_or_create(name=role)
        user.groups.add(group)
        
        if role == 'Admin':
            user.is_staff = True
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
    
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user
        staff = getattr(user, "staff_detail", None)

        # Define role
        if user.is_superuser:
            role = "Admin"
        elif staff:
            role = staff.Role
        else:
            role = None

        data["role"] = role
        data["is_superuser"] = user.is_superuser

        return data
