from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Test kullanıcıları oluşturur'

    def handle(self, *args, **options):
        # Test kullanıcıları
        test_users = [
            {'phone_number': 'ibrahim', 'password': '12345', 'full_name': 'İbrahim', 'username': 'ibrahim'},
            {'phone_number': 'ercan', 'password': '12345', 'full_name': 'Ercan', 'username': 'ercan'},
            {'phone_number': 'onur', 'password': '12345', 'full_name': 'Onur', 'username': 'onur'},
        ]

        for user_data in test_users:
            phone = user_data['phone_number']
            username = user_data.get('username')
            
            # Kullanıcı zaten varsa atla (telefon veya username'e göre)
            if User.objects.filter(phone_number=phone).exists():
                self.stdout.write(
                    self.style.WARNING(f'Kullanıcı zaten mevcut (telefon): {phone}')
                )
                continue
            
            if username and User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'Kullanıcı zaten mevcut (username): {username}')
                )
                continue
            
            # Yeni kullanıcı oluştur
            user = User.objects.create_user(
                phone_number=phone,
                password=user_data['password'],
                full_name=user_data['full_name']
            )
            
            # Username varsa ekle
            if 'username' in user_data:
                user.username = user_data['username']
                user.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Kullanıcı oluşturuldu: {phone} (Şifre: {user_data["password"]})')
            )
        
        self.stdout.write(
            self.style.SUCCESS('\n✓ Tüm test kullanıcıları hazır!')
        )
