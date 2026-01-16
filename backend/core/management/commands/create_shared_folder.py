from django.core.management.base import BaseCommand
from pathlib import Path


class Command(BaseCommand):
    help = 'Ortak paylaşım klasörünü oluşturur'

    def handle(self, *args, **options):
        # Ortak klasör
        shared_folder = Path('D:/ooCloud/Paylasilan')
        
        try:
            # Ana klasörü oluştur
            shared_folder.mkdir(parents=True, exist_ok=True)
            
            # Alt klasörleri oluştur
            (shared_folder / 'Dosyalar').mkdir(exist_ok=True)
            (shared_folder / 'Fotograflar').mkdir(exist_ok=True)
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Ortak klasör oluşturuldu: {shared_folder}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  ├── Dosyalar')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  └── Fotograflar')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Hata: {e}')
            )
