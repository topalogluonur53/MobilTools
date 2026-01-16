from django.urls import path
from .views import LoginView, VerifyOTPView, RegisterView

urlpatterns = [
    path('auth/register', RegisterView.as_view(), name='register'),
    path('auth/register/', RegisterView.as_view(), name='register_slash'),
    path('auth/login', LoginView.as_view(), name='login'),
    path('auth/login/', LoginView.as_view(), name='login_slash'),
    path('auth/verify', VerifyOTPView.as_view(), name='verify'),
    path('auth/verify/', VerifyOTPView.as_view(), name='verify_slash'),
]
