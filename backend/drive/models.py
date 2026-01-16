from django.db import models
from django.conf import settings
import uuid
import os

def user_directory_path(instance, filename):
    # Kullanıcının klasör adını al
    user_folder = instance.user.get_user_folder()
    
    # Dosya tipine göre alt klasör belirle
    folder = 'Dosyalar'
    if instance.file_type == 'PHOTO':
        folder = 'Fotograflar'
    
    # D:\ooCloud\KULLANICI_ADI\Dosyalar\filename
    # D:\ooCloud\KULLANICI_ADI\Fotograflar\filename
    return os.path.join(user_folder, folder, filename)

class FileItem(models.Model):
    FILE_TYPES = (
        ('FILE', 'Genel Dosya'),
        ('PHOTO', 'Fotoğraf'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to=user_directory_path)
    filename = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=10, choices=FILE_TYPES, default='FILE')
    size = models.PositiveIntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_favorite = models.BooleanField(default=False)
    trashed_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if self.file:
            self.size = self.file.size
            if not self.filename:
                self.filename = self.file.name
        super().save(*args, **kwargs)

    def __str__(self):
        return self.filename

class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=200, blank=True, default="Adsız Not")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
