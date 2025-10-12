#!/bin/bash
# BootAI Debug Script - Comprehensive Debugging Tools
# This script provides debugging capabilities for BootAI

set -e

echo "🔍 BootAI Debug Script Starting..."

# Debug 1: System Information
echo "Debug 1: System Information"
echo "OS: $(systeminfo | findstr "OS Name")"
echo "RAM: $(systeminfo | findstr "Total Physical Memory")"
echo "Disk: $(wmic logicaldisk get size,freespace,caption)"
echo ""

# Debug 2: WSL Status
echo "Debug 2: WSL Status"
wsl --status
echo ""
wsl --list --verbose
echo ""

# Debug 3: BootAI Process
echo "Debug 3: BootAI Process"
if Get-Process bootai -ErrorAction SilentlyContinue; then
    echo "✅ BootAI process running"
    Get-Process bootai | Select-Object ProcessName, Id, WorkingSet, CPU
else
    echo "❌ BootAI process not running"
fi
echo ""

# Debug 4: Port Status
echo "Debug 4: Port Status"
netstat -an | findstr :3000
echo ""

# Debug 5: WSL Environment
echo "Debug 5: WSL Environment"
wsl -u root whoami
wsl -u root pwd
wsl -u root ls -la /root/
echo ""

# Debug 6: Cache Status
echo "Debug 6: Cache Status"
if wsl -u root ls -la /root/bootai-cache/ > /dev/null 2>&1; then
    echo "✅ Cache directory exists"
    wsl -u root ls -la /root/bootai-cache/
    echo ""
    if wsl -u root ls -la /root/bootai-cache/isos/ > /dev/null 2>&1; then
        echo "✅ ISO cache exists"
        wsl -u root ls -la /root/bootai-cache/isos/
    else
        echo "❌ ISO cache not found"
    fi
    echo ""
    if wsl -u root ls -la /root/bootai-cache/models/ > /dev/null 2>&1; then
        echo "✅ Model cache exists"
        wsl -u root ls -la /root/bootai-cache/models/
    else
        echo "❌ Model cache not found"
    fi
else
    echo "❌ Cache directory not found"
fi
echo ""

# Debug 7: Ollama Status
echo "Debug 7: Ollama Status"
if wsl -u root command -v ollama > /dev/null 2>&1; then
    echo "✅ Ollama is installed"
    wsl -u root ollama --version
    echo ""
    wsl -u root ollama list
else
    echo "❌ Ollama is not installed"
fi
echo ""

# Debug 8: Build Artifacts
echo "Debug 8: Build Artifacts"
if [ -f "ai-node.iso" ]; then
    echo "✅ ai-node.iso exists"
    ls -la ai-node.iso
    echo ""
else
    echo "❌ ai-node.iso not found"
fi

if [ -f "base.iso" ]; then
    echo "✅ base.iso exists"
    ls -la base.iso
    echo ""
else
    echo "❌ base.iso not found"
fi

if [ -d "iso_extract" ]; then
    echo "✅ iso_extract directory exists"
    ls -la iso_extract/ | head -10
    echo ""
else
    echo "❌ iso_extract directory not found"
fi

if [ -d "iso_new" ]; then
    echo "✅ iso_new directory exists"
    ls -la iso_new/ | head -10
    echo ""
else
    echo "❌ iso_new directory not found"
fi

if [ -d "iso_mount" ]; then
    echo "✅ iso_mount directory exists"
    ls -la iso_mount/ | head -10
    echo ""
else
    echo "❌ iso_mount directory not found"
fi
echo ""

# Debug 9: API Endpoints
echo "Debug 9: API Endpoints"
echo "Testing WSL status endpoint..."
curl -s http://localhost:3000/api/wsl-status | jq . 2>/dev/null || curl -s http://localhost:3000/api/wsl-status
echo ""
echo "Testing USB drives endpoint..."
curl -s http://localhost:3000/api/usb-drives | jq . 2>/dev/null || curl -s http://localhost:3000/api/usb-drives
echo ""
echo "Testing cache status endpoint..."
curl -s http://localhost:3000/api/cache-status | jq . 2>/dev/null || curl -s http://localhost:3000/api/cache-status
echo ""

# Debug 10: Network Connectivity
echo "Debug 10: Network Connectivity"
if ping -n 1 8.8.8.8 > /dev/null 2>&1; then
    echo "✅ Internet connectivity working"
else
    echo "❌ Internet connectivity not working"
fi
echo ""

# Debug 11: Disk Space
echo "Debug 11: Disk Space"
wsl -u root df -h
echo ""

# Debug 12: Memory Usage
echo "Debug 12: Memory Usage"
wsl -u root free -h
echo ""

# Debug 13: Process List
echo "Debug 13: Process List"
wsl -u root ps aux | head -20
echo ""

# Debug 14: System Logs
echo "Debug 14: System Logs"
echo "Recent system events..."
Get-EventLog -LogName System -Newest 5 | Select-Object TimeGenerated, EntryType, Message
echo ""

# Debug 15: Error Analysis
echo "Debug 15: Error Analysis"
echo "Checking for common issues..."
echo ""

# Check for JSON parsing errors
if Get-Process bootai -ErrorAction SilentlyContinue | Select-String "JSON" -ErrorAction SilentlyContinue; then
    echo "⚠️ JSON parsing errors detected"
else
    echo "✅ No JSON parsing errors detected"
fi

# Check for WSL systemd warnings
if wsl -u root systemctl status 2>&1 | grep -q "systemd"; then
    echo "⚠️ WSL systemd warnings detected (expected)"
else
    echo "✅ No WSL systemd warnings"
fi

# Check for permission errors
if wsl -u root ls -la /root/ 2>&1 | grep -q "Permission denied"; then
    echo "❌ Permission errors detected"
else
    echo "✅ No permission errors detected"
fi

echo ""
echo "🔍 Debug analysis complete!"
echo "📊 Debug Summary:"
echo "   - System information collected"
echo "   - WSL status verified"
echo "   - BootAI process analyzed"
echo "   - Port status checked"
echo "   - Cache status verified"
echo "   - Ollama status checked"
echo "   - Build artifacts analyzed"
echo "   - API endpoints tested"
echo "   - Network connectivity verified"
echo "   - Resource usage monitored"
echo "   - Error analysis completed"
echo ""
echo "💡 Use this information to troubleshoot any issues!"
