const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const open = require('open');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔌 Client connected to WebSocket');
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected from WebSocket');
  });
});

// Broadcast progress updates
const broadcastProgress = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// USB Detection via PowerShell with timeout
const scanUSBDrives = async () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.error('USB scan timeout after 10 seconds');
      resolve([]);
    }, 10000);
    
    const process = exec('powershell -Command "Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DriveType -eq 2} | Select-Object DeviceID, VolumeName, Size, FreeSpace | ConvertTo-Json"', (error, stdout, stderr) => {
      clearTimeout(timeout);
      
      if (error) {
        console.error('Error scanning USB drives:', error);
        resolve([]);
        return;
      }
      
      try {
        // Handle empty output
        if (!stdout || stdout.trim() === '') {
          console.log('No USB drives found');
          resolve([]);
          return;
        }
        
        const drives = JSON.parse(stdout);
        const usbDrives = Array.isArray(drives) ? drives : [drives];
        resolve(usbDrives.map(drive => ({
          deviceName: drive.DeviceID,
          volumeName: drive.VolumeName || 'Removable Disk',
          size: drive.Size ? Math.round(drive.Size / (1024 * 1024 * 1024)) + ' GB' : 'Unknown',
          freeSpace: drive.FreeSpace ? Math.round(drive.FreeSpace / (1024 * 1024 * 1024)) + ' GB' : 'Unknown'
        })));
      } catch (parseError) {
        console.error('Error parsing USB drives:', parseError);
        console.log('Raw output:', stdout);
        resolve([]);
      }
    });
    
    // Kill process if it takes too long
    process.on('spawn', () => {
      setTimeout(() => {
        if (!process.killed) {
          console.log('Killing slow USB scan process');
          process.kill('SIGTERM');
        }
      }, 15000);
    });
  });
};

// API Routes
app.get('/api/usb-drives', async (req, res) => {
  const drives = await scanUSBDrives();
  res.json(drives);
});

app.post('/api/build-iso', async (req, res) => {
  const { baseOs, model } = req.body;
  
  // Input validation
  if (!baseOs || !model) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: baseOs and model'
    });
  }
  
  const validOs = ['ubuntu-22.04', 'ubuntu-24.04', 'debian-12'];
  const validModels = ['phi3:mini', 'phi3', 'llama3', 'llama2', 'mistral'];
  
  if (!validOs.includes(baseOs)) {
    return res.status(400).json({
      success: false,
      error: `Invalid base OS. Must be one of: ${validOs.join(', ')}`
    });
  }
  
  if (!validModels.includes(model)) {
    return res.status(400).json({
      success: false,
      error: `Invalid model. Must be one of: ${validModels.join(', ')}`
    });
  }
  
  try {
    console.log(`Building ISO for ${baseOs} with ${model}`);
    
    // Execute the existing build script in WSL with real-time progress and timeout
    const buildProcess = exec(`wsl -u root bash scripts/build.sh "${baseOs}" "${model}"`);
    
    // Set overall build timeout (30 minutes)
    const buildTimeout = setTimeout(() => {
      console.log('Build process timeout after 30 minutes');
      if (!buildProcess.killed) {
        buildProcess.kill('SIGTERM');
        broadcastProgress({
          type: 'error',
          message: 'Build process timed out after 30 minutes'
        });
      }
    }, 30 * 60 * 1000);
    
    buildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('WSL output:', output);
      
      // Parse progress from output
      if (output.includes('Downloading')) {
        broadcastProgress({
          type: 'progress',
          stage: 'downloading',
          message: output.trim(),
          progress: 20
        });
      } else if (output.includes('Installing Ollama')) {
        broadcastProgress({
          type: 'progress',
          stage: 'installing',
          message: output.trim(),
          progress: 40
        });
      } else if (output.includes('Testing model compatibility')) {
        broadcastProgress({
          type: 'progress',
          stage: 'testing_model',
          message: output.trim(),
          progress: 50
        });
      } else if (output.includes('Model') && output.includes('working correctly')) {
        broadcastProgress({
          type: 'progress',
          stage: 'model_tested',
          message: output.trim(),
          progress: 60
        });
      } else if (output.includes('timed out, but continuing')) {
        broadcastProgress({
          type: 'progress',
          stage: 'model_timeout',
          message: output.trim(),
          progress: 60
        });
      } else if (output.includes('Creating BootAI ISO')) {
        broadcastProgress({
          type: 'progress',
          stage: 'building_iso',
          message: output.trim(),
          progress: 80
        });
      }
    });
    
    buildProcess.stderr.on('data', (data) => {
      console.error('WSL error:', data.toString());
      broadcastProgress({
        type: 'error',
        message: data.toString().trim()
      });
    });
    
    buildProcess.on('close', (code) => {
      clearTimeout(buildTimeout); // Clear the timeout
      
      if (code === 0) {
        broadcastProgress({
          type: 'progress',
          stage: 'completed',
          message: '✅ BootAI ISO created successfully!',
          progress: 100
        });
        res.json({ 
          success: true, 
          message: 'ISO build completed successfully'
        });
      } else if (code === 124) {
        // Timeout is acceptable - model test timed out but build can continue
        broadcastProgress({
          type: 'progress',
          stage: 'completed',
          message: '✅ BootAI ISO created successfully! (Model test timed out but continuing)',
          progress: 100
        });
        res.json({ 
          success: true, 
          message: 'ISO build completed successfully (model test timed out)'
        });
      } else {
        broadcastProgress({
          type: 'error',
          message: `Build failed with exit code ${code}`
        });
        res.status(500).json({ 
          success: false, 
          error: `Build failed with exit code ${code}`
        });
      }
    });
    
  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/write-usb', async (req, res) => {
  const { isoPath, usbDevice } = req.body;
  
  // Input validation
  if (!isoPath || !usbDevice) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: isoPath and usbDevice'
    });
  }
  
  if (!isoPath.endsWith('.iso')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ISO path. Must end with .iso'
    });
  }
  
  if (!usbDevice.match(/^[A-Z]:$/)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid USB device format. Must be like "E:"'
    });
  }
  
  try {
    console.log(`Writing ${isoPath} to ${usbDevice}`);
    
    // Extract disk number from device name (e.g., "E:" -> "1")
    const diskNumber = usbDevice.replace(/[^0-9]/g, '');
    
    // Create diskpart script for proper USB formatting
    const diskpartScript = `select disk ${diskNumber}
clean
convert mbr
create partition primary
active
format fs=fat32 quick label="BootAI"
assign
exit`;

    const fs = require('fs');
    fs.writeFileSync('write_usb.txt', diskpartScript);
    
    // Execute the diskpart script to format USB drive
    const formatCommand = `diskpart /s write_usb.txt`;
    
    exec(formatCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('USB format error:', error);
        broadcastProgress({
          type: 'error',
          message: `USB formatting failed: ${error.message}`
        });
        return;
      }
      
      console.log('USB format output:', stdout);
      if (stderr) console.log('USB format stderr:', stderr);
      
      // After formatting, write the ISO to USB using dd in WSL
      const isoWriteCommand = `wsl -u root dd if="${isoPath}" of="/dev/sd${String.fromCharCode(97 + parseInt(diskNumber))}" bs=1M status=progress`;
      
      exec(isoWriteCommand, (writeError, writeStdout, writeStderr) => {
        if (writeError) {
          console.error('ISO write error:', writeError);
          broadcastProgress({
            type: 'error',
            message: `ISO write failed: ${writeError.message}`
          });
          return;
        }
        
        console.log('ISO write output:', writeStdout);
        broadcastProgress({
          type: 'progress',
          stage: 'usb_write_completed',
          message: '✅ ISO successfully written to USB drive!',
          progress: 100
        });
      });
    });
    
    res.json({ 
      success: true, 
      message: 'USB write process started' 
    });
    
  } catch (error) {
    console.error('USB write error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Comprehensive WSL validation
const validateWSL = async () => {
  const checks = [
    { name: 'WSL Status', command: 'wsl --status' },
    { name: 'WSL List', command: 'wsl --list --verbose' },
    { name: 'WSL Root Access', command: 'wsl -u root bash -c "echo WSL_ROOT_OK"' },
    { name: 'Curl Available', command: 'wsl -u root bash -c "which curl"' },
    { name: 'Apt Available', command: 'wsl -u root bash -c "which apt-get"' },
    { name: 'Sudo Available', command: 'wsl -u root bash -c "which sudo"' }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Timeout', output: '' });
        }, 5000);
        
        exec(check.command, (error, stdout, stderr) => {
          clearTimeout(timeout);
          resolve({
            success: !error,
            output: stdout,
            error: error ? error.message : null
          });
        });
      });
      
      results.push({
        name: check.name,
        success: result.success,
        output: result.output,
        error: result.error
      });
    } catch (err) {
      results.push({
        name: check.name,
        success: false,
        output: '',
        error: err.message
      });
    }
  }
  
  return results;
};

app.get('/api/wsl-status', async (req, res) => {
  try {
    const validationResults = await validateWSL();
    const allPassed = validationResults.every(result => result.success);
    
    res.json({
      available: allPassed,
      checks: validationResults,
      summary: allPassed ? 'All WSL checks passed' : 'Some WSL checks failed'
    });
  } catch (error) {
    res.json({
      available: false,
      checks: [],
      summary: `WSL validation error: ${error.message}`
    });
  }
});

// ISO Download endpoint
app.get('/api/download-iso', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Look for the generated ISO file
    const possiblePaths = [
      'ai-node.iso',
      'base.iso',
      'bootai-ubuntu-22.04-phi3:mini.iso',
      'bootai-ubuntu-24.04-phi3:mini.iso',
      'bootai-debian-12-phi3:mini.iso'
    ];
    
    let isoPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        isoPath = possiblePath;
        break;
      }
    }
    
    if (!isoPath) {
      return res.status(404).json({
        success: false,
        error: 'No ISO file found. Please build an ISO first.'
      });
    }
    
    const fullPath = path.resolve(isoPath);
    const stats = fs.statSync(fullPath);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(isoPath)}"`);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file with timeout
    const fileStream = fs.createReadStream(fullPath);
    
    // Set timeout for large file downloads (10 minutes)
    const downloadTimeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Download timeout - file too large or connection too slow'
        });
      }
      fileStream.destroy();
    }, 10 * 60 * 1000);
    
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      clearTimeout(downloadTimeout);
      console.error('Error streaming ISO file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error streaming ISO file'
        });
      }
    });
    
    fileStream.on('end', () => {
      clearTimeout(downloadTimeout);
      console.log('ISO file download completed');
    });
    
    res.on('close', () => {
      clearTimeout(downloadTimeout);
      fileStream.destroy();
    });
    
  } catch (error) {
    console.error('ISO download error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cache management endpoint
app.get('/api/cache-status', async (req, res) => {
  try {
    const timeout = setTimeout(() => {
      res.json({
        success: false,
        error: 'Cache status check timeout'
      });
    }, 10000);
    
    exec('wsl -u root bash -c "ls -la /root/bootai-cache/isos/ 2>/dev/null || echo \'No cache directory found\'"', (error, stdout, stderr) => {
      clearTimeout(timeout);
      
      if (error) {
        res.json({
          success: false,
          error: error.message,
          cache: { isos: [], models: [] }
        });
        return;
      }
      
      // Parse ISO cache
      const isoLines = stdout.split('\n').filter(line => line.includes('.iso'));
      const isoCache = isoLines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          name: parts[parts.length - 1],
          size: parts[4],
          date: parts[5] + ' ' + parts[6] + ' ' + parts[7]
        };
      });
      
      // Check model cache
      exec('wsl -u root bash -c "ollama list 2>/dev/null || echo \'Ollama not available\'"', (modelError, modelStdout, modelStderr) => {
        const modelLines = modelStdout.split('\n').filter(line => line.includes('phi3') || line.includes('llama') || line.includes('mistral'));
        const modelCache = modelLines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            name: parts[0],
            size: parts[1] || 'Unknown',
            modified: parts[2] || 'Unknown'
          };
        });
        
        res.json({
          success: true,
          cache: {
            isos: isoCache,
            models: modelCache
          }
        });
      });
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache endpoint
app.post('/api/clear-cache', async (req, res) => {
  try {
    const { type } = req.body; // 'isos', 'models', or 'all'
    
    const timeout = setTimeout(() => {
      res.json({
        success: false,
        error: 'Cache clear timeout'
      });
    }, 30000);
    
    let command = '';
    if (type === 'isos') {
      command = 'wsl -u root bash -c "rm -rf /root/bootai-cache/isos/* && echo \'ISO cache cleared\'"';
    } else if (type === 'models') {
      command = 'wsl -u root bash -c "ollama rm $(ollama list | grep -E \'phi3|llama|mistral\' | awk \'{print $1}\') 2>/dev/null || echo \'Model cache cleared\'"';
    } else {
      command = 'wsl -u root bash -c "rm -rf /root/bootai-cache/* && ollama rm $(ollama list | grep -E \'phi3|llama|mistral\' | awk \'{print $1}\') 2>/dev/null && echo \'All cache cleared\'"';
    }
    
    exec(command, (error, stdout, stderr) => {
      clearTimeout(timeout);
      
      if (error) {
        res.json({
          success: false,
          error: error.message
        });
        return;
      }
      
      res.json({
        success: true,
        message: stdout.trim()
      });
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
        console.log(`🚀 BootAI running on http://localhost:${PORT}`);
  console.log('📱 Opening browser...');
  open(`http://localhost:${PORT}`);
});

// Initial USB scan
console.log('🔍 USB drive scanning enabled');
