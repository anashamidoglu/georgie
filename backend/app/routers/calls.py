from fastapi import APIRouter
from ..services.bluetooth.mock_listener import mock_bt_listener
from ..config import settings

router = APIRouter(prefix="/api/calls", tags=["calls"])

@router.post("/answer")
async def answer_call():
    if settings.MOCK_MODE:
        await mock_bt_listener.answer_call()
    return {"status": "answered"}

@router.post("/reject")
async def reject_call():
    if settings.MOCK_MODE:
        await mock_bt_listener.end_call()
    return {"status": "rejected"}

@router.post("/hangup")
async def hangup_call():
    if settings.MOCK_MODE:
        await mock_bt_listener.end_call()
    return {"status": "ended"}

@router.post("/simulate_incoming")
async def simulate_incoming(name: str = "Sarah", number: str = "+971 50 123 4567"):
    """
    Test endpoint to simulate incoming call during desktop dev.
    """
    await mock_bt_listener.simulate_incoming_call(name, number)
    return {"status": "simulating_incoming_call"}
