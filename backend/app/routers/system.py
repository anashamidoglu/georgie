from fastapi import APIRouter
import os
import platform
import asyncio

router = APIRouter(prefix="/api/system", tags=["system"])

@router.post("/shutdown")
async def trigger_shutdown():
    """
    Executes clean system shutdown. Syncs disks and powers down Raspberry Pi.
    """
    is_linux = platform.system().lower() == "linux"
    if is_linux:
        # Trigger clean poweroff
        asyncio.create_task(_delayed_shutdown())
        return {"status": "shutting_down", "message": "System will power off in 3 seconds"}
    else:
        return {"status": "mock_shutdown", "message": "Simulated shutdown on non-Linux platform"}

async def _delayed_shutdown():
    await asyncio.sleep(2)
    os.system("sync; sudo shutdown -h now")
