from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'phone_number', 'username', 'full_name', 'is_active', 'date_joined')
        read_only_fields = ('id', 'is_active', 'date_joined')

class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=100, required=True)
    phone_number = serializers.CharField(max_length=15, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=4)
    
    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Bu telefon numarası zaten kullanılıyor")
        return value
    
    def create(self, validated_data):
        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            password=validated_data['password'],
            full_name=validated_data['full_name']
        )
        # Username'i full_name'den oluştur (boşlukları _ ile değiştir)
        user.username = validated_data['full_name'].replace(' ', '_').upper()
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    password = serializers.CharField(required=True, write_only=True)

class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=6)
