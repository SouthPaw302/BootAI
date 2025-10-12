# BootAI Deployment Specification

## Deployment Overview

BootAI is deployed as a single Windows executable that provides a complete AI-powered Linux ISO building solution. The deployment process is designed to be simple and self-contained.

## Deployment Architecture

### 1. Single Executable Deployment
```
BootAI/
├── bootai.exe (40MB) - Main executable
├── package.json - Dependencies and metadata
├── README.md - User documentation
├── LICENSE - MIT license
└── .gitignore - Git ignore rules
```

### 2. Runtime Dependencies
- **Windows 10/11** with WSL2 installed
- **Node.js 18+** (bundled with executable)
- **WSL2 with Ubuntu** distribution
- **PowerShell 5.1+** (Windows built-in)
- **Modern web browser** (Chrome, Firefox, Edge)

### 3. System Requirements
- **RAM**: 8GB+ (16GB+ recommended for larger models)
- **Storage**: 10GB+ free space for ISOs and cache
- **USB Drive**: 8GB+ capacity for writing ISOs
- **Internet**: Connection for initial downloads
- **CPU**: x64 architecture

## Deployment Process

### 1. Development Build
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Access application
# Browser: http://localhost:3000
```

### 2. Production Build
```bash
# Create executable
npm run build

# Output: bootai.exe (~40MB)
# Type: Windows executable
# Target: Windows x64
```

### 3. Distribution
```bash
# GitHub Releases
# 1. Tag release version
git tag v1.0.0
git push origin v1.0.0

# 2. Create GitHub release
# 3. Upload bootai.exe
# 4. Add release notes
```

## Installation Process

### 1. Download
```bash
# Download from GitHub Releases
wget https://github.com/SouthPaw302/BootAI/releases/latest/download/bootai.exe
```

### 2. Prerequisites Check
```bash
# Check Windows version
systeminfo | findstr "OS Name"

# Check WSL installation
wsl --status

# Check WSL distributions
wsl --list --verbose
```

### 3. First Run
```bash
# Run executable
.\bootai.exe

# Automatic browser opening
# URL: http://localhost:3000
# WebSocket connection established
```

## Configuration Management

### 1. Application Configuration
```javascript
// Default configuration
const config = {
  port: 3000,
  wslUser: 'root',
  cacheDir: '/root/bootai-cache',
  timeout: {
    build: 30 * 60 * 1000, // 30 minutes
    usb: 10 * 60 * 1000,   // 10 minutes
    download: 10 * 60 * 1000 // 10 minutes
  }
};
```

### 2. WSL Configuration
```bash
# .wslconfig file
[wsl2]
memory=8GB
processors=4
swap=2GB
```

### 3. Cache Configuration
```bash
# Cache directories
/root/bootai-cache/
├── isos/          # Downloaded ISOs
├── models/        # AI models
└── temp/          # Temporary files
```

## Runtime Management

### 1. Process Management
```bash
# Start application
.\bootai.exe

# Check if running
netstat -an | findstr :3000

# Stop application
taskkill /F /IM bootai.exe
```

### 2. Resource Monitoring
```bash
# Check memory usage
Get-Process bootai | Select-Object ProcessName, WorkingSet

# Check disk usage
wsl -u root df -h

# Check network connections
netstat -an | findstr :3000
```

### 3. Log Management
```bash
# Application logs
# Console output for debugging
# WebSocket connection logs
# WSL operation logs
```

## Security Considerations

### 1. Application Security
- **No sensitive data storage** - All operations are temporary
- **Input validation** - Server-side validation for all inputs
- **Error handling** - Comprehensive error management
- **Process isolation** - WSL operations isolated from Windows

### 2. System Security
- **USB operations** - User confirmation required
- **File permissions** - Proper permission handling
- **Network security** - Local-only communication
- **WSL security** - Isolated Linux environment

### 3. Data Protection
- **Cache encryption** - Not implemented (future enhancement)
- **ISO validation** - File integrity checks
- **Model verification** - Ollama model validation
- **Cleanup procedures** - Automatic temporary file cleanup

## Performance Optimization

### 1. Build Performance
- **Caching system** - Prevents re-downloading ISOs and models
- **Parallel operations** - Concurrent download and processing
- **Resource management** - Efficient memory and CPU usage
- **Timeout handling** - Prevents hanging operations

### 2. Runtime Performance
- **Single executable** - No installation required
- **Minimal dependencies** - Self-contained application
- **Efficient I/O** - Optimized file operations
- **Memory management** - Automatic garbage collection

### 3. Network Performance
- **IPv4 preference** - Faster download speeds
- **Retry logic** - Automatic retry for failed downloads
- **Progress streaming** - Real-time progress updates
- **Connection pooling** - Efficient network usage

## Monitoring and Observability

### 1. Application Monitoring
- **Process status** - Running/stopped state
- **Port binding** - Port 3000 availability
- **Memory usage** - RAM consumption tracking
- **CPU usage** - Processor utilization

### 2. Build Monitoring
- **Progress tracking** - Real-time build progress
- **Error logging** - Comprehensive error tracking
- **Performance metrics** - Build time and resource usage
- **Success/failure rates** - Build reliability tracking

### 3. System Monitoring
- **WSL status** - WSL availability and health
- **Disk space** - Available storage monitoring
- **Network connectivity** - Internet connection status
- **USB drive detection** - USB drive availability

## Troubleshooting

### 1. Common Issues
```bash
# Port already in use
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force

# WSL not available
wsl --install
wsl --set-default Ubuntu

# Permission denied
wsl -u root bash scripts/build.sh

# Disk space issues
wsl -u root df -h
wsl -u root rm -rf /tmp/*
```

### 2. Error Recovery
- **Automatic retry** - Built-in retry mechanisms
- **Graceful degradation** - Application continues on non-critical errors
- **User feedback** - Clear error messages with suggested actions
- **Logging** - Comprehensive error logging for debugging

### 3. Support Resources
- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - README.md and CONTRIBUTING.md
- **Debug commands** - .cursor/commands/debug.md
- **Spec Kit** - Complete project documentation

## Current Deployment Status

### Working Components ✅
- **Single executable** - bootai.exe (40MB) working
- **Application startup** - Runs on port 3000
- **Web interface** - Step-by-step wizard functional
- **WSL integration** - Build process working
- **ISO creation** - ai-node.iso generated successfully
- **Caching system** - Prevents re-downloads
- **Progress tracking** - Real-time WebSocket updates
- **Error handling** - Comprehensive error management

### Current Issues ⚠️
- **JSON parsing error** - Appears in terminal but non-blocking
- **USB writing** - Needs testing with actual hardware
- **Different OS/model combinations** - Needs comprehensive testing

### Recent Deployment Achievements
- **Fixed Ubuntu Server compatibility** - Resolved squashfs extraction issues
- **Implemented caching** - Added persistent cache directories
- **Added timeout handling** - Comprehensive timeout management
- **Improved error handling** - Better user feedback and recovery
- **Updated GitHub repository** - Force-pushed latest code
- **Initialized Spec Kit** - Complete documentation and debugging tools

### Performance Metrics
- **Build time**: ~15-20 minutes for Ubuntu 22.04 + Phi-3 mini
- **ISO size**: ~1.5GB (ai-node.iso)
- **Memory usage**: ~50MB base + operation overhead
- **Startup time**: < 10 seconds
- **API response time**: < 200ms for simple requests

## Future Deployment Enhancements

### Planned Features
- **Auto-updater** - Automatic application updates
- **Cloud deployment** - Remote build capabilities
- **Multi-platform support** - Linux and macOS versions
- **Docker containerization** - Containerized deployment
- **Kubernetes support** - Orchestrated deployment
- **CI/CD pipeline** - Automated build and deployment
- **Monitoring dashboard** - Real-time monitoring interface
- **Analytics integration** - Usage tracking and metrics
