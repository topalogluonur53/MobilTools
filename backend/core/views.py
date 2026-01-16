from rest_framework import views, status, response, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from .models import User, OTP
from .serializers import LoginSerializer, VerifyOTPSerializer, UserSerializer, RegisterSerializer
from django.utils import timezone
import os
from pathlib import Path

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Kullanıcı klasörü oluştur
            try:
                # Kullanıcı adını klasör adı olarak kullan
                folder_name = user.username or user.full_name.replace(' ', '_').upper()
                user_folder = Path(f'D:/ooCloud/{folder_name}')
                
                # user_folder alanını kaydet
                user.user_folder = folder_name
                user.save()
                
                # Ana klasörü oluştur
                user_folder.mkdir(parents=True, exist_ok=True)
                
                # Alt klasörleri oluştur
                (user_folder / 'Dosyalar').mkdir(exist_ok=True)
                (user_folder / 'Fotograflar').mkdir(exist_ok=True)
                
                print(f"✓ Kullanıcı klasörleri oluşturuldu: {user_folder}")
            except Exception as e:
                print(f"⚠ Klasör oluşturma hatası: {e}")
                # Klasör oluşturma hatası kullanıcı kaydını engellemez
            
            # Token üret
            refresh = RefreshToken.for_user(user)
            
            return response.Response({
                'message': 'Kayıt başarılı',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            password = serializer.validated_data.get('password')
            
            # Şifre zorunlu
            if not password:
                return response.Response(
                    {"error": "Şifre gereklidir"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # Kullanıcıyı telefon numarasına göre bul
                user = User.objects.filter(phone_number=phone_number).first()
                
                if not user:
                    return response.Response(
                        {"error": "Kullanıcı bulunamadı"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Şifre kontrolü
                if not user.check_password(password):
                    return response.Response(
                        {"error": "Hatalı şifre"},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                # Token üret ve döndür
                refresh = RefreshToken.for_user(user)
                return response.Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                return response.Response(
                    {"error": "Giriş yapılırken bir hata oluştu"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            code = serializer.validated_data['code']
            
            user = get_object_or_404(User, phone_number=phone_number)
            
            # OTP Kontrolü
            otp_record = OTP.objects.filter(
                user=user, 
                code=code, 
                is_used=False,
                expires_at__gt=timezone.now()
            ).last()
            
            if otp_record:
                otp_record.is_used = True
                otp_record.save()
                
                # Token üret
                refresh = RefreshToken.for_user(user)
                
                return response.Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                }, status=status.HTTP_200_OK)
            
            return response.Response({"error": "Geçersiz veya süresi dolmuş kod"}, status=status.HTTP_400_BAD_REQUEST)
        
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
