import urllib.request
import urllib.parse
import sys

def trigger_call(name="Sarah", number="+971 50 123 4567", host="http://localhost:8000"):
    url = f"{host}/api/calls/simulate_incoming?name={urllib.parse.quote(name)}&number={urllib.parse.quote(number)}"
    req = urllib.request.Request(url, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[Simulate Call] Response {resp.status}: {resp.read().decode()}")
    except Exception as e:
        print(f"[Simulate Call] Failed: {e}")

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "Sarah"
    number = sys.argv[2] if len(sys.argv) > 2 else "+971 50 123 4567"
    trigger_call(name, number)
