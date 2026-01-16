from django.core.management.base import BaseCommand
from core.models import User
from pathlib import Path


class Command(BaseCommand):
    help = 'Mevcut kullanıcılar için user_folder alanını doldurur ve klasörleri oluşturur'

    def handle(self, *args, **options):
        users = User.objects.filter(user_folder='')
        
        for user in users:
            # Klasör adını oluştur
            folder_name = user.username or user.full_name.replace(' ', '_').upper()
            
            # user_folder alanını güncelle
            user.user_folder = folder_name
            user.save()
            
            # Klasörleri oluştur
            try:
                user_folder = Path(f'D:/ooCloud/{folder_name}')
                user_folder.mkdir(parents=True, exist_ok=True)
                (user_folder / 'Dosyalar').mkdir(exist_ok=True)
                (user_folder / 'Fotograflar').mkdir(exist_ok=True)
                
                self.stdout.write(
                    self.style.SUCCESS(f'✓ {user.full_name or user.phone_number}: {folder_name}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ {user.full_name or user.phone_number}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'\n✓ {users.count()} kullanıcı güncellendi!')
        )
