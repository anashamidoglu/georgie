#!/usr/bin/env bash
# ==============================================================================
# Georgie Carputer — Automated Raspberry Pi 4 Provisioning & Deployment Script
# ==============================================================================
# Run with: sudo bash provisioning/setup-pi.sh
# ==============================================================================

set -e

echo "=========================================================="
echo "   🚗 Starting Georgie Carputer Automated Provisioning    "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run this script with sudo: sudo bash provisioning/setup-pi.sh"
  exit 1
fi

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ACTUAL_USER="${SUDO_USER:-pi}"
USER_HOME=$(eval echo ~$ACTUAL_USER)

echo "[+] Target directory: $PROJECT_DIR"
echo "[+] Target system user: $ACTUAL_USER ($USER_HOME)"

# 1. Update APT and install system dependencies
echo "[+] Step 1/8: Installing system packages (Bluetooth, Audio, Python, X11)..."
apt-get update
apt-get install -y \
  python3-pip \
  python3-venv \
  python3-dev \
  build-essential \
  libdbus-1-dev \
  libglib2.0-dev \
  bluez \
  ofono \
  pipewire \
  pipewire-pulse \
  wireplumber \
  libspa-0.2-bluetooth \
  unclutter \
  chromium-browser \
  x11-xserver-utils \
  sqlite3 \
  curl \
  git \
  pulseaudio-utils

# 2. Ensure Node.js is installed for frontend building
echo "[+] Step 2/8: Checking Node.js environment..."
if ! command -v node &> /dev/null; then
  echo "[+] Installing Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "[+] Node version: $(node -v) / NPM version: $(npm -v)"

# 3. Setup Python Backend Virtualenv
echo "[+] Step 3/8: Setting up Python backend virtual environment..."
cd "$PROJECT_DIR/backend"
if [ ! -d "venv" ]; then
  sudo -u "$ACTUAL_USER" python3 -m venv venv
fi
sudo -u "$ACTUAL_USER" "$PROJECT_DIR/backend/venv/bin/pip" install --upgrade pip
sudo -u "$ACTUAL_USER" "$PROJECT_DIR/backend/venv/bin/pip" install -r requirements.txt

# 4. Build Frontend for Fast Static Serving
echo "[+] Step 4/8: Building production React frontend..."
cd "$PROJECT_DIR/frontend"
sudo -u "$ACTUAL_USER" npm install
sudo -u "$ACTUAL_USER" npm run build

# 5. Configure BlueZ, WirePlumber & oFono for Persistent In-Car Hands-Free Audio
echo "[+] Step 5/8: Configuring BlueZ, WirePlumber and oFono services..."
if [ -f "$PROJECT_DIR/provisioning/bluetooth-main.conf" ]; then
  cp "$PROJECT_DIR/provisioning/bluetooth-main.conf" /etc/bluetooth/main.conf
fi

# Install WirePlumber anti-drop configuration (prevents audio autosuspend and disconnects)
mkdir -p /etc/wireplumber/wireplumber.conf.d
if [ -f "$PROJECT_DIR/provisioning/wireplumber-bluetooth.conf" ]; then
  cp "$PROJECT_DIR/provisioning/wireplumber-bluetooth.conf" /etc/wireplumber/wireplumber.conf.d/50-bluez.conf
fi

systemctl enable bluetooth.service
systemctl restart bluetooth.service
systemctl enable ofono.service
systemctl restart ofono.service

# Restart PipeWire & WirePlumber user services if running
if command -v systemctl &> /dev/null; then
  sudo -u "$ACTUAL_USER" systemctl --user daemon-reload 2>/dev/null || true
  sudo -u "$ACTUAL_USER" systemctl --user restart wireplumber 2>/dev/null || true
  sudo -u "$ACTUAL_USER" systemctl --user restart pipewire 2>/dev/null || true
fi

# 6. Configure Chromium Policies for Automatic Geolocation Permission
echo "[+] Step 6/8: Setting up Chromium kiosk policies..."
mkdir -p /etc/chromium/policies/managed
if [ -f "$PROJECT_DIR/provisioning/chromium-policies.json" ]; then
  cp "$PROJECT_DIR/provisioning/chromium-policies.json" /etc/chromium/policies/managed/georgie.json
fi

# 7. Configure Chromium Kiosk Autostart
echo "[+] Step 7/8: Configuring X11 kiosk desktop autostart..."
chmod +x "$PROJECT_DIR/provisioning/chromium-kiosk.sh"
mkdir -p "$USER_HOME/.config/autostart"

cat <<EOF > "$USER_HOME/.config/autostart/georgie-kiosk.desktop"
[Desktop Entry]
Type=Application
Name=Georgie Kiosk
Exec=$PROJECT_DIR/provisioning/chromium-kiosk.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

chown -R "$ACTUAL_USER:$ACTUAL_USER" "$USER_HOME/.config"

# 8. Setup Systemd Service for Georgie Backend
echo "[+] Step 8/8: Registering Georgie backend systemd service..."
cat <<EOF > /etc/systemd/system/georgie-backend.service
[Unit]
Description=Georgie Carputer Backend Service
After=network.target sound.target bluetooth.target ofono.service pipewire.service
Wants=bluetooth.target ofono.service pipewire.service

[Service]
Type=simple
User=$ACTUAL_USER
WorkingDirectory=$PROJECT_DIR
Environment="PYTHONUNBUFFERED=1"
Environment="MOCK_MODE=false"
Environment="PATH=$PROJECT_DIR/backend/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=2
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable georgie-backend.service
systemctl restart georgie-backend.service

# 9. Optional: Check /boot/firmware/config.txt GPU Memory
echo "[+] Verifying GPU memory in /boot/firmware/config.txt..."
CONFIG_FILE="/boot/firmware/config.txt"
if [ ! -f "$CONFIG_FILE" ]; then
  CONFIG_FILE="/boot/config.txt"
fi

if [ -f "$CONFIG_FILE" ]; then
  if ! grep -q "gpu_mem" "$CONFIG_FILE"; then
    echo "[+] Appending GPU and display parameters to $CONFIG_FILE..."
    cat "$PROJECT_DIR/provisioning/config.txt.append" >> "$CONFIG_FILE"
  fi
fi

echo "=========================================================="
echo "   ✅ Georgie Carputer Provisioning Complete!            "
echo "=========================================================="
echo " Backend Status: systemctl status georgie-backend"
echo " Backend Logs:   journalctl -u georgie-backend -f"
echo " Web UI:         http://localhost:8000"
echo " Reboot now to launch into fullscreen in-car Kiosk mode: sudo reboot"
echo "=========================================================="
