# BootAI Testing Commands

## Test Suite for BootAI Application

### 1. Application Startup Tests
```bash
# Test 1: Start BootAI
.\bootai.exe

# Verify: Check if port 3000 is listening
netstat -an | findstr :3000

# Expected: TCP 0.0.0.0:3000 LISTENING
```

### 2. Web Interface Tests
```bash
# Test 2: Open web interface
start http://localhost:3000

# Verify: Browser opens with BootAI interface
# Expected: Step-by-step wizard loads
```

### 3. API Endpoint Tests
```bash
# Test 3: USB Drive Detection
curl http://localhost:3000/api/usb-drives

# Expected: JSON response with USB drives or empty array

# Test 4: WSL Status Check
curl http://localhost:3000/api/wsl-status

# Expected: JSON response with WSL status information

# Test 5: Build ISO Endpoint
curl -X POST http://localhost:3000/api/build-iso \
  -H "Content-Type: application/json" \
  -d "{\"baseOs\":\"ubuntu-22.04\",\"model\":\"phi3:mini\"}"

# Expected: JSON response with success/failure status
```

### 4. WSL Integration Tests
```bash
# Test 6: WSL Status
wsl --status

# Expected: WSL is running

# Test 7: WSL List
wsl --list --verbose

# Expected: Ubuntu distribution listed

# Test 8: WSL Root Access
wsl -u root whoami

# Expected: root
```

### 5. Build Process Tests
```bash
# Test 9: Manual Build Script Test
wsl -u root bash scripts/build.sh "ubuntu-22.04" "phi3:mini"

# Expected: ISO build process completes successfully

# Test 10: Cache Directory Creation
wsl -u root ls -la /root/bootai-cache/

# Expected: Cache directories exist
```

### 6. File System Tests
```bash
# Test 11: Check Generated Files
dir *.iso
dir *.exe

# Expected: bootai.exe exists, ISO files may exist

# Test 12: Check Build Artifacts
dir iso_extract
dir iso_new

# Expected: Build directories exist (may be empty)
```

### 7. Error Handling Tests
```bash
# Test 13: Invalid API Request
curl -X POST http://localhost:3000/api/build-iso \
  -H "Content-Type: application/json" \
  -d "{\"invalid\":\"data\"}"

# Expected: Error response with validation message

# Test 14: Port Conflict Test
.\bootai.exe

# Expected: Error if port 3000 already in use
```

### 8. Performance Tests
```bash
# Test 15: Memory Usage
Get-Process bootai -ErrorAction SilentlyContinue | Select-Object ProcessName, WorkingSet

# Expected: Reasonable memory usage

# Test 16: CPU Usage
Get-Process bootai -ErrorAction SilentlyContinue | Select-Object ProcessName, CPU

# Expected: Low CPU usage when idle
```

## Test Results Template

### Test Execution Log
```
Date: [DATE]
Time: [TIME]
Tester: [NAME]
Environment: Windows 10/11 + WSL2

Test Results:
□ Test 1: Application Startup - PASS/FAIL
□ Test 2: Web Interface - PASS/FAIL
□ Test 3: USB Drive Detection - PASS/FAIL
□ Test 4: WSL Status Check - PASS/FAIL
□ Test 5: Build ISO Endpoint - PASS/FAIL
□ Test 6: WSL Status - PASS/FAIL
□ Test 7: WSL List - PASS/FAIL
□ Test 8: WSL Root Access - PASS/FAIL
□ Test 9: Manual Build Script - PASS/FAIL
□ Test 10: Cache Directory - PASS/FAIL
□ Test 11: Generated Files - PASS/FAIL
□ Test 12: Build Artifacts - PASS/FAIL
□ Test 13: Invalid API Request - PASS/FAIL
□ Test 14: Port Conflict - PASS/FAIL
□ Test 15: Memory Usage - PASS/FAIL
□ Test 16: CPU Usage - PASS/FAIL

Overall Result: PASS/FAIL
Issues Found: [LIST ISSUES]
Recommendations: [LIST RECOMMENDATIONS]
```

## Automated Testing Script
```powershell
# BootAI Test Script
Write-Host "Starting BootAI Test Suite..."

# Test 1: Start BootAI
Write-Host "Test 1: Starting BootAI..."
Start-Process -FilePath ".\bootai.exe" -WindowStyle Hidden
Start-Sleep 5

# Test 2: Check Port
Write-Host "Test 2: Checking port 3000..."
$portCheck = netstat -an | findstr :3000
if ($portCheck) {
    Write-Host "✓ Port 3000 is listening"
} else {
    Write-Host "✗ Port 3000 is not listening"
}

# Test 3: API Test
Write-Host "Test 3: Testing API..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/usb-drives" -Method GET
    Write-Host "✓ API responding"
} catch {
    Write-Host "✗ API not responding: $($_.Exception.Message)"
}

# Cleanup
Write-Host "Cleaning up..."
Stop-Process -Name "bootai" -ErrorAction SilentlyContinue
Write-Host "Test suite completed."
```

## Current Test Status

### Build Success Criteria
- [x] Executable created (bootai.exe)
- [x] Application starts without errors
- [x] Web interface loads correctly
- [x] API endpoints respond
- [x] WSL integration works
- [x] USB detection functions
- [x] ISO build process completes
- [x] Error handling works properly
- [x] Caching system functional
- [x] WebSocket progress tracking works
- [ ] USB writing functionality (needs testing)
- [ ] Different OS/model combinations (needs testing)

### Current Test Status
**Last Updated**: Current session
**Overall Status**: Functional with minor issues

**Passing Tests**:
- Application startup and web interface
- WSL integration and build process
- ISO creation (ai-node.iso generated)
- Caching system (prevents re-downloads)
- WebSocket progress tracking
- API endpoint functionality

**Pending Tests**:
- USB writing functionality
- Different Linux distro combinations
- Different AI model combinations
- Error recovery scenarios
- Performance under load

**Known Issues**:
- JSON parsing error appears in terminal (non-blocking)
- Need to verify USB writing with actual hardware
