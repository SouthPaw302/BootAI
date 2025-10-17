# 🚀 BootAI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://www.microsoft.com/windows)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![WSL2](https://img.shields.io/badge/WSL2-Required-orange.svg)](https://docs.microsoft.com/en-us/windows/wsl/)

> **Create bootable AI-powered Linux ISOs and write them to USB drives with a single Windows executable!**

BootAI is a Windows application that creates custom Linux distributions with pre-installed AI models (Ollama) and writes them to USB drives for portable AI computing.

## ✨ Features

- 🖥️ **Single Windows Executable** - No installation required, just download and run
- 🤖 **Multiple AI Models** - Phi-3, Llama 3, Llama 2, Mistral, TinyLlama, and more
- 🐧 **Multiple Linux Distros** - Ubuntu 22.04/24.04, Debian 12
- 📊 **Real-Time Progress** - WebSocket-powered live progress tracking
- 💾 **Smart Caching** - Avoids redownloading ISOs and models
- 🔧 **Auto-Configuration** - GPU detection, CPU fallback, RAM requirements
- 🚀 **One-Click USB Writing** - Built-in USB drive detection and writing
- 🌐 **Modern Web Interface** - Beautiful, responsive UI with step-by-step wizard

## 🎯 Use Cases

- **Portable AI Computing** - Boot any computer into an AI-powered Linux environment
- **AI Development** - Test AI models without installing anything on your system
- **Educational** - Learn about AI models and Linux in a safe, isolated environment
- **Emergency AI Access** - Have AI capabilities available on any computer
- **Offline AI** - Run AI models without internet connection

## 🚀 Quick Start

### Prerequisites

- **Windows 10/11** with WSL2 installed
- **8GB+ RAM** (16GB+ recommended for larger models)
- **USB drive** (8GB+ capacity)
- **Internet connection** (for initial downloads)

### Installation

1. **Download** the latest `bootai.exe` from [Releases](https://github.com/SouthPaw302/bootai/releases)
2. **Run** the executable - it will automatically open your browser
3. **Configure** your preferred Linux distribution and AI model
4. **Build** your custom AI-powered ISO
5. **Write** to USB drive and boot!

## 📋 Supported Configurations

### Operating Systems
- **Ubuntu 22.04 LTS** - Stable, well-supported
- **Ubuntu 24.04 LTS** - Latest features
- **Debian 12** - Lightweight, minimal

### AI Models

| Model | Size | RAM Required | Use Case |
|-------|------|--------------|----------|
| **TinyLlama** | 200MB | 2GB | Ultra-lightweight, basic tasks |
| **Phi-2** | 500MB | 4GB | Microsoft's efficient model |
| **Phi-3 Mini** | 1GB | 4GB | Balanced performance/size |
| **Phi-3** | 2GB | 8GB | High-quality responses |
| **Llama-2-7B** | 3.5GB | 8GB | Conversational AI |
| **Llama-3** | 4GB | 16GB | Latest Meta model |
| **Mistral** | 4GB | 16GB | Efficient inference |

## 🛠️ Development

### Prerequisites
- Node.js 18+
- WSL2 with Ubuntu
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/SouthPaw302/bootai.git
cd bootai

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build executable
npm run build

# Run automated tests
npm test
```

### Testing

BootAI ships with Jest-powered integration tests that exercise the Express API in a simulated environment. The suite runs the server in test mode, so heavy WSL and ISO build commands are stubbed while request/response handling stays intact.

```bash
npm test
```

The command sets `BOOTAI_TEST_MODE=1` automatically, ensuring the tests are safe to run on any development machine.

### Project Structure
```
bootai/
├── src/
│   └── main.js              # Express server + WebSocket
├── public/
│   └── index.html           # Web interface
├── scripts/
│   └── build.sh            # Linux build script
├── .cursor/
│   └── commands/           # Spec Kit commands
├── .specify/
│   └── scripts/            # Automation scripts
└── package.json            # Dependencies
```

## 🔧 Technical Details

### Architecture
- **Backend**: Node.js + Express + WebSocket
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Linux Integration**: WSL2 + Bash scripts
- **USB Handling**: PowerShell + Windows diskpart
- **Packaging**: pkg for single executable

### Build Process
1. **Download** base Linux ISO
2. **Extract** filesystem using squashfs
3. **Install** Ollama and AI model
4. **Configure** systemd services
5. **Rebuild** bootable ISO
6. **Write** to USB drive

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas for Contribution
- 🐛 **Bug fixes** - Report and fix issues
- ✨ **New features** - Add more AI models or Linux distros
- 📚 **Documentation** - Improve guides and examples
- 🧪 **Testing** - Test on different hardware configurations
- 🎨 **UI/UX** - Improve the web interface

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama** - For the amazing AI model serving framework
- **Ubuntu/Debian** - For the excellent Linux distributions
- **WSL2** - For seamless Windows/Linux integration
- **pkg** - For creating single-file executables

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/SouthPaw302/bootai/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/SouthPaw302/bootai/discussions)
- 📧 **Email**: your-email@example.com

## 🗺️ Roadmap

- [ ] **More AI Models** - CodeLlama, Gemma, Qwen
- [ ] **More Linux Distros** - Fedora, Arch Linux
- [ ] **GUI Application** - Native Windows app (Electron/Tauri)
- [ ] **Cloud Integration** - Deploy to cloud platforms
- [ ] **Model Management** - Update models without rebuilding
- [ ] **Custom Scripts** - User-defined post-install scripts

---

**Made with ❤️ for the AI community**

⭐ **Star this repository if you find it useful!**