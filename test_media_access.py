
import urllib.request
import urllib.parse

# Construct URL
# Note: ONUR_TOPALOĞLU must be percent encoded.
# Python's quote handles utf-8 encoding by default.
path_part = urllib.parse.quote("ONUR_TOPALOĞLU/Fotograflar/IMG_5042.DNG")
url = f"http://127.0.0.1:8001/media/{path_part}"

print(f"Testing URL: {url}")

try:
    with urllib.request.urlopen(url) as response:
        print(f"Status: {response.getcode()}")
        # Read a small chunk to verify
        chunk = response.read(1024)
        print(f"Read {len(chunk)} bytes successfully.")
except Exception as e:
    print(f"Error: {e}")
