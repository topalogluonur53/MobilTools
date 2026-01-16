from rest_framework import viewsets, permissions, parsers, views, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import FileItem, Note
from .serializers import FileItemSerializer, NoteSerializer
import os
from django.conf import settings
from pathlib import Path
from django.utils import timezone
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
from PIL import Image
from io import BytesIO
import mimetypes

class FileItemViewSet(viewsets.ModelViewSet):
    serializer_class = FileItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        qs = FileItem.objects.filter(user=self.request.user).order_by('-created_at')
        if self.request.query_params.get('trash') == 'true':
            return qs.filter(trashed_at__isnull=False)
        return qs.filter(trashed_at__isnull=True)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        item = self.get_object()
        user_folder = request.user.get_user_folder()
        
        # Klasör isimleri
        base_folder_name = 'Fotograflar' if item.file_type == 'PHOTO' else 'Dosyalar'
        base_path = os.path.join(settings.MEDIA_ROOT, user_folder, base_folder_name)
        fav_path = os.path.join(base_path, 'Favoriler')
        
        current_full_path = item.file.path
        filename = os.path.basename(current_full_path)
        
        # Hedef durum
        target_fav_status = not item.is_favorite
        
        try:
            if target_fav_status:
                # Favoriye Ekle -> Taşı: Ana -> Favoriler
                if not os.path.exists(fav_path):
                    os.makedirs(fav_path)
                dest_path = os.path.join(fav_path, filename)
                new_relative_path = os.path.join(user_folder, base_folder_name, 'Favoriler', filename).replace('\\', '/')
            else:
                # Favoriden Çıkar -> Taşı: Favoriler -> Ana
                dest_path = os.path.join(base_path, filename)
                new_relative_path = os.path.join(user_folder, base_folder_name, filename).replace('\\', '/')
            
            # Dosya fiziksel olarak var mı?
            if os.path.exists(current_full_path):
                # Hedefte dosya yoksa taşı
                if not os.path.exists(dest_path):
                    os.rename(current_full_path, dest_path)
                
                # DB Path Güncelle
                item.file = new_relative_path
                item.is_favorite = target_fav_status
                item.save()
                return Response({'status': 'success', 'is_favorite': item.is_favorite})
            else:
                 # Dosya yoksa sadece flag güncelle
                 item.is_favorite = target_fav_status
                 item.save()
                 return Response({'status': 'success', 'is_favorite': item.is_favorite})
                 
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=400)

    def destroy(self, request, *args, **kwargs):
        try:
            item = self.get_object()
        except:
            return Response(status=status.HTTP_404_NOT_FOUND)
        
        # Hard Delete
        if item.trashed_at:
             if item.file and os.path.exists(item.file.path):
                 os.remove(item.file.path)
             item.delete()
             return Response(status=status.HTTP_204_NO_CONTENT)
        
        # Soft Delete
        try:
             user_folder = request.user.get_user_folder()
             base_folder_name = 'Fotograflar' if item.file_type == 'PHOTO' else 'Dosyalar'
             
             current_path = item.file.path
             filename = os.path.basename(current_path)
             
             trash_dir = os.path.join(settings.MEDIA_ROOT, user_folder, base_folder_name, 'CopKutusu')
             if not os.path.exists(trash_dir): os.makedirs(trash_dir)
             
             new_path = os.path.join(trash_dir, filename)
             new_rel_path = os.path.join(user_folder, base_folder_name, 'CopKutusu', filename).replace('\\', '/')
             
             if os.path.exists(current_path):
                 if not os.path.exists(new_path):
                     os.rename(current_path, new_path)
             
             item.file = new_rel_path
             item.trashed_at = timezone.now()
             item.is_favorite = False
             item.save()
             return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
             return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        item = self.get_object()
        if not item.trashed_at:
             return Response({'status': 'ignored'})
             
        user_folder = request.user.get_user_folder()
        base_folder_name = 'Fotograflar' if item.file_type == 'PHOTO' else 'Dosyalar'
        
        base_path = os.path.join(settings.MEDIA_ROOT, user_folder, base_folder_name)
        current_path = item.file.path
        filename = os.path.basename(current_path)
        
        dest_path = os.path.join(base_path, filename)
        new_rel_path = os.path.join(user_folder, base_folder_name, filename).replace('\\', '/')
        
        if os.path.exists(current_path):
             if not os.path.exists(dest_path):
                 os.rename(current_path, dest_path)
        
        item.file = new_rel_path
        item.trashed_at = None
        item.save()
        return Response({'status': 'restored'})

    def list(self, request, *args, **kwargs):
        # Listeleme isteği geldiğinde önce dosya sistemini tara ve eşitle
        try:
            self.sync_filesystem(request.user)
            return super().list(request, *args, **kwargs)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    def sync_filesystem(self, user):
        """
        Kullanıcının kendi klasöründeki dosyaları tarar (Ana, Favoriler, Çöp Kutusu).
        30 günden eski çöpleri siler.
        """
        media_root = settings.MEDIA_ROOT
        user_folder_name = user.get_user_folder()
        
        # 0. Çöp Temizliği
        cleanup_time = timezone.now() - timedelta(days=30)
        old_trash = FileItem.objects.filter(user=user, trashed_at__lt=cleanup_time)
        for t in old_trash:
            if t.file and os.path.exists(t.file.path):
                os.remove(t.file.path)
            t.delete()

        folders = {
            'FILE': 'Dosyalar',
            'PHOTO': 'Fotograflar'
        }

        for file_type, folder_name in folders.items():
            base_path = os.path.join(media_root, user_folder_name, folder_name)
            fav_path = os.path.join(base_path, 'Favoriler')
            trash_path = os.path.join(base_path, 'CopKutusu')
            
            for p in [base_path, fav_path, trash_path]:
                if not os.path.exists(p):
                    try: os.makedirs(p)
                    except: pass
            
            # --- 1. Fiziksel Taramalar ---
            def scan_dir(path):
                try: return {f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))}
                except: return set()

            main_files = scan_dir(base_path)
            fav_files = scan_dir(fav_path)
            trash_files = scan_dir(trash_path)
            
            # --- 2. DB Map ---
            existing_qs = FileItem.objects.filter(user=user, file_type=file_type)
            db_items_map = {}
            for item in existing_qs:
                if item.file:
                    fname = os.path.basename(item.file.name)
                    db_items_map[fname] = item

            # --- 3. Sync Logic ---
            
            # Helper: Create or Update
            def sync_item(fname, full_path, rel_path, is_fav=False, is_trash=False):
                if fname not in db_items_map:
                    try: size = os.path.getsize(full_path)
                    except: size = 0
                    FileItem.objects.create(
                        user=user, file=rel_path, filename=fname, file_type=file_type, size=size,
                        is_favorite=is_fav, trashed_at=timezone.now() if is_trash else None
                    )
                else:
                    item = db_items_map[fname]
                    needs_save = False
                    
                    if item.file.name != rel_path:
                        item.file = rel_path
                        needs_save = True
                    
                    if is_trash and not item.trashed_at:
                        item.trashed_at = timezone.now()
                        needs_save = True
                    elif not is_trash and item.trashed_at:
                        item.trashed_at = None
                        needs_save = True
                        
                    if is_fav != item.is_favorite:
                        item.is_favorite = is_fav
                        needs_save = True
                        
                    if needs_save: item.save()

            # Sync each folder
            for f in main_files:
                rel = os.path.join(user_folder_name, folder_name, f).replace('\\', '/')
                sync_item(f, os.path.join(base_path, f), rel, is_fav=False, is_trash=False)

            for f in fav_files:
                rel = os.path.join(user_folder_name, folder_name, 'Favoriler', f).replace('\\', '/')
                sync_item(f, os.path.join(fav_path, f), rel, is_fav=True, is_trash=False)

            for f in trash_files:
                rel = os.path.join(user_folder_name, folder_name, 'CopKutusu', f).replace('\\', '/')
                sync_item(f, os.path.join(trash_path, f), rel, is_fav=False, is_trash=True)
            
            # --- 4. Delete Orphans ---
            all_physical = main_files.union(fav_files).union(trash_files)
            for fname, item in db_items_map.items():
                if fname not in all_physical:
                    item.delete()

class BrowseFilesystemView(views.APIView):
    """
    Kullanıcının kendi klasöründeki dosya ve klasörleri listeler
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Query parametreden path al, yoksa root
        relative_path = request.query_params.get('path', '')
        
        # Kullanıcının klasör adını al
        user_folder_name = request.user.get_user_folder()
        
        # Base directory - Kullanıcıya özel
        base_dir = Path(f'D:/ooCloud/{user_folder_name}')
        
        # Güvenlik: Path traversal saldırılarını önle
        try:
            if relative_path:
                target_path = (base_dir / relative_path).resolve()
            else:
                target_path = base_dir.resolve()
                
            # Hedef path base_dir içinde mi kontrol et
            if not str(target_path).startswith(str(base_dir.resolve())):
                return Response(
                    {'error': 'Geçersiz path'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': 'Geçersiz path'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Klasör yoksa oluştur
        if not target_path.exists():
            try:
                target_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                return Response(
                    {'error': f'Klasör oluşturulamadı: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Klasör değilse hata
        if not target_path.is_dir():
            return Response(
                {'error': 'Belirtilen path bir klasör değil'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # İçeriği listele
        items = []
        try:
            for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                item_info = {
                    'name': item.name,
                    'is_dir': item.is_dir(),
                    'path': str(item.relative_to(base_dir)).replace('\\', '/'),
                }
                
                if item.is_file():
                    try:
                        item_info['size'] = item.stat().st_size
                        item_info['modified'] = item.stat().st_mtime
                        
                        # Dosya uzantısına göre tip belirle
                        ext = item.suffix.lower()
                        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
                            item_info['type'] = 'image'
                        elif ext in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
                            item_info['type'] = 'video'
                        elif ext in ['.pdf']:
                            item_info['type'] = 'pdf'
                        elif ext in ['.doc', '.docx', '.txt', '.rtf']:
                            item_info['type'] = 'document'
                        elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz']:
                            item_info['type'] = 'archive'
                        else:
                            item_info['type'] = 'file'
                    except Exception:
                        item_info['size'] = 0
                        item_info['modified'] = 0
                        item_info['type'] = 'file'
                
                items.append(item_info)
        except Exception as e:
            return Response(
                {'error': f'Klasör okunamadı: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Mevcut path bilgisi
        current_path = str(target_path.relative_to(base_dir)).replace('\\', '/') if target_path != base_dir else ''
        parent_path = str(target_path.parent.relative_to(base_dir)).replace('\\', '/') if target_path != base_dir else None
        
        return Response({
            'current_path': current_path,
            'parent_path': parent_path,
            'items': items
        })

class BrowseSharedView(views.APIView):
    """
    Ortak paylaşım klasörünü listeler - Tüm kullanıcılar erişebilir
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Query parametreden path al, yoksa root
        relative_path = request.query_params.get('path', '')
        
        # Base directory - Ortak klasör
        base_dir = Path('D:/ooCloud/Paylasilan')
        
        # Güvenlik: Path traversal saldırılarını önle
        try:
            if relative_path:
                target_path = (base_dir / relative_path).resolve()
            else:
                target_path = base_dir.resolve()
                
            # Hedef path base_dir içinde mi kontrol et
            if not str(target_path).startswith(str(base_dir.resolve())):
                return Response(
                    {'error': 'Geçersiz path'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': 'Geçersiz path'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Klasör yoksa oluştur
        if not target_path.exists():
            try:
                target_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                return Response(
                    {'error': f'Klasör oluşturulamadı: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Klasör değilse hata
        if not target_path.is_dir():
            return Response(
                {'error': 'Belirtilen path bir klasör değil'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # İçeriği listele
        items = []
        try:
            for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                item_info = {
                    'name': item.name,
                    'is_dir': item.is_dir(),
                    'path': str(item.relative_to(base_dir)).replace('\\', '/'),
                }
                
                if item.is_file():
                    try:
                        item_info['size'] = item.stat().st_size
                        item_info['modified'] = item.stat().st_mtime
                        
                        # Dosya uzantısına göre tip belirle
                        ext = item.suffix.lower()
                        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
                            item_info['type'] = 'image'
                        elif ext in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
                            item_info['type'] = 'video'
                        elif ext in ['.pdf']:
                            item_info['type'] = 'pdf'
                        elif ext in ['.doc', '.docx', '.txt', '.rtf']:
                            item_info['type'] = 'document'
                        elif ext in ['.zip', '.rar', '.7z', '.tar', '.gz']:
                            item_info['type'] = 'archive'
                        else:
                            item_info['type'] = 'file'
                    except Exception:
                        item_info['size'] = 0
                        item_info['modified'] = 0
                        item_info['type'] = 'file'
                
                items.append(item_info)
        except Exception as e:
            return Response(
                {'error': f'Klasör okunamadı: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Mevcut path bilgisi
        current_path = str(target_path.relative_to(base_dir)).replace('\\', '/') if target_path != base_dir else ''
        parent_path = str(target_path.parent.relative_to(base_dir)).replace('\\', '/') if target_path != base_dir else None
        
        return Response({
            'current_path': current_path,
            'parent_path': parent_path,
            'items': items
        })


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UploadSharedFileView(views.APIView):
    """
    Ortak klasöre dosya yükler (Veritabanına kaydetmez, fiziksel yükler)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        file_type = request.data.get('file_type', 'FILE') # 'FILE' or 'PHOTO'
        
        if not file_obj:
            return Response({'error': 'Dosya bulunamadı'}, status=400)

        # Hedef klasör - Direkt Paylasilan klasörü
        base_dir = Path('D:/ooCloud/Paylasilan')
        target_dir = base_dir
            
        # Klasör yoksa oluştur
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            return Response({'error': f'Klasör oluşturulamadı: {e}'}, status=500)
        
        # Dosya adı çakışmasını önle
        filename = file_obj.name
        file_path = target_dir / filename
        
        # Eğer dosya varsa sonuna timestamp ekle
        if file_path.exists():
            import time
            timestamp = int(time.time())
            stem = file_path.stem
            suffix = file_path.suffix
            filename = f"{stem}_{timestamp}{suffix}"
            file_path = target_dir / filename

        # Dosyayı kaydet
        try:
            with open(file_path, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)
            
            return Response({'status': 'success', 'filename': filename})
        except Exception as e:
            return Response({'error': f'Yükleme hatası: {str(e)}'}, status=500)


class DeleteSharedFileView(views.APIView):
    """
    Paylaşılan dosyayı/klasörü siler
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        path_param = request.query_params.get('path')
        if not path_param:
            return Response({'error': 'Path belirtilmedi'}, status=400)
            
        base_dir = Path('D:/ooCloud/Paylasilan')
        
        # Güvenlik: Path traversal önlemi
        try:
            target_path = (base_dir / path_param).resolve()
            if not str(target_path).startswith(str(base_dir.resolve())):
                 return Response({'error': 'Geçersiz path'}, status=400)
        except:
             return Response({'error': 'Geçersiz path'}, status=400)
             
        if not target_path.exists():
            return Response({'error': 'Dosya bulunamadı'}, status=404)
            
        try:
            if target_path.is_dir():
                import shutil
                shutil.rmtree(target_path)
            else:
                target_path.unlink()
            return Response({'status': 'deleted'})
        except Exception as e:
            return Response({'error': f'Silme hatası: {str(e)}'}, status=500)

class ServeSharedFileView(views.APIView):
    """
    Paylaşılan dosyayı sunar (İndirme/Görüntüleme)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        path_param = request.query_params.get('path')
        if not path_param:
            return Response({'error': 'Path belirtilmedi'}, status=400)

        base_dir = Path('D:/ooCloud/Paylasilan')
        
        try:
            target_path = (base_dir / path_param).resolve()
            if not str(target_path).startswith(str(base_dir.resolve())):
                 return Response({'error': 'Geçersiz path'}, status=400)
        except:
             return Response({'error': 'Geçersiz path'}, status=400)

        if not target_path.exists() or not target_path.is_file():
             return Response({'error': 'Dosya bulunamadı'}, status=404)

        from django.http import FileResponse
        try:
            response = FileResponse(open(target_path, 'rb'))
            response['Content-Disposition'] = f'attachment; filename="{target_path.name}"'
            return response
        except Exception as e:
            return Response({'error': f'Dosya okuma hatası: {str(e)}'}, status=500)

class CopySharedFileView(views.APIView):
    """
    Paylaşılan dosyayı kullanıcının kendi alanına kopyalar
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        path_param = request.data.get('path')
        if not path_param:
            return Response({'error': 'Path belirtilmedi'}, status=400)

        base_dir = Path('D:/ooCloud/Paylasilan')
        
        try:
            source_path = (base_dir / path_param).resolve()
            if not str(source_path).startswith(str(base_dir.resolve())):
                 return Response({'error': 'Geçersiz path'}, status=400)
        except:
             return Response({'error': 'Geçersiz path'}, status=400)

        if not source_path.exists() or not source_path.is_file():
             return Response({'error': 'Dosya bulunamadı'}, status=404)
        
        # Dosya türünü belirle (Basitçe uzantıya göre)
        is_photo = source_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic']
        file_type = 'PHOTO' if is_photo else 'FILE'

        try:
            from django.core.files import File
            # Dosyayı okuyup yeni bir FileItem oluşturuyoruz.
            # Django'nun File objesi otomatik olarak user_directory_path'e (Dosyalar/ veya Fotograflar/) kaydedecek.
            with open(source_path, 'rb') as f:
                file_item = FileItem(
                    user=request.user,
                    filename=source_path.name,
                    file_type=file_type,
                    file_size=source_path.stat().st_size
                )
                # save=True ile dosyayı fiziksel olarak kopyalar ve veritabanına yazar
                file_item.file.save(source_path.name, File(f), save=True)

            return Response({'status': 'success', 'message': 'Dosya başarıyla kopyalandı'})

        except Exception as e:
            return Response({'error': f'Kopyalama hatası: {str(e)}'}, status=500)

class ThumbnailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None):
        try:
            file_item = FileItem.objects.get(pk=pk, user=request.user)
            if file_item.file_type != 'PHOTO':
                 return Response(status=404)
            
            file_path = file_item.file.path
            if not os.path.exists(file_path):
                 return Response(status=404)

            try:
                img = Image.open(file_path)
                img.thumbnail((400, 400)) 
                
                buffer = BytesIO()
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                    
                img.save(buffer, format='JPEG', quality=60)
                buffer.seek(0)
                return HttpResponse(buffer, content_type='image/jpeg')
            except Exception as e:
                print(f"Thumb Error: {e}")
                return Response(status=500)
            
        except FileItem.DoesNotExist:
            return Response(status=404)
        except Exception as e:
            return Response(status=500)
