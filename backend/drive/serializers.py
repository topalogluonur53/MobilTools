from rest_framework import serializers
from .models import FileItem, Note

class FileItemSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FileItem
        fields = ['id', 'filename', 'file_type', 'file', 'file_url', 'size', 'mime_type', 'created_at', 'updated_at', 'is_favorite']
        read_only_fields = ('id', 'user', 'size', 'created_at', 'updated_at', 'file_url')
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                # Cloudflare domain'ini kullan
                return f"https://mobil.onurtopaloglu.uk{obj.file.url}"
            return obj.file.url
        return None
    
    def create(self, validated_data):
        # Filename otomatik olarak ayarlanacak
        file_obj = validated_data.get('file')
        if file_obj and not validated_data.get('filename'):
            validated_data['filename'] = file_obj.name
        return super().create(validated_data)

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')
