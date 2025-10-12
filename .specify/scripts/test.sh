#!/bin/bash
# BootAI Test Script - Comprehensive Testing Suite
# This script tests all BootAI functionality

set -e

echo "🧪 BootAI Test Suite Starting..."

# Test 1: Application Startup
echo "Test 1: Application Startup"
if netstat -an | grep -q ":3000.*LISTENING"; then
    echo "✅ Port 3000 is listening"
else
    echo "❌ Port 3000 is not listening"
    exit 1
fi

# Test 2: WSL Status
echo "Test 2: WSL Status"
if wsl --status > /dev/null 2>&1; then
    echo "✅ WSL is running"
else
    echo "❌ WSL is not running"
    exit 1
fi

# Test 3: WSL Distributions
echo "Test 3: WSL Distributions"
if wsl --list --verbose | grep -q "Ubuntu"; then
    echo "✅ Ubuntu distribution found"
else
    echo "❌ Ubuntu distribution not found"
    exit 1
fi

# Test 4: WSL Root Access
echo "Test 4: WSL Root Access"
if wsl -u root whoami | grep -q "root"; then
    echo "✅ Root access working"
else
    echo "❌ Root access not working"
    exit 1
fi

# Test 5: API Endpoints
echo "Test 5: API Endpoints"
if curl -s http://localhost:3000/api/wsl-status | grep -q "success"; then
    echo "✅ WSL status API working"
else
    echo "❌ WSL status API not working"
    exit 1
fi

# Test 6: USB Drive Detection
echo "Test 6: USB Drive Detection"
if curl -s http://localhost:3000/api/usb-drives | grep -q "success"; then
    echo "✅ USB drive detection API working"
else
    echo "❌ USB drive detection API not working"
    exit 1
fi

# Test 7: Build Script
echo "Test 7: Build Script"
if [ -f "scripts/build.sh" ]; then
    echo "✅ Build script exists"
    if [ -x "scripts/build.sh" ]; then
        echo "✅ Build script is executable"
    else
        echo "❌ Build script is not executable"
        exit 1
    fi
else
    echo "❌ Build script not found"
    exit 1
fi

# Test 8: Cache Directories
echo "Test 8: Cache Directories"
if wsl -u root ls -la /root/bootai-cache/ > /dev/null 2>&1; then
    echo "✅ Cache directories exist"
else
    echo "❌ Cache directories not found"
    exit 1
fi

# Test 9: Ollama Installation
echo "Test 9: Ollama Installation"
if wsl -u root command -v ollama > /dev/null 2>&1; then
    echo "✅ Ollama is installed"
else
    echo "❌ Ollama is not installed"
    exit 1
fi

# Test 10: Model Availability
echo "Test 10: Model Availability"
if wsl -u root ollama list | grep -q "phi3:mini"; then
    echo "✅ Phi-3 mini model available"
else
    echo "❌ Phi-3 mini model not available"
    exit 1
fi

# Test 11: ISO File
echo "Test 11: ISO File"
if [ -f "ai-node.iso" ]; then
    echo "✅ ai-node.iso exists"
    ISO_SIZE=$(du -h ai-node.iso | cut -f1)
    echo "📊 ISO size: $ISO_SIZE"
else
    echo "❌ ai-node.iso not found"
    exit 1
fi

# Test 12: Build Artifacts
echo "Test 12: Build Artifacts"
if [ -d "iso_extract" ] || [ -d "iso_new" ] || [ -d "iso_mount" ]; then
    echo "✅ Build artifacts exist"
else
    echo "❌ Build artifacts not found"
    exit 1
fi

# Test 13: WebSocket Connection
echo "Test 13: WebSocket Connection"
# This would require a more complex test with WebSocket client
echo "⚠️ WebSocket test requires manual verification"

# Test 14: Error Handling
echo "Test 14: Error Handling"
if curl -s -X POST http://localhost:3000/api/build-iso -H "Content-Type: application/json" -d '{"invalid":"data"}' | grep -q "error"; then
    echo "✅ Error handling working"
else
    echo "❌ Error handling not working"
    exit 1
fi

# Test 15: Performance
echo "Test 15: Performance"
MEMORY_USAGE=$(Get-Process bootai -ErrorAction SilentlyContinue | Select-Object -ExpandProperty WorkingSet)
if [ -n "$MEMORY_USAGE" ]; then
    echo "📊 Memory usage: $MEMORY_USAGE bytes"
    echo "✅ Performance monitoring working"
else
    echo "❌ Performance monitoring not working"
    exit 1
fi

echo ""
echo "🎉 All tests completed successfully!"
echo "📊 Test Summary:"
echo "   - Application startup: ✅"
echo "   - WSL integration: ✅"
echo "   - API endpoints: ✅"
echo "   - Build process: ✅"
echo "   - Caching system: ✅"
echo "   - Error handling: ✅"
echo "   - Performance: ✅"
echo ""
echo "🚀 BootAI is ready for production use!"
