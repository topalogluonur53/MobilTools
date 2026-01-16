
import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

phone = "5368977153"
password = "12345"

try:
    user = User.objects.get(phone_number=phone)
    print(f"User {phone} found. Resetting password...")
    user.set_password(password)
    user.save()
    print("Password updated successfully.")
except User.DoesNotExist:
    print(f"User {phone} does not exist. Creating...")
    # Try to create with a username if required logic exists elsewhere, but model allows blank
    user = User.objects.create_user(phone_number=phone, password=password)
    user.save()
    print("User created successfully.")
except Exception as e:
    print(f"An error occurred: {e}")

# Verify authentication
from django.contrib.auth import authenticate
try:
    user = authenticate(username=phone, password=password)
    if user:
        print("Authentication check PASSED.")
    else:
        print("Authentication check FAILED.")
except Exception as e:
    print(f"Authentication error: {e}")
