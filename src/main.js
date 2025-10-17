const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execSync, execFile, spawn } = require('child_process');
const { promisify } = require('util');
const http = require('http');
const WebSocket = require('ws');
const open = require('open');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const fsPromises = fs.promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;
const projectRoot = path.join(__dirname, '..');
const buildScriptPath = path.join(projectRoot, 'scripts', 'build.sh');
const publicDir = path.join(projectRoot, 'public');

const escapeForSingleQuotes = (value) => String(value).replace(/'/g, `'"'"'`);
 codex/perform-deep-error-scan-and-report-0n0491
const wslPathCache = new Map();


main
const ensureWslPath = async (originalPath) => {
  if (!originalPath) {
    throw new Error('Path cannot be empty');
  }

  if (originalPath.startsWith('/')) {
    return originalPath;
  }

  if (process.platform !== 'win32') {
    return originalPath;
  }

codex/perform-deep-error-scan-and-report-0n0491
  const cacheKey = originalPath;
  if (wslPathCache.has(cacheKey)) {
    return wslPathCache.get(cacheKey);
  }

  try {
    const { stdout } = await execFileAsync('wsl', ['wslpath', '-a', originalPath]);
    const converted = stdout.trim();
    if (converted) {
      wslPathCache.set(cacheKey, converted);
      return converted;
    }
  } catch (conversionError) {
    console.warn('Failed to convert path to WSL format:', conversionError.message);
  }

  const normalized = originalPath.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    const driveLetter = normalized[0].toLowerCase();
    const fallback = `/mnt/${driveLetter}${normalized.slice(2)}`;
    wslPathCache.set(cacheKey, fallback);
    return fallback;
  }

  wslPathCache.set(cacheKey, normalized);
  return normalized;

  try {
    const { stdout } = await execAsync(`wsl wslpath '${escapeForSingleQuotes(originalPath)}'`);
    const converted = stdout.trim();
    return converted || originalPath;
  } catch (conversionError) {
    console.warn('Failed to convert path to WSL format:', conversionError.message);
    return originalPath;
  }
 main
};

const sanitizeModelIdentifier = (model) => String(model).replace(/[:\s]+/g, '-');
const buildIsoFilename = (baseOs, model) => {
  if (!baseOs || !model) {
    throw new Error('Both baseOs and model are required to build ISO filename');
  }

  return `bootai-${String(baseOs).toLowerCase()}-${sanitizeModelIdentifier(model).toLowerCase()}.iso`;
};
 codex/perform-deep-error-scan-and-report-0n0491
const isBootaiIsoName = (filename) => filename === 'bootai-latest.iso' || filename === 'ai-node.iso' || /^bootai-[a-z0-9.-]+\.iso$/i.test(filename);

const isBootaiIsoName = (filename) => filename === 'ai-node.iso' || /^bootai-[a-z0-9.-]+\.iso$/i.test(filename);
main

const SIZE_TOLERANCE_BYTES = 10 * 1024 * 1024; // 10 MiB tolerance for size comparisons

const parseSizeToBytes = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value).trim().toUpperCase();
  const matches = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([KMGTPEZY]?)(I?B)?$/);

  if (!matches) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const amount = parseFloat(matches[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const unit = matches[2];
  const multipliers = {
    '': 1,
    K: 1024,
    M: 1024 ** 2,
    G: 1024 ** 3,
    T: 1024 ** 4,
    P: 1024 ** 5,
    E: 1024 ** 6,
    Z: 1024 ** 7,
    Y: 1024 ** 8
  };

  const multiplier = multipliers[unit] || 1;
  return Math.round(amount * multiplier);
};

const resolveWslBlockDevice = async (diskNumber) => {
  const numericDisk = Number(diskNumber);
  if (!Number.isInteger(numericDisk) || numericDisk < 0) {
    throw new Error(`Invalid disk number '${diskNumber}'`);
  }

  if (process.platform !== 'win32') {
    return `/dev/sd${String.fromCharCode(97 + numericDisk)}`;
  }

  let diskMetadata;
  try {
    const { stdout } = await execAsync(`powershell -Command "Get-Disk -Number ${numericDisk} | Select-Object -Property SerialNumber,Size,Model | ConvertTo-Json"`);
    diskMetadata = JSON.parse(stdout || 'null');
  } catch (diskError) {
    throw new Error(`Unable to inspect Windows disk ${numericDisk}: ${diskError.message}`);
  }

  if (Array.isArray(diskMetadata)) {
    diskMetadata = diskMetadata[0];
  }

  if (!diskMetadata) {
    throw new Error(`No metadata returned for Windows disk ${numericDisk}`);
  }

  const windowsSerial = (diskMetadata.SerialNumber || '').trim();
  const windowsSize = parseSizeToBytes(diskMetadata.Size);
  const windowsModel = (diskMetadata.Model || '').trim().toLowerCase();

  let lsblkOutput;
  try {
    const { stdout } = await execAsync('wsl -u root bash -c "lsblk -J -o NAME,SERIAL,SIZE,MODEL,TYPE"');
    lsblkOutput = JSON.parse(stdout || '{}');
  } catch (lsblkError) {
    throw new Error(`Unable to query block devices inside WSL: ${lsblkError.message}`);
  }

  const blockDevices = Array.isArray(lsblkOutput.blockdevices) ? lsblkOutput.blockdevices : [];
  const disks = blockDevices.filter(device => device.type === 'disk');

  const findMatchBySerial = () => {
    if (!windowsSerial) {
      return null;
    }

    const matches = disks.filter(device => (device.serial || '').trim().toLowerCase() === windowsSerial.toLowerCase());
    return matches.length === 1 ? matches[0] : null;
  };

  const findMatchBySize = () => {
    if (!windowsSize) {
      return [];
    }

    return disks.filter(device => {
      const deviceSize = parseSizeToBytes(device.size);
      return deviceSize && Math.abs(deviceSize - windowsSize) <= SIZE_TOLERANCE_BYTES;
    });
  };

  const serialMatch = findMatchBySerial();
  if (serialMatch) {
    return `/dev/${serialMatch.name}`;
  }

  const sizeMatches = findMatchBySize();
  if (sizeMatches.length === 1) {
    return `/dev/${sizeMatches[0].name}`;
  }

  if (sizeMatches.length > 1 && windowsModel) {
    const modelMatches = sizeMatches.filter(device => (device.model || '').toLowerCase().includes(windowsModel));
    if (modelMatches.length === 1) {
      return `/dev/${modelMatches[0].name}`;
    }
  }

  const diagnosticSummary = disks.map(device => ({
    name: device.name,
    serial: device.serial,
    size: device.size,
    model: device.model
  }));
  console.error('Unable to map Windows disk to WSL block device', {
    diskNumber: numericDisk,
    windowsSerial,
    windowsSize,
    windowsModel,
    candidates: diagnosticSummary
  });

  throw new Error('Unable to determine the correct WSL block device for the selected disk. Please ensure it is attached and try again.');
};

const hasCommand = (command) => {
  const lookup = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
  try {
    execSync(lookup, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
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
app.use(express.static(publicDir));

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
    let environmentDescription;

    if (process.platform === 'win32') {
      if (!hasCommand('wsl')) {
        return res.status(500).json({
          success: false,
          error: 'WSL is required on Windows but was not found. Please install WSL and try again.'
        });
      }

 codex/perform-deep-error-scan-and-report-0n0491
      const wslProjectRoot = await ensureWslPath(projectRoot);
      const escapedProjectRoot = escapeForSingleQuotes(wslProjectRoot);
      const escapedBaseOs = escapeForSingleQuotes(baseOs);
      const escapedModel = escapeForSingleQuotes(model);
      const wslCommand = `cd '${escapedProjectRoot}' && bash './scripts/build.sh' '${escapedBaseOs}' '${escapedModel}'`;
      buildCommand = `wsl -u root bash -c "${wslCommand}"`;

      const wslBuildScriptPath = await ensureWslPath(buildScriptPath);
      const escapedScript = escapeForSingleQuotes(wslBuildScriptPath);
      const escapedBaseOs = escapeForSingleQuotes(baseOs);
      const escapedModel = escapeForSingleQuotes(model);
      buildCommand = `wsl -u root bash -c "bash '${escapedScript}' '${escapedBaseOs}' '${escapedModel}'"`;
main
      environmentDescription = 'WSL';
    } else {
      buildCommand = `bash "${buildScriptPath}" "${baseOs}" "${model}"`;
      environmentDescription = 'local bash environment';
    }

    console.log(`Building ISO for ${baseOs} with ${model} using ${environmentDescription}`);

    let lastErrorOutput = '';

    // Execute the existing build script with real-time progress and timeout
    const buildProcess = spawn(buildCommand, {
      cwd: projectRoot,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let responseSent = false;
    const sendErrorResponse = (statusCode, payload) => {
      if (!responseSent) {
        responseSent = true;
        res.status(statusCode).json(payload);
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
    
    buildProcess.stdout?.on('data', (data) => {
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
    
    buildProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      console.error('WSL error:', message);
      const trimmed = message.trim();
      if (trimmed) {
        lastErrorOutput = trimmed;
      }
      broadcastProgress({
        type: 'error',
        message: trimmed || message
      });
    });
    
    buildProcess.on('error', (spawnError) => {
      clearTimeout(buildTimeout);
      console.error('Build process failed to start:', spawnError);
      broadcastProgress({
        type: 'error',
        message: `Failed to start build process: ${spawnError.message}`
      });
      sendErrorResponse(500, {
        success: false,
        error: `Failed to start build process: ${spawnError.message}`
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
      } else {
        broadcastProgress({
          type: 'error',
          message: `Build failed with exit code ${code}`
        });
        sendErrorResponse(500, {
          success: false,
          error: `Build failed with exit code ${code}`,
          details: lastErrorOutput || undefined
        });
      }
    });

  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stderr || error.stdout || undefined
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
    const isoAbsolutePath = path.isAbsolute(isoPath) ? isoPath : path.join(projectRoot, isoPath);

    try {
      await fsPromises.access(isoAbsolutePath, fs.constants.R_OK);
    } catch (accessError) {
      return res.status(404).json({
        success: false,
        error: `ISO file not found or inaccessible at ${isoAbsolutePath}`
      });
    }

    console.log(`Writing ${isoAbsolutePath} to ${usbDevice}`);

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
          wslIsoPath = await ensureWslPath(isoAbsolutePath);
        } catch (pathError) {
          console.error('ISO path conversion error:', pathError);
          broadcastProgress({
            type: 'error',
            message: `ISO path conversion failed: ${pathError.message}`
          });
          return;
        }

        let targetDevice;
        try {
          targetDevice = await resolveWslBlockDevice(numericDiskNumber);
        } catch (mappingError) {
          console.error('Disk mapping error:', mappingError);
          broadcastProgress({
            type: 'error',
            message: `Could not resolve target disk in WSL: ${mappingError.message}`
          });
          return;
        }

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
    const { baseOs, model } = req.query;
    const isoDirectory = projectRoot;

    const prioritizedNames = [];
    if (baseOs && model) {
      try {
        prioritizedNames.push(buildIsoFilename(baseOs, model));
      } catch (filenameError) {
        console.warn('Invalid baseOs/model provided for ISO lookup:', filenameError.message);
      }
    }
 codex/perform-deep-error-scan-and-report-0n0491
    prioritizedNames.push('bootai-latest.iso');

 main
    prioritizedNames.push('ai-node.iso');

    const directoryEntries = await fsPromises.readdir(isoDirectory);
    const isoFiles = [];
    for (const entry of directoryEntries) {
      if (!isBootaiIsoName(entry)) {
        continue;
      }

      const fullPath = path.join(isoDirectory, entry);
      try {
        const stats = await fsPromises.stat(fullPath);
        if (!stats.isFile()) {
          continue;
        }
        isoFiles.push({
          name: entry,
          fullPath,
          size: stats.size,
          mtimeMs: stats.mtimeMs
        });
      } catch (statError) {
        console.warn(`Failed to stat ISO candidate ${entry}:`, statError.message);
      }
    }

    if (isoFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No ISO file found. Please build an ISO first.'
      });
    }

    const findPrioritizedIso = () => {
      for (const name of prioritizedNames) {
        const match = isoFiles.find(file => file.name === name);
        if (match) {
          return match;
        }
      }
      return null;
    };

    const isoFile = findPrioritizedIso() || isoFiles.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${isoFile.name}"`);
    res.setHeader('Content-Length', isoFile.size);

    // Stream the file with timeout
    const fileStream = fs.createReadStream(isoFile.fullPath);
    
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
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 BootAI running on http://localhost:${PORT}`);
  console.log('📱 Opening browser...');
  open(`http://localhost:${PORT}`);
});

// Initial USB scan
console.log('🔍 USB drive scanning enabled');
