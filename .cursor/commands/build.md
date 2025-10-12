# BootAI Build Commands

## Build Process for BootAI Application

### 1. Development Build
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access application
# Browser: http://localhost:3000
```

### 2. Production Build
```bash
# Create executable
npm run build

# Output: bootai.exe
# Size: ~40MB
# Type: Windows executable
```

### 3. WSL Build Process
```bash
# Manual WSL build test
wsl -u root bash scripts/build.sh "ubuntu-22.04" "phi3:mini"

# Expected output:
# - Downloads Ubuntu 22.04 ISO
# - Installs Ollama
# - Pulls phi3:mini model
# - Creates ai-node.iso
```

### 4. Build Verification
```bash
# Check generated files
dir *.exe
dir *.iso

# Verify executable
.\bootai.exe --version

# Test application
.\bootai.exe
```

## Build Configuration

### package.json Scripts
```json
{
  "scripts": {
    "start": "node src/main.js",
    "dev": "node src/main.js",
    "build": "pkg package.json --targets node18-win-x64 --output bootai.exe"
  }
}
```

### pkg Configuration
```json
{
  "pkg": {
    "targets": ["node18-win-x64"],
    "outputPath": "bootai.exe",
    "assets": [
      "public/**/*",
      "scripts/**/*"
    ]
  }
}
```

## Build Dependencies

### Node.js Dependencies
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "open": "^8.4.2",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "pkg": "^5.8.1"
  }
}
```

### System Requirements
- Node.js 18+
- Windows 10/11
- WSL2 with Ubuntu
- 8GB+ RAM
- Internet connection

## Build Artifacts

### Generated Files
```
BootAI/
├── bootai.exe          # Main executable
├── package.json         # Dependencies
├── package-lock.json    # Lock file
├── src/main.js         # Source code
├── public/index.html   # Web interface
├── scripts/build.sh    # Build script
└── .gitignore          # Git ignore rules
```

### Runtime Files
```
BootAI/
├── base.iso            # Downloaded base ISO
├── ai-node.iso         # Generated AI ISO
├── iso_extract/        # WSL build directory
├── iso_new/            # WSL build directory
└── iso_mount/          # WSL build directory
```

## Build Troubleshooting

### Common Build Issues

#### 1. Port Already in Use
```bash
# Error: EADDRINUSE: address already in use :::3000
# Solution:
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

#### 2. WSL Not Available
```bash
# Error: WSL command not found
# Solution:
wsl --install
wsl --set-default Ubuntu
```

#### 3. Permission Denied
```bash
# Error: Permission denied during build
# Solution:
wsl -u root bash scripts/build.sh
```

#### 4. Disk Space Issues
```bash
# Error: No space left on device
# Solution:
wsl -u root df -h
wsl -u root rm -rf /tmp/*
```

### Build Optimization

#### 1. Cache Management
```bash
# Clear WSL cache
wsl -u root rm -rf /root/bootai-cache/

# Clear build artifacts
rm -rf iso_extract iso_new iso_mount
```

#### 2. Memory Optimization
```bash
# Check memory usage
Get-Process bootai | Select-Object ProcessName, WorkingSet

# Optimize WSL memory
# Edit .wslconfig:
[wsl2]
memory=8GB
processors=4
```

#### 3. Network Optimization
```bash
# Use IPv4 for downloads
curl -4 -o base.iso -L "$ISO_URL"

# Retry failed downloads
curl --retry 3 --retry-delay 5 -o base.iso -L "$ISO_URL"
```

## Build Validation

### Pre-Build Checks
```bash
# Check Node.js version
node --version

# Check WSL status
wsl --status

# Check available disk space
wsl -u root df -h
```

### Post-Build Tests
```bash
# Test executable
.\bootai.exe

# Verify web interface
start http://localhost:3000

# Test API endpoints
curl http://localhost:3000/api/wsl-status
```

### Build Success Criteria
- [ ] Executable created (bootai.exe)
- [ ] Application starts without errors
- [ ] Web interface loads correctly
- [ ] API endpoints respond
- [ ] WSL integration works
- [ ] USB detection functions
- [ ] ISO build process completes
- [ ] Error handling works properly
