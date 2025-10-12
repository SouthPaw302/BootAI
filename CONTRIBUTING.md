# Contributing to AI Node Builder

Thank you for your interest in contributing to AI Node Builder! 🎉

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/yourusername/ai-node-builder/issues) page
- Include system information (Windows version, WSL version, RAM)
- Provide steps to reproduce the issue
- Include error messages and logs

### Suggesting Features
- Use [GitHub Discussions](https://github.com/yourusername/ai-node-builder/discussions) for feature requests
- Describe the use case and expected behavior
- Consider if it fits the project's scope

### Code Contributions

#### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/yourusername/ai-node-builder.git
cd ai-node-builder

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build executable
npm run build
```

#### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** thoroughly on Windows with WSL2
5. **Commit** with clear messages: `git commit -m "Add amazing feature"`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Create** a Pull Request

#### Code Style
- Use **2 spaces** for indentation
- Follow **ESLint** rules (if configured)
- Write **clear comments** for complex logic
- Use **descriptive variable names**

## 🎯 Areas for Contribution

### High Priority
- 🐛 **Bug fixes** - Especially WSL integration issues
- 📚 **Documentation** - Improve README, add tutorials
- 🧪 **Testing** - Test on different Windows versions/hardware
- 🔧 **Error handling** - Better error messages and recovery

### Medium Priority
- ✨ **New AI models** - Add support for more models
- 🐧 **New Linux distros** - Add Fedora, Arch Linux, etc.
- 🎨 **UI improvements** - Better progress indicators, dark mode
- ⚡ **Performance** - Faster downloads, better caching

### Low Priority
- 🌐 **Internationalization** - Multi-language support
- 📱 **Mobile interface** - Responsive design improvements
- 🔌 **Plugin system** - Allow custom scripts
- ☁️ **Cloud integration** - Deploy to cloud platforms

## 🧪 Testing Guidelines

### Test Scenarios
- **Different Windows versions** (Windows 10, Windows 11)
- **Different WSL distributions** (Ubuntu, Debian)
- **Different hardware** (various RAM amounts, GPU/no GPU)
- **Different USB drives** (various sizes and brands)
- **Network conditions** (slow/fast internet, offline)

### Test Checklist
- [ ] Application starts without errors
- [ ] WSL detection works correctly
- [ ] ISO download completes successfully
- [ ] Model download works for all supported models
- [ ] ISO building completes without errors
- [ ] USB writing works correctly
- [ ] Bootable USB works on target hardware

## 📝 Pull Request Guidelines

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Documentation updated if needed
- [ ] No console errors or warnings
- [ ] Tested on Windows with WSL2

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tested on Windows 10
- [ ] Tested on Windows 11
- [ ] Tested with different AI models
- [ ] Tested USB writing functionality

## Screenshots (if applicable)
Add screenshots of UI changes

## Additional Notes
Any additional information for reviewers
```

## 🏗️ Project Architecture

### Key Components
- **`src/main.js`** - Express server with WebSocket support
- **`public/index.html`** - Web interface
- **`scripts/ainode-build.sh`** - Linux build script
- **`package.json`** - Dependencies and scripts

### Important Concepts
- **WSL Integration** - Commands run in WSL2 environment
- **WebSocket Communication** - Real-time progress updates
- **ISO Customization** - Filesystem extraction and rebuilding
- **USB Handling** - PowerShell integration for drive management

## 🐛 Common Issues

### WSL Not Detected
- Ensure WSL2 is installed and running
- Check WSL distribution is available
- Verify WSL can execute bash commands

### Download Failures
- Check internet connection
- Verify firewall/antivirus settings
- Try different network (mobile hotspot)

### USB Writing Issues
- Run as Administrator
- Check USB drive is properly inserted
- Verify USB drive is not write-protected

## 📞 Getting Help

- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-node-builder/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/ai-node-builder/issues)
- 📧 **Email**: your-email@example.com

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to AI Node Builder! 🚀
