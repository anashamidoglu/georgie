from fastapi import APIRouter
import os
import platform
import asyncio
import socket

router = APIRouter(prefix="/api/system", tags=["system"])

async def check_internet_connectivity(host="1.1.1.1", port=53, timeout=1.5) -> bool:
    """
    Fast, non-blocking check for actual external internet connectivity.
    """
    loop = asyncio.get_running_loop()
    try:
        def _check():
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(timeout)
                s.connect((host, port))
                s.close()
                return True
            except OSError:
                return False
        return await loop.run_in_executor(None, _check)
    except Exception:
        return False

@router.get("/status")
async def get_system_status():
    """
    Returns live network, Bluetooth, and system status.
    """
    is_online = await check_internet_connectivity()
    return {
        "is_online": is_online,
        "platform": platform.system(),
        "status": "ready"
    }

@router.post("/shutdown")
async def trigger_shutdown():
    """
    Executes clean system shutdown. Syncs disks and powers down Raspberry Pi.
    """
    is_linux = platform.system().lower() == "linux"
    if is_linux:
        asyncio.create_task(_delayed_shutdown())
        return {"status": "shutting_down", "message": "System will power off in 3 seconds"}
    else:
        return {"status": "mock_shutdown", "message": "Simulated shutdown on non-Linux platform"}

async def _delayed_shutdown():
    await asyncio.sleep(2)
    os.system("sync; sudo shutdown -h now")
