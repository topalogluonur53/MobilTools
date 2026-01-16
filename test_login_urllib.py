
import urllib.request
import json
import urllib.error

url = "http://localhost:8001/api/core/auth/login/"
payload = {
    "phone_number": "5368977153",
    "password": "12345"
}
data = json.dumps(payload).encode('utf-8')
headers = {
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, data=data, headers=headers)

try:
    print(f"Sending POST request to {url}...")
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print("Response Body:")
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
