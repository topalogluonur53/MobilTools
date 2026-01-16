from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter
from .views import FileItemViewSet, NoteViewSet, BrowseFilesystemView, BrowseSharedView, UploadSharedFileView, DeleteSharedFileView, ServeSharedFileView, CopySharedFileView, ThumbnailView

router = SimpleRouter(trailing_slash=False)
router.register(r'files', FileItemViewSet, basename='file')
router.register(r'notes', NoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
    path('browse', BrowseFilesystemView.as_view(), name='browse-filesystem'),
    path('browse/', BrowseFilesystemView.as_view(), name='browse-filesystem-slash'),
    path('browse-shared', BrowseSharedView.as_view(), name='browse-shared'),
    path('browse-shared/', BrowseSharedView.as_view(), name='browse-shared-slash'),
    path('upload-shared', UploadSharedFileView.as_view(), name='upload-shared'),
    path('delete-shared', DeleteSharedFileView.as_view(), name='delete-shared'),
    path('serve-shared', ServeSharedFileView.as_view(), name='serve-shared'),
    path('copy-shared', CopySharedFileView.as_view(), name='copy-shared'),
    path('thumbnail/<uuid:pk>', ThumbnailView.as_view(), name='thumbnail'),
]
