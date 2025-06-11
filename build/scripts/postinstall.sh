#!/bin/bash
INSTALL_DIR="$(dirname "$0")"
cd "$INSTALL_DIR"

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.10 or later:"
    echo "Ubuntu/Debian: sudo apt-get install python3.10"
    echo "Fedora: sudo dnf install python3.10"
    echo "Arch Linux: sudo pacman -S python3"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if (( $(echo "$PYTHON_VERSION < 3.10" | bc -l) )); then
    echo "Python 3.10 or later is required. Current version: $PYTHON_VERSION"
    echo "Please upgrade Python using your package manager:"
    echo "Ubuntu/Debian: sudo apt-get install python3.10"
    echo "Fedora: sudo dnf install python3.10"
    echo "Arch Linux: sudo pacman -S python3"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install requirements
echo "Installing requirements..."
source venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

# Set permissions
chmod -R 755 .
./install --install-dir "$INSTALL_DIR"
