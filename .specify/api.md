# BootAI API Specification

## API Overview

BootAI provides a RESTful API for managing ISO building, USB operations, and system status. All endpoints return JSON responses and support real-time progress updates via WebSocket.

## Base URL
```
http://localhost:3000
```

## Authentication
No authentication required for local development.

## Response Format
All responses follow this format:
```json
{
  "success": boolean,
  "data": object | null,
  "error": string | null,
  "message": string | null
}
```

## WebSocket Endpoints

### WebSocket Connection
```
ws://localhost:3000
```

### WebSocket Message Types

#### Progress Update
```json
{
  "type": "progress",
  "stage": "build_progress" | "build_error" | "build_completed" | "usb_write_completed",
  "message": "string",
  "progress": number
}
```

#### Error Message
```json
{
  "type": "error",
  "message": "string"
}
```

## REST API Endpoints

### 1. USB Drive Detection

#### GET /api/usb-drives
Get list of available USB drives.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "device": "E:",
      "label": "USB Drive",
      "size": "8GB",
      "freeSpace": "7.5GB"
    }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No USB drives found"
}
```

### 2. WSL Status Check

#### GET /api/wsl-status
Check WSL installation and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "installed": true,
    "running": true,
    "distributions": ["Ubuntu"],
    "version": "2.0.0"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "WSL not installed or not running"
}
```

### 3. ISO Building

#### POST /api/build-iso
Start ISO building process.

**Request Body:**
```json
{
  "baseOs": "ubuntu-22.04" | "ubuntu-24.04" | "debian-12",
  "model": "phi3:mini" | "phi3" | "llama3" | "llama2" | "mistral"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ISO build process started"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Missing required parameters: baseOs and model"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "Invalid base OS. Must be one of: ubuntu-22.04, ubuntu-24.04, debian-12"
}
```

```json
{
  "success": false,
  "error": "Invalid model. Must be one of: phi3:mini, phi3, llama3, llama2, mistral"
}
```

### 4. USB Writing

#### POST /api/write-usb
Write ISO to USB drive.

**Request Body:**
```json
{
  "isoPath": "ai-node.iso",
  "usbDevice": "E:"
}
```

**Response:**
```json
{
  "success": true,
  "message": "USB write process started"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Missing required parameters: isoPath and usbDevice"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "Invalid ISO path. Must end with .iso"
}
```

```json
{
  "success": false,
  "error": "Invalid USB device format. Must be like \"E:\""
}
```

### 5. ISO Download

#### GET /api/download-iso
Download generated ISO file.

**Response:**
- **Content-Type**: `application/octet-stream`
- **Content-Disposition**: `attachment; filename="ai-node.iso"`
- **Content-Length**: File size in bytes

**Error Response:**
```json
{
  "success": false,
  "error": "No ISO file found. Please build an ISO first."
}
```

**Timeout Response:**
```json
{
  "success": false,
  "error": "Download timeout - file too large or connection too slow"
}
```

### 6. Cache Management

#### GET /api/cache-status
Get cache status and contents.

**Response:**
```json
{
  "success": true,
  "data": {
    "isos": [
      {
        "name": "ubuntu-22.04.5-live-server-amd64.iso",
        "size": "2.1GB",
        "path": "/root/bootai-cache/isos/ubuntu-22.04.5-live-server-amd64.iso"
      }
    ],
    "models": [
      {
        "name": "phi3:mini",
        "size": "1.2GB",
        "status": "available"
      }
    ]
  }
}
```

#### POST /api/clear-cache
Clear cache files.

**Request Body:**
```json
{
  "type": "isos" | "models" | "all"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid cache type. Must be one of: isos, models, all"
}
```

## Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (validation errors)
- **404**: Not Found (file not found)
- **408**: Request Timeout (download timeout)
- **500**: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Scenarios

#### 1. Validation Errors
- Missing required parameters
- Invalid parameter values
- Malformed request body

#### 2. System Errors
- WSL not available
- USB drive not found
- Insufficient disk space
- Network connectivity issues

#### 3. Process Errors
- Build process failure
- USB write failure
- File system errors
- Permission denied

## Rate Limiting
No rate limiting implemented for local development.

## CORS Policy
```javascript
{
  "origin": "*",
  "methods": ["GET", "POST"],
  "allowedHeaders": ["Content-Type"]
}
```

## Timeout Configuration

### Request Timeouts
- **Build Process**: 30 minutes
- **USB Write**: 10 minutes
- **File Download**: 10 minutes
- **API Requests**: 5 minutes

### WebSocket Timeouts
- **Connection**: No timeout
- **Message**: No timeout
- **Reconnection**: Automatic

## Examples

### Complete Build Workflow

#### 1. Check WSL Status
```bash
curl http://localhost:3000/api/wsl-status
```

#### 2. Start ISO Build
```bash
curl -X POST http://localhost:3000/api/build-iso \
  -H "Content-Type: application/json" \
  -d '{"baseOs":"ubuntu-22.04","model":"phi3:mini"}'
```

#### 3. Monitor Progress (WebSocket)
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'progress') {
    console.log(`${data.stage}: ${data.message} (${data.progress}%)`);
  }
};
```

#### 4. Download ISO
```bash
curl http://localhost:3000/api/download-iso -o ai-node.iso
```

#### 5. Write to USB
```bash
curl -X POST http://localhost:3000/api/write-usb \
  -H "Content-Type: application/json" \
  -d '{"isoPath":"ai-node.iso","usbDevice":"E:"}'
```

### Error Handling Example
```javascript
fetch('/api/build-iso', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ baseOs: 'ubuntu-22.04', model: 'phi3:mini' })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Build started:', data.message);
  } else {
    console.error('Build failed:', data.error);
  }
})
.catch(error => {
  console.error('Network error:', error);
});
```

## Current API Status

### Working Endpoints ✅
- **GET /api/usb-drives** - USB drive detection working
- **GET /api/wsl-status** - WSL status check working
- **POST /api/build-iso** - ISO build process working
- **GET /api/download-iso** - ISO download working
- **GET /api/cache-status** - Cache management working
- **POST /api/clear-cache** - Cache clearing working
- **WebSocket** - Real-time progress updates working

### Current Issues ⚠️
- **JSON parsing error** - Appears in terminal but non-blocking
- **POST /api/write-usb** - Needs testing with actual hardware
- **Input validation** - Working but JSON error persists

### Recent API Changes
- **Input validation** - Added comprehensive validation for all endpoints
- **Timeout handling** - Added timeout management for all operations
- **Error handling** - Improved error responses and user feedback
- **Progress streaming** - Real-time WebSocket updates
- **Cache management** - Added cache status and clearing endpoints
- **File streaming** - Improved ISO download with timeout handling

### Performance Metrics
- **API response time**: < 200ms for simple requests
- **Build process**: ~15-20 minutes for standard ISO
- **WebSocket latency**: < 100ms for progress updates
- **Memory usage**: ~50MB base + operation overhead

## Future API Enhancements

### Planned Features
- **Authentication**: User authentication and authorization
- **Rate Limiting**: API rate limiting and throttling
- **API Versioning**: Versioned API endpoints
- **Batch Operations**: Multiple ISO builds in parallel
- **Cloud Integration**: Remote build capabilities
- **Analytics**: Usage tracking and metrics
- **Webhooks**: Event notifications for external systems
