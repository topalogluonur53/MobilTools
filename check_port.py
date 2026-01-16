
import socket
import sys

def check_port(host, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    try:
        result = s.connect_ex((host, port))
        if result == 0:
            print(f"Port {port} on {host} is OPEN.")
        else:
            print(f"Port {port} on {host} is CLOSED (Code: {result}).")
    except Exception as e:
        print(f"Error checking port: {e}")
    finally:
        s.close()

if __name__ == "__main__":
    check_port("127.0.0.1", 8001)
