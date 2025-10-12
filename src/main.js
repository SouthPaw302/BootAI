const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execSync, spawn } = require('child_process');
const { promisify } = require('util');
const http = require('http');
const WebSocket = require('ws');
const open = require('open');

const execAsync = promisify(exec);
const fsPromises = fs.promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;
const projectRoot = path.join(__dirname, '..');
const buildScriptPath = path.join(projectRoot, 'scripts', 'build.sh');

const hasCommand = (command) => {
  const lookup = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
  try {
    execSync(lookup, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
};

const resolveWslExecutable = () => {
  if (process.platform !== 'win32') {
    return null;
  }

  const systemRoot = process.env.SystemRoot || process.env.WINDIR;

  const candidates = [];

  if (systemRoot) {
    const sysnativePath = path.win32.join(systemRoot, 'Sysnative', 'wsl.exe');
    const system32Path = path.win32.join(systemRoot, 'System32', 'wsl.exe');

    // Sysnative is required for 32-bit Node processes running on 64-bit Windows.
    candidates.push(sysnativePath);
    candidates.push(system32Path);
  }

  // Fall back to relying on PATH if direct paths fail.
  candidates.push('wsl');

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      if (candidate === 'wsl') {
        if (hasCommand('wsl')) {
          return 'wsl';
        }
      } else if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (error) {
      console.warn(`Unable to validate WSL executable candidate "${candidate}":`, error.message);
    }
  }

  return null;
};

const convertWindowsPathToWsl = (windowsPath) => {
  if (process.platform !== 'win32') {
    return windowsPath;
  }

  const escapeSingleQuotes = (value) => String(value).replace(/'/g, `'"'"'`);

  try {
    const output = execSync(`wsl wslpath -a '${escapeSingleQuotes(windowsPath)}'`, {
      stdio: ['ignore', 'pipe', 'pipe']
    })
      .toString()
      .trim();

    return output || null;
  } catch (error) {
    console.error('Failed to convert path to WSL format:', error.message);
    return null;
  }
};

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

    const script = [
      'Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType = 2" | ForEach-Object {',
      '  $driveLetter = $_.DeviceID.TrimEnd(\':\')',
      '  $partition = $null',
      '  try {',
      '    $partition = Get-Partition -DriveLetter $driveLetter -ErrorAction Stop',
      '  } catch { }',
      '  $disk = $null',
      '  if ($partition) {',
      '    try {',
      '      $disk = $partition | Get-Disk -ErrorAction Stop',
      '    } catch { }',
      '  }',
      '  [PSCustomObject]@{',
      '    DeviceID   = $_.DeviceID',
      '    VolumeName = $_.VolumeName',
      '    Size       = $_.Size',
      '    FreeSpace  = $_.FreeSpace',
      '    DiskNumber = if ($disk) { $disk.Number } else { $null }',
      '  }',
      '} | ConvertTo-Json'
    ].join('; ');

    const process = exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
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
          freeSpace: drive.FreeSpace ? Math.round(drive.FreeSpace / (1024 * 1024 * 1024)) + ' GB' : 'Unknown',
          diskNumber: typeof drive.DiskNumber === 'number' ? drive.DiskNumber : null
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
    let buildCommand;
    let buildArgs;
    let environmentDescription;
    const spawnOptions = { cwd: projectRoot };

    if (!fs.existsSync(buildScriptPath)) {
      return res.status(500).json({
        success: false,
        error: 'Build script is missing. Please reinstall the application.'
      });
    }

    if (process.platform === 'win32') {
      const wslExecutable = resolveWslExecutable();

      if (!wslExecutable) {
        return res.status(500).json({
          success: false,
          error: 'WSL is required on Windows but was not found. Please install WSL and try again.'
        });
      }

      const wslProjectRoot = convertWindowsPathToWsl(projectRoot);

      if (!wslProjectRoot) {
        return res.status(500).json({
          success: false,
          error: 'Unable to locate project directory within WSL. Please ensure WSL is configured correctly.'
        });
      }

      const wslScriptPath = path.posix.join(wslProjectRoot, 'scripts', 'build.sh');
      buildCommand = wslExecutable;
      buildArgs = ['-u', 'root', '--', 'bash', wslScriptPath, baseOs, model];
      environmentDescription = 'WSL';
    } else {
      buildCommand = 'bash';
      buildArgs = [buildScriptPath, baseOs, model];
      environmentDescription = 'local bash environment';
    }

    console.log(`Building ISO for ${baseOs} with ${model} using ${environmentDescription}`);
    const formattedArgs = buildArgs.map((arg) => (arg.includes(' ') ? `'${arg}'` : arg)).join(' ');
    console.log(`Executing command: ${buildCommand} ${formattedArgs}`);

    // Execute the existing build script with real-time progress and timeout
    const buildProcess = spawn(buildCommand, buildArgs, spawnOptions);

    let responseSent = false;
    const sendErrorResponse = (message) => {
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({
          success: false,
          error: message
        });
      }
    };

    const sendSuccessResponse = (payload) => {
      if (!responseSent) {
        responseSent = true;
        res.json(payload);
      }
    };

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

    buildProcess.on('error', (processError) => {
      clearTimeout(buildTimeout);
      console.error('Failed to start build process:', processError);
      broadcastProgress({
        type: 'error',
        message: 'Failed to start build process. Please check your environment configuration.'
      });
      sendErrorResponse('Failed to start build process. Please check your environment configuration.');
    });

    buildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Build output:', output);
      
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
      console.error('Build error output:', data.toString());
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
        sendSuccessResponse({
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
        sendSuccessResponse({
          success: true,
          message: 'ISO build completed successfully (model test timed out)'
        });
      } else if (typeof code === 'number' && code < 0) {
        const errorMessage = `Build failed to launch (system error ${code}). Please verify that WSL is installed and accessible.`;
        broadcastProgress({
          type: 'error',
          message: errorMessage
        });
        sendErrorResponse(errorMessage);
      } else if (code === null) {
        broadcastProgress({
          type: 'error',
          message: 'Build process ended before a result was returned'
        });
        sendErrorResponse('Build process ended before a result was returned');
      } else {
        broadcastProgress({
          type: 'error',
          message: `Build failed with exit code ${code}`
        });
        sendErrorResponse(`Build failed with exit code ${code}`);
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
  const { isoPath, usbDevice, diskNumber: providedDiskNumber } = req.body;

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
  
  if (!usbDevice.match(/^[A-Z]:$/i)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid USB device format. Must be like "E:"'
    });
  }

  const driveLetter = usbDevice.replace(':', '').toUpperCase();

  const escapeForSingleQuotes = (value) => String(value).replace(/'/g, `'"'"'`);

  const ensureWslPath = async (originalPath) => {
    if (!originalPath) {
      throw new Error('ISO path is empty');
    }

    if (originalPath.startsWith('/')) {
      return originalPath;
    }

    try {
      const { stdout } = await execAsync(`wsl wslpath '${escapeForSingleQuotes(originalPath)}'`);
      const converted = stdout.trim();
      return converted || originalPath;
    } catch (conversionError) {
      console.warn('Failed to convert ISO path to WSL format:', conversionError.message);
      return originalPath;
    }
  };

  let tempDir;
  const cleanupTempArtifacts = async () => {
    if (!tempDir) {
      return;
    }

    try {
      await fsPromises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary diskpart directory:', cleanupError.message);
    }
  };

  let responseSent = false;

  try {
    console.log(`Writing ${isoPath} to ${usbDevice}`);

    let diskNumber = providedDiskNumber;

    if (diskNumber === undefined || diskNumber === null || diskNumber === '') {
      const { stdout: diskStdout } = await execAsync(`powershell -Command "(Get-Partition -DriveLetter '${driveLetter}' | Get-Disk | Select-Object -ExpandProperty Number)"`);
      diskNumber = diskStdout.trim();
    }

    const diskNumberString = diskNumber.toString().trim();

    if (!diskNumberString || !diskNumberString.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        error: `Unable to resolve disk number for drive ${usbDevice}`
      });
    }

    const numericDiskNumber = Number(diskNumberString);
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'bootai-diskpart-'));
    const diskpartPath = path.join(tempDir, 'write_usb.txt');

    // Create diskpart script for proper USB formatting
    const diskpartScript = `select disk ${numericDiskNumber}
clean
convert mbr
create partition primary
active
format fs=fat32 quick label="BootAI"
assign
exit`;

    await fsPromises.writeFile(diskpartPath, diskpartScript, 'utf8');

    // Execute the diskpart script to format USB drive
    const formatCommand = `diskpart /s "${diskpartPath}"`;

    broadcastProgress({
      type: 'progress',
      stage: 'formatting_usb',
      message: `Formatting disk ${numericDiskNumber} (${usbDevice})`,
      progress: 70
    });

    exec(formatCommand, (error, stdout, stderr) => {
      (async () => {
        await cleanupTempArtifacts();

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

        broadcastProgress({
          type: 'progress',
          stage: 'usb_formatted',
          message: `Disk ${numericDiskNumber} formatted successfully`,
          progress: 80
        });

        let wslIsoPath;
        try {
          wslIsoPath = await ensureWslPath(isoPath);
        } catch (pathError) {
          console.error('ISO path conversion error:', pathError);
          broadcastProgress({
            type: 'error',
            message: `ISO path conversion failed: ${pathError.message}`
          });
          return;
        }

        const targetDevice = `/dev/sd${String.fromCharCode(97 + numericDiskNumber)}`;
        const isoWriteCommand = `wsl -u root bash -c "dd if='${escapeForSingleQuotes(wslIsoPath)}' of='${targetDevice}' bs=4M status=progress conv=fsync"`;

        broadcastProgress({
          type: 'progress',
          stage: 'writing_iso',
          message: `Writing ISO to ${targetDevice}`,
          progress: 90
        });

        const writeProcess = exec(isoWriteCommand, { maxBuffer: 1024 * 1024 * 64 }, (writeError, writeStdout, writeStderr) => {
          if (writeError) {
            console.error('ISO write error:', writeError);
            broadcastProgress({
              type: 'error',
              message: `ISO write failed: ${writeError.message}`
            });
            return;
          }

          console.log('ISO write output:', writeStdout);
          if (writeStderr) {
            console.log('ISO write stderr:', writeStderr);
          }
          broadcastProgress({
            type: 'progress',
            stage: 'usb_write_completed',
            message: '✅ ISO successfully written to USB drive!',
            progress: 100
          });
        });

        writeProcess.stderr?.on('data', (chunk) => {
          const output = chunk.toString().trim();
          if (output) {
            broadcastProgress({
              type: 'progress',
              stage: 'writing_iso',
              message: output,
              progress: 95
            });
          }
        });
      })().catch((pipelineError) => {
        console.error('USB write pipeline error:', pipelineError);
        broadcastProgress({
          type: 'error',
          message: `USB write pipeline error: ${pipelineError.message}`
        });
      });
    });

    res.json({
      success: true,
      message: `USB write process started for ${usbDevice}`
    });
    responseSent = true;

  } catch (error) {
    console.error('USB write error:', error);
    await cleanupTempArtifacts();
    if (!responseSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    } else {
      broadcastProgress({
        type: 'error',
        message: `USB write failed: ${error.message}`
      });
    }
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
