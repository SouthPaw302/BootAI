# BootAI Debug Commands

## Master Developer Debugger Commands

### System Analysis
```bash
# Check BootAI status
netstat -an | findstr :3000

# Check WSL status
wsl --status
wsl --list --verbose

# Check USB drives
wmic logicaldisk where drivetype=2 get deviceid,volumename,size,freespace
```

### Build Process Debugging
```bash
# Test ISO build in WSL
wsl -u root bash scripts/build.sh "ubuntu-22.04" "phi3:mini"

# Check WSL cache
wsl -u root ls -la /root/bootai-cache/

# Validate WSL environment
wsl -u root bash -c "curl --version && apt-get --version"
```

### Application Testing
```bash
# Start BootAI
.\bootai.exe

# Test API endpoints
curl -X POST http://localhost:3000/api/build-iso -H "Content-Type: application/json" -d "{\"baseOs\":\"ubuntu-22.04\",\"model\":\"phi3:mini\"}"

# Test USB detection
curl http://localhost:3000/api/usb-drives

# Test ISO download
curl http://localhost:3000/api/download-iso -o test.iso
```

### Error Resolution
```bash
# Fix port conflicts
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# Clean WSL build directories
wsl -u root rm -rf iso_extract iso_new iso_mount

# Reset WSL cache
wsl -u root rm -rf /root/bootai-cache/
```

### Performance Monitoring
```bash
# Monitor BootAI process
Get-Process bootai -ErrorAction SilentlyContinue

# Check disk usage
wsl -u root df -h

# Monitor network activity
netstat -an | findstr :3000
```

## Debugging Workflow

1. **Identify Issue**: Check terminal output and browser console
2. **Analyze Root Cause**: Use debug commands above
3. **Apply Fix**: Follow systematic debugging approach
4. **Test Solution**: Verify fix works end-to-end
5. **Document**: Update spec with resolution

## Common Issues and Solutions

### JSON Parsing Error (Current Issue)
- **Symptom**: `SyntaxError: Unexpected token : in JSON at position 10`
- **Status**: Partially Fixed - Error still appears in terminal
- **Cause**: May be cached error message or pkg build issue
- **Solution**: Added input validation in main.js
- **Impact**: Non-blocking - application functions normally

### WSL Permission Errors (Resolved)
- **Symptom**: `Operation not supported` during unsquashfs
- **Status**: Resolved
- **Cause**: Device node creation failures in WSL
- **Solution**: Switched to minimal filesystem approach
- **Result**: Build process now completes successfully

### USB Write Failures (Needs Testing)
- **Symptom**: USB formatting or writing errors
- **Status**: Needs verification
- **Cause**: Diskpart script or dd command issues
- **Solution**: Proper diskpart script generation and WSL dd execution

### Port Conflicts (Resolved)
- **Symptom**: `EADDRINUSE: address already in use :::3000`
- **Status**: Resolved
- **Cause**: Multiple BootAI instances running
- **Solution**: Kill existing processes before restart

### ISO Build Process (Resolved)
- **Symptom**: Build process hanging or failing
- **Status**: Resolved
- **Cause**: Complex squashfs extraction issues
- **Solution**: Minimal filesystem creation approach
- **Result**: ai-node.iso generated successfully

### Caching Issues (Resolved)
- **Symptom**: ISOs and models re-downloaded every build
- **Status**: Resolved
- **Cause**: No proper caching implementation
- **Solution**: Implemented cache directories with file validation
- **Result**: Smart caching prevents re-downloads
