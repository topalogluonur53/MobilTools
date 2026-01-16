
import requests
import os

# BASE_URL = "http://localhost:8001"
BASE_URL = "https://mobil.onurtopaloglu.uk" # Production url

# 1. Login to get token
login_url = f"{BASE_URL}/api/core/auth/login"
login_payload = {
    "phone_number": "ibrahim", # Assuming 'ibrahim' is a valid user phone_number/username
    "password": "12345"
}

print(f"Logging in to {login_url}...")
try:
    response = requests.post(login_url, json=login_payload)
    if response.status_code == 200:
        token = response.json().get('access')
        refresh = response.json().get('refresh')
        print(f"Login successful. Token: {token[:10]}...")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        exit()
except Exception as e:
    print(f"Connection error: {e}")
    exit()

# 2. Upload File
upload_url = f"{BASE_URL}/api/drive/files"
headers = {
    "Authorization": f"Bearer {token}"
}

# Create a dummy file
with open("test_upload.txt", "w") as f:
    f.write("This is a test file upload from python script.")

files = {
    "file": ("test_upload.txt", open("test_upload.txt", "rb"), "text/plain")
}
data = {
    "file_type": "FILE" # or PHOTO
}

print(f"Uploading file to {upload_url}...")
try:
    response = requests.post(upload_url, headers=headers, files=files, data=data)
    
    if response.status_code == 201:
        print("Upload successful!")
        print(response.json())
    else:
        print(f"Upload failed: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Upload error: {e}")
except Exception as e:
    print(f"Upload error: {e}")
