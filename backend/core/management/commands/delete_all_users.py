from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Tüm kullanıcıları siler (superuser hariç)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Superuser dahil TÜM kullanıcıları sil',
        )

    def handle(self, *args, **options):
        if options['all']:
            # TÜM kullanıcıları sil
            count = User.objects.all().count()
            User.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ {count} kullanıcı silindi (superuser dahil)!')
            )
        else:
            # Sadece normal kullanıcıları sil (superuser kalsın)
            count = User.objects.filter(is_superuser=False).count()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ {count} kullanıcı silindi (superuser korundu)!')
            )
