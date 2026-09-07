#!/usr/bin/env bash

# ==============================================================================
#  🧬 NeuroLab AI - Stop Script
# ==============================================================================
#  Convenience shortcut to stop all active NeuroLab AI backend and frontend instances.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/start.sh" --stop
