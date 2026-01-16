
import requests
import json

url = "http://localhost:8001/api/core/auth/login/"
payload = {
    "phone_number": "5368977153",
    "password": "12345"
}
headers = {
    "Content-Type": "application/json"
}

try:
    print(f"Sending POST request to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
