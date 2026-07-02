#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  InvoiceAI — Cross-Platform Deployment Script
# ═══════════════════════════════════════════════════════════════════════════
#  Supports Ubuntu (Linux) and macOS.
#  
#  Usage:
#    chmod +x deploy.sh
#    sudo ./deploy.sh       (on Ubuntu)
#    ./deploy.sh            (on macOS)
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Always run from the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Define colors
GREEN='\033[0;32m'
BLUE='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

export TERM="${TERM:-xterm}"
clear || true
echo -e "${YELLOW}"
echo " ██╗███╗   ██╗██╗   ██╗ ██████╗ ██╗ ██████╗███████╗    █████╗ ██╗"
echo " ██║████╗  ██║██║   ██║██╔═══██╗██║██╔════╝██╔════╝   ██╔══██╗██║"
echo " ██║██╔██╗ ██║██║   ██║██║   ██║██║██║     █████╗     ███████║██║"
echo " ██║██║╚██╗██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝     ██╔══██║██║"
echo " ██║██║ ╚████║ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗██╗██║  ██║██║"
echo " ╚═╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝╚═╝╚═╝  ╚═╝╚═╝"
echo -e "${NC}"
echo "═════════════════════════════════════════════════════════════════"
echo -e "                   ${BLUE}SERVER DEPLOYMENT INITIATED${NC}"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# Detect Operating System
OS="$(uname -s)"
echo -e "  Detected OS: ${GREEN}$OS${NC}"
echo ""

# ── Step 1: Install Docker if not present ─────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "[1/6] Installing Docker..."
    if [ "$OS" = "Linux" ]; then
        if [ "$EUID" -ne 0 ]; then
            echo -e "${RED}Error: Please run with sudo on Linux.${NC}"
            exit 1
        fi
        apt-get update
        apt-get install -y ca-certificates curl gnupg
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
          tee /etc/apt/sources.list.d/docker.list > /dev/null

        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl enable docker
        systemctl start docker
        echo "✅ Docker installed successfully."
    elif [ "$OS" = "Darwin" ]; then
        echo "⚠️  Docker is not installed! Downloading Docker Desktop for Mac..."
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            DOCKER_URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
        else
            DOCKER_URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
        fi
        
        echo "   Downloading from $DOCKER_URL ..."
        curl -L -o /tmp/Docker.dmg "$DOCKER_URL"
        
        echo "   Mounting and installing Docker to /Applications..."
        hdiutil attach /tmp/Docker.dmg -nobrowse -quiet
        cp -a /Volumes/Docker/Docker.app /Applications/
        hdiutil detach /Volumes/Docker -quiet
        rm /tmp/Docker.dmg
        
        echo "✅ Docker installed! Launching Docker Desktop..."
        open -a Docker
        
        echo "⏳ Waiting for Docker daemon to start (this might take a minute)..."
        MAC_RETRIES=0
        MAC_MAX_RETRIES=60
        until docker info > /dev/null 2>&1; do
            MAC_RETRIES=$((MAC_RETRIES + 1))
            if [ $MAC_RETRIES -ge $MAC_MAX_RETRIES ]; then
                echo -e "${RED}Error: Docker daemon did not start after 3 minutes.${NC}"
                echo "   Please open Docker Desktop manually and re-run this script."
                exit 1
            fi
            sleep 3
        done
        echo "✅ Docker daemon is running."
    else
        echo -e "${RED}⚠️  Unsupported OS. Please install Docker manually.${NC}"
        exit 1
    fi
else
    echo "[1/6] Docker already installed. ✅"
    # On macOS, make sure Docker daemon is actually running
    if [ "$OS" = "Darwin" ]; then
        if ! docker info > /dev/null 2>&1; then
            echo "   Docker Desktop is not running. Launching it..."
            open -a Docker
            echo "   ⏳ Waiting for Docker daemon..."
            MAC_RETRIES=0
            until docker info > /dev/null 2>&1; do
                MAC_RETRIES=$((MAC_RETRIES + 1))
                if [ $MAC_RETRIES -ge 60 ]; then
                    echo -e "${RED}Error: Docker daemon did not start. Please open Docker Desktop manually.${NC}"
                    exit 1
                fi
                sleep 3
            done
            echo "   ✅ Docker daemon is running."
        fi
    fi
fi

# ── Step 2: Create production env file ────────────────────────────────────
echo ""
if [ ! -f .env.production ]; then
    echo "[2/6] Creating .env.production from template..."
    if [ ! -f .env.production.example ]; then
        echo -e "${RED}Error: .env.production.example not found!${NC}"
        echo "   Make sure you are running this script from the project root."
        exit 1
    fi
    cp .env.production.example .env.production
    # Generate a random secret key
    SECRET=$(openssl rand -hex 32)
    # macOS sed requires '' after -i, Linux does not
    if [ "$OS" = "Darwin" ]; then
        sed -i '' "s/CHANGE_ME_TO_A_RANDOM_SECRET_KEY/$SECRET/" .env.production
    else
        sed -i "s/CHANGE_ME_TO_A_RANDOM_SECRET_KEY/$SECRET/" .env.production
    fi
    echo "✅ .env.production created with a random SECRET_KEY."
    echo "   Review it:  nano .env.production"
else
    echo "[2/6] .env.production already exists. ✅"
fi

# ── Step 3: Build and start containers ────────────────────────────────────
echo ""
echo "[3/6] Building and starting Docker containers..."
docker compose up -d --build
echo "✅ Containers started."

# ── Step 4: Wait for Ollama to be ready and pull models ───────────────────
echo ""
echo "[4/6] Waiting for Ollama to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec invoiceai-ollama ollama list > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "⚠️  Ollama did not start in time. You may need to pull models manually."
        break
    fi
    echo "   Waiting for Ollama... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "   Pulling AI models (this may take a while on first run)..."
    docker exec invoiceai-ollama ollama pull qwen2.5:3b
    echo "   ✅ Text model (qwen2.5:3b) pulled."
    docker exec invoiceai-ollama ollama pull moondream
    echo "   ✅ Vision model (moondream) pulled."
    docker exec invoiceai-ollama ollama pull nomic-embed-text
    echo "   ✅ Vector model (nomic-embed-text) pulled."
fi

# ── Step 5: Show status ──────────────────────────────────────────────────
echo ""
echo "[5/6] Checking service status..."
docker compose ps
echo ""

# Get the server IP
if [ "$OS" = "Darwin" ]; then
    SERVER_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1")
else
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    # Fallback if hostname -I returns empty
    [ -z "$SERVER_IP" ] && SERVER_IP="127.0.0.1"
fi

# ── Step 6: Create Desktop Launcher ────────────────────────────────────────
echo ""
echo "[6/6] Creating Desktop Launcher..."
# Find the real user if running with sudo
REAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~"$REAL_USER")
DESKTOP_DIR="$USER_HOME/Desktop"

if [ -d "$DESKTOP_DIR" ]; then
    if [ "$OS" = "Darwin" ]; then
        # macOS webloc file
        cat <<EOF > "$DESKTOP_DIR/InvoiceAI.webloc"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>URL</key>
    <string>http://$SERVER_IP</string>
</dict>
</plist>
EOF
        chown "$REAL_USER" "$DESKTOP_DIR/InvoiceAI.webloc"
        echo "✅ Launcher (webloc) created on Mac Desktop."
    else
        # Linux desktop file
        cat <<EOF > "$DESKTOP_DIR/InvoiceAI.desktop"
[Desktop Entry]
Version=1.0
Name=InvoiceAI
Comment=Invoice AI Web Dashboard
Exec=xdg-open http://$SERVER_IP
Icon=$SCRIPT_DIR/logo.png
Terminal=false
Type=Application
Categories=Utility;
EOF
        chmod +x "$DESKTOP_DIR/InvoiceAI.desktop"
        chown "$REAL_USER:$REAL_USER" "$DESKTOP_DIR/InvoiceAI.desktop"
        echo "✅ Launcher created on Desktop."
    fi
else
    if [ "$OS" = "Linux" ]; then
        # Fallback to system applications folder on headless Linux servers
        cat <<EOF > "/usr/share/applications/InvoiceAI.desktop"
[Desktop Entry]
Version=1.0
Name=InvoiceAI
Comment=Invoice AI Web Dashboard
Exec=xdg-open http://$SERVER_IP
Icon=$SCRIPT_DIR/logo.png
Terminal=false
Type=Application
Categories=Utility;
EOF
        chmod +x "/usr/share/applications/InvoiceAI.desktop"
        echo "✅ Launcher created in Applications menu."
    else
        echo "⚠️  Desktop directory not found. Skipping launcher creation."
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ InvoiceAI is deployed!"
echo ""
echo "  🌐 Web UI:    http://$SERVER_IP"
echo "  📡 API:       http://$SERVER_IP/api"
echo "  📖 API Docs:  http://$SERVER_IP/api/docs"
echo "  🗄️ DB Viewer: http://$SERVER_IP:5050 (pgAdmin)"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f          # View logs"
echo "    docker compose restart          # Restart all services"
echo "    docker compose down             # Stop all services"
echo "    docker compose up -d --build    # Rebuild and restart"
echo "═══════════════════════════════════════════════════════════════"
