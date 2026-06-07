# Smart AI - Ollama Mode Switcher (PowerShell)
# 
# This script helps switch between local and remote Ollama modes
# by setting the SMARTAI_OLLAMA_MODE environment variable
#
# Usage (in PowerShell):
#   . .\ollama-mode-switch.ps1
#   Switch-OllamaMode -Mode local           # Switch to local mode (default)
#   Switch-OllamaMode -Mode remote          # Switch to remote mode (via SSH tunnel)
#   Get-OllamaMode                          # Show current mode

function Switch-OllamaMode {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("local", "remote", "status")]
        [string]$Mode
    )

    switch ($Mode) {
        "local" {
            $env:SMARTAI_OLLAMA_MODE = "local"
            Write-Host "✓ Smart AI Ollama mode set to: LOCAL" -ForegroundColor Green
            Write-Host "  API Base: http://localhost:11434"
            Write-Host ""
            Write-Host "Make sure Ollama is running locally:" -ForegroundColor Yellow
            Write-Host "  ollama serve"
        }
        
        "remote" {
            $env:SMARTAI_OLLAMA_MODE = "remote"
            Write-Host "✓ Smart AI Ollama mode set to: REMOTE (via SSH tunnel)" -ForegroundColor Green
            Write-Host "  API Base: http://localhost:11435"
            Write-Host ""
            Write-Host "Make sure SSH tunnel is established:" -ForegroundColor Yellow
            Write-Host "  ssh -L 11435:remote-host:11434 user@remote-host"
        }
        
        "status" {
            Get-OllamaMode
        }
    }
}

function Get-OllamaMode {
    $mode = $env:SMARTAI_OLLAMA_MODE
    
    if ([string]::IsNullOrEmpty($mode) -or $mode -eq "local") {
        Write-Host "Current mode: LOCAL (http://localhost:11434)" -ForegroundColor Cyan
    }
    elseif ($mode -eq "remote") {
        Write-Host "Current mode: REMOTE (http://localhost:11435)" -ForegroundColor Cyan
    }
    else {
        Write-Host "Current mode: UNKNOWN ($mode)" -ForegroundColor Red
    }
}

# Alias for convenience
Set-Alias -Name ollama-mode -Value Switch-OllamaMode

# Print initial status
Write-Host "Smart AI Ollama Mode Switcher loaded" -ForegroundColor Green
Write-Host "Run 'Get-OllamaMode' to see current mode" -ForegroundColor Gray
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Gray
Write-Host "  ollama-mode -Mode local    - Use local Ollama instance" -ForegroundColor Gray
Write-Host "  ollama-mode -Mode remote   - Use remote Ollama via SSH tunnel" -ForegroundColor Gray
Write-Host "  Get-OllamaMode             - Show current mode" -ForegroundColor Gray
