#!/bin/bash
# Chromium Kiosk Launcher for Georgie Carputer on Raspberry Pi 4
# Runs upon X11 desktop session start

# 1. Hide mouse cursor after 0.1s of inactivity
unclutter -idle 0.1 -root &

# 2. Disable screen blanking, sleep, and DPMS
xset s off
xset -dpms
xset s noblank

# 3. Wait for Georgie FastAPI service to become healthy
until curl -s http://localhost:8000/health > /dev/null; do
    echo "Waiting for Georgie backend service on port 8000..."
    sleep 0.5
done

# 4. Launch Chromium in hardware-accelerated GPU Kiosk mode
chromium-browser \
  --kiosk \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --use-gl=egl \
  --disable-translate \
  --disable-infobars \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --touch-events=enabled \
  http://localhost:8000
