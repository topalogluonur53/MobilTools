from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
import random
import uuid

class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('Telefon numarası zorunludur')
        user = self.model(phone_number=phone_number, **extra_fields)
        # Şifre kullanılmayacak ama Django'nun built-in auth sistemi için set_unusable_password çağrılabilir
        # Ancak admin girişi için password gerekebilir, bu yüzden set_password opsiyonel bırakalım.
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(phone_number, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=15, unique=True, verbose_name="Telefon Numarası")
    username = models.CharField(max_length=50, blank=True, null=True, unique=True, verbose_name="Kullanıcı Adı")
    full_name = models.CharField(max_length=100, blank=True, verbose_name="Ad Soyad")
    user_folder = models.CharField(max_length=255, blank=True, verbose_name="Kullanıcı Klasörü")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.phone_number
    
    def get_user_folder(self):
        """Kullanıcının klasör adını döndürür"""
        if self.user_folder:
            return self.user_folder
        # Fallback: username veya full_name'den oluştur
        return self.username or self.full_name.replace(' ', '_').upper()

class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    @classmethod
    def generate(cls, user):
        # 6 haneli kod üret
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        # 120 saniye geçerlilik
        expires_at = timezone.now() + timezone.timedelta(seconds=120)
        return cls.objects.create(user=user, code=code, expires_at=expires_at)
