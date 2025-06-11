#!/bin/bash

# Default installation directory
DEFAULT_INSTALL_DIR="/usr/local/neurolabai"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --install-dir)
            INSTALL_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Use default directory if not specified
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"

# Function to check if running with sudo
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        echo "Please run this script with sudo"
        exit 1
    fi
}

# Function to set permissions
set_permissions() {
    echo "Setting permissions..."
    chmod -R 755 "$INSTALL_DIR"
    chown -R $(whoami) "$INSTALL_DIR"
}

# Function to create Python virtual environment
create_venv() {
    echo "Creating Python virtual environment..."
    python3 -m venv "$INSTALL_DIR/venv"
    source "$INSTALL_DIR/venv/bin/activate"
    pip install --upgrade pip
    pip install -r "$INSTALL_DIR/requirements.txt"
}

# Function to setup the application
setup_app() {
    echo "Setting up NeuroLabAI in $INSTALL_DIR..."
    
    # Create necessary directories
    mkdir -p "$INSTALL_DIR/logs"
    mkdir -p "$INSTALL_DIR/data"
    mkdir -p "$INSTALL_DIR/config/security"
    
    # Set permissions
    set_permissions
    
    # Create virtual environment
    create_venv
    
    # Initialize the application
    source "$INSTALL_DIR/venv/bin/activate"
    python "$INSTALL_DIR/launcher.py" --init --install-dir "$INSTALL_DIR"
}

# Function to create desktop shortcut
create_shortcut() {
    echo "Creating desktop shortcut..."
    
    # Create .desktop file for main application
    cat > "$HOME/Desktop/NeuroLabAI.desktop" << EOF
[Desktop Entry]
Name=NeuroLabAI
Comment=AI-powered laboratory analysis platform
Exec=$INSTALL_DIR/launcher.sh
Icon=$INSTALL_DIR/icon.png
Terminal=false
Type=Application
Categories=Science;Medical;
EOF
    
    # Create .desktop file for logs
    cat > "$HOME/Desktop/NeuroLabAI-Logs.desktop" << EOF
[Desktop Entry]
Name=NeuroLabAI Logs
Comment=View NeuroLabAI installation logs
Exec=xdg-open $INSTALL_DIR/logs
Icon=$INSTALL_DIR/icon.png
Terminal=false
Type=Application
Categories=Science;Medical;
EOF
    
    chmod +x "$HOME/Desktop/NeuroLabAI.desktop"
    chmod +x "$HOME/Desktop/NeuroLabAI-Logs.desktop"
}

# Main installation process
echo "Starting NeuroLabAI installation..."

# Check if running with sudo
check_sudo

# Setup the application
setup_app

# Create desktop shortcut
create_shortcut

echo "Installation complete!"
echo "You can now run NeuroLabAI using the desktop shortcut or by running:"
echo "cd $INSTALL_DIR && ./launcher.sh"

# Windows
NeuroLabAI_Setup.exe /LOG=install.log

# macOS
installer -pkg NeuroLabAI.pkg -target /Applications -verbose

# Linux
sudo ./install.sh --show-logs 