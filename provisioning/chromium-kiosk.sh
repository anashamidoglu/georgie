#!/bin/bash
# Chromium Kiosk Launcher for Georgie Carputer on Raspberry Pi 4

# Hide mouse cursor when inactive
unclutter -idle 0.1 -root &

# Disable screen blanking / DPMS
xset s off
xset -dpms
xset s noblank

# Wait for local FastAPI server to become healthy
until curl -s http://localhost:8000/health > /dev/null; do
    echo "Waiting for Georgie backend..."
    sleep 0.5
done

# Launch Chromium in dedicated GPU hardware-accelerated kiosk mode
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
  http://localhost:5173
