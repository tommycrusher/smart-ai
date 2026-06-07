#!/bin/bash
#
# Smart AI - Ollama Mode Switcher
# 
# This script helps switch between local and remote Ollama modes
# by setting the SMARTAI_OLLAMA_MODE environment variable
#
# Usage:
#   source ollama-mode-switch.sh
#   ollama-mode local          # Switch to local mode (default)
#   ollama-mode remote         # Switch to remote mode (via SSH tunnel)
#   ollama-mode status         # Show current mode

function ollama-mode() {
    local mode="$1"
    
    case "$mode" in
        local)
            export SMARTAI_OLLAMA_MODE="local"
            echo "✓ Smart AI Ollama mode set to: LOCAL"
            echo "  API Base: http://localhost:11434"
            echo ""
            echo "Make sure Ollama is running locally:"
            echo "  ollama serve"
            ;;
        
        remote)
            export SMARTAI_OLLAMA_MODE="remote"
            echo "✓ Smart AI Ollama mode set to: REMOTE (via SSH tunnel)"
            echo "  API Base: http://localhost:11435"
            echo ""
            echo "Make sure SSH tunnel is established:"
            echo "  ssh -L 11435:remote-host:11434 user@remote-host"
            ;;
        
        status)
            if [ -z "$SMARTAI_OLLAMA_MODE" ] || [ "$SMARTAI_OLLAMA_MODE" = "local" ]; then
                echo "Current mode: LOCAL (http://localhost:11434)"
            elif [ "$SMARTAI_OLLAMA_MODE" = "remote" ]; then
                echo "Current mode: REMOTE (http://localhost:11435)"
            else
                echo "Current mode: UNKNOWN ($SMARTAI_OLLAMA_MODE)"
            fi
            ;;
        
        *)
            echo "Unknown mode: $mode"
            echo ""
            echo "Usage:"
            echo "  ollama-mode local       - Use local Ollama instance"
            echo "  ollama-mode remote      - Use remote Ollama via SSH tunnel"
            echo "  ollama-mode status      - Show current mode"
            return 1
            ;;
    esac
}

# Print initial status
echo "Smart AI Ollama Mode Switcher loaded"
echo "Run 'ollama-mode status' to see current mode"
