# BootAI Architecture Specification

## System Architecture Overview

BootAI follows a monolithic architecture with clear separation of concerns between frontend, backend, and Linux integration components.

## Component Architecture

### 1. Frontend Layer (Web Interface)
```
public/index.html
├── HTML Structure
├── CSS Styling
├── JavaScript Logic
│   ├── WebSocket Connection
│   ├── Progress Tracking
│   ├── Form Validation
│   ├── API Communication
│   └── Error Handling
└── User Experience
    ├── Step-by-step Wizard
    ├── Real-time Progress
    ├── Download Management
    └── USB Drive Selection
```

### 2. Backend Layer (Node.js Server)
```
src/main.js
├── Express Server Setup
├── WebSocket Server
├── API Endpoints
│   ├── /api/usb-drives (GET)
│   ├── /api/wsl-status (GET)
│   ├── /api/build-iso (POST)
│   ├── /api/write-usb (POST)
│   ├── /api/download-iso (GET)
│   ├── /api/cache-status (GET)
│   └── /api/clear-cache (POST)
├── Middleware
│   ├── CORS
│   ├── JSON Parsing
│   ├── Error Handling
│   └── Timeout Management
└── Process Management
    ├── WSL Integration
    ├── USB Operations
    ├── File Streaming
    └── Progress Broadcasting
```

### 3. Linux Integration Layer (WSL2)
```
scripts/build.sh
├── System Validation
├── ISO Download & Caching
├── Ollama Installation
├── Model Management
├── Filesystem Operations
│   ├── ISO Mounting
│   ├── Filesystem Extraction
│   ├── Service Configuration
│   └── ISO Rebuilding
└── Error Handling
    ├── Network Retry Logic
    ├── Permission Management
    ├── Disk Space Validation
    └── Process Timeout
```

## Data Flow Architecture

### 1. User Interaction Flow
```
User → Web Interface → JavaScript → WebSocket → Backend → WSL → Linux Operations
```

### 2. Build Process Flow
```
User Input → Validation → WSL Script → ISO Download → Ollama Install → Model Pull → Filesystem Extract → Service Config → ISO Rebuild → Progress Updates → Completion
```

### 3. USB Writing Flow
```
User Selection → Drive Validation → Diskpart Script → Format Drive → DD Command → ISO Write → Verification → Completion
```

## Communication Patterns

### 1. WebSocket Communication
- **Purpose**: Real-time progress updates
- **Protocol**: WebSocket over HTTP
- **Message Types**: progress, error, completion
- **Frequency**: Every 2-5 seconds during operations

### 2. REST API Communication
- **Purpose**: User actions and data retrieval
- **Protocol**: HTTP/HTTPS
- **Methods**: GET, POST
- **Content-Type**: application/json

### 3. WSL Communication
- **Purpose**: Linux operations execution
- **Protocol**: Command-line execution
- **Method**: exec() with timeout
- **Output**: stdout/stderr streaming

## Storage Architecture

### 1. Local Storage
```
BootAI/
├── Cache Directories
│   ├── /root/bootai-cache/isos/ (WSL)
│   └── /root/bootai-cache/models/ (WSL)
├── Build Artifacts
│   ├── iso_extract/ (temporary)
│   ├── iso_new/ (temporary)
│   └── iso_mount/ (temporary)
├── Generated Files
│   ├── base.iso (downloaded)
│   ├── ai-node.iso (generated)
│   └── write_usb.txt (temporary)
└── Configuration
    ├── package.json
    ├── .gitignore
    └── .cursor/ (Spec Kit)
```

### 2. Memory Management
- **Node.js Process**: ~50MB base + operation overhead
- **WSL Memory**: Configurable via .wslconfig
- **Cache Management**: Automatic cleanup of temporary files
- **ISO Storage**: Persistent until manually cleared

## Security Architecture

### 1. Input Validation
- **Frontend**: Client-side validation for UX
- **Backend**: Server-side validation for security
- **WSL**: Parameter sanitization and validation

### 2. Process Isolation
- **WSL**: Linux operations isolated from Windows
- **USB Operations**: Confirmation required for destructive actions
- **File Operations**: Permission checks and validation

### 3. Error Handling
- **Graceful Degradation**: Application continues on non-critical errors
- **User Feedback**: Clear error messages with suggested actions
- **Logging**: Comprehensive error logging for debugging

## Performance Architecture

### 1. Caching Strategy
- **ISO Caching**: Prevents re-downloading base ISOs
- **Model Caching**: Prevents re-downloading AI models
- **File Validation**: Ensures cache integrity
- **Cleanup**: Automatic removal of old cache files

### 2. Concurrency Management
- **Single Build Process**: Prevents resource conflicts
- **Timeout Handling**: Prevents hanging operations
- **Progress Streaming**: Real-time updates without blocking

### 3. Resource Optimization
- **Memory Usage**: Efficient file streaming
- **Disk Usage**: Temporary file cleanup
- **Network Usage**: IPv4 preference and retry logic

## Deployment Architecture

### 1. Single Executable
- **Tool**: pkg for Node.js packaging
- **Target**: Windows x64
- **Dependencies**: Bundled with executable
- **Size**: ~40MB compressed

### 2. Runtime Requirements
- **Windows**: 10/11 with WSL2
- **RAM**: 8GB+ (16GB+ recommended)
- **Storage**: 10GB+ free space
- **Network**: Internet for initial downloads

### 3. Distribution
- **GitHub Releases**: Primary distribution method
- **Versioning**: Semantic versioning
- **Updates**: Manual download and replacement

## Monitoring and Observability

### 1. Progress Tracking
- **WebSocket**: Real-time progress updates
- **Stages**: Download, install, extract, rebuild, write
- **Percentage**: Completion percentage for each stage

### 2. Error Monitoring
- **Console Logging**: Detailed error information
- **User Feedback**: User-friendly error messages
- **Recovery**: Automatic retry mechanisms

### 3. Performance Metrics
- **Build Time**: Total time for ISO creation
- **Download Speed**: Network performance monitoring
- **Resource Usage**: Memory and CPU utilization

## Scalability Considerations

### 1. Horizontal Scaling
- **Single Instance**: Designed for single-user operation
- **Resource Limits**: WSL memory and disk constraints
- **Concurrency**: Limited by system resources

### 2. Vertical Scaling
- **RAM Scaling**: Better performance with more RAM
- **Storage Scaling**: More cache capacity with more disk
- **CPU Scaling**: Faster builds with more CPU cores

### 3. Future Enhancements
- **Multi-user Support**: Web-based multi-tenant architecture
- **Cloud Integration**: Remote build capabilities
- **Distributed Caching**: Shared cache across instances

## Current Project Status

### Working Components ✅
- **Application startup and web interface** - BootAI runs on port 3000
- **WSL integration and build process** - ISO build completes successfully
- **ISO creation** - ai-node.iso generated (1.5GB+ file)
- **Caching system** - Prevents re-downloading ISOs and models
- **WebSocket progress tracking** - Real-time updates during build
- **API endpoint functionality** - All endpoints respond correctly
- **Ollama integration** - Phi-3 mini model successfully pulled
- **Ubuntu Server compatibility** - Fixed squashfs extraction issues

### Current Issues ⚠️
- **JSON parsing error** - Appears in terminal but non-blocking
- **USB writing functionality** - Needs testing with actual hardware
- **Different OS/model combinations** - Needs comprehensive testing
- **WSL systemd warnings** - Expected behavior, not critical

### Architecture Status
- **Frontend Layer**: ✅ Fully functional web interface
- **Backend Layer**: ✅ Express server with WebSocket working
- **Linux Integration**: ✅ WSL2 + Bash scripts operational
- **Storage Architecture**: ✅ Cache system implemented
- **Security Architecture**: ✅ Input validation and error handling
- **Performance Architecture**: ✅ Caching and timeout management

### Recent Architectural Changes
- **Minimal Filesystem Approach**: Replaced complex squashfs extraction
- **Cache Implementation**: Added persistent cache directories
- **Timeout Management**: Added comprehensive timeout handling
- **Error Recovery**: Implemented graceful error handling
- **Progress Streaming**: Real-time WebSocket updates
- **Input Validation**: Server-side validation for all endpoints
