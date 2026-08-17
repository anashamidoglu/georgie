import urllib.request
import sys

def trigger_track_action(action="next", host="http://localhost:8000"):
    url = f"{host}/api/media/{action}"
    req = urllib.request.Request(url, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[Simulate Track {action}] Response {resp.status}: {resp.read().decode()}")
    except Exception as e:
        print(f"[Simulate Track {action}] Failed: {e}")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "next"
    trigger_track_action(action)
