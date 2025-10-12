# BootAI Project Rules

## Core Principles

### 1. Stability First
- Never break working functionality
- Test each change individually before combining
- Maintain backward compatibility

### 2. Systematic Debugging
- Follow Spec Kit methodology: `/specify` → `/plan` → `/tasks` → `/implement`
- Analyze root causes before applying fixes
- Document all changes and their rationale

### 3. USB Boot Integrity
- Ensure USB formatting creates single bootable partition
- Verify initramfs is properly rebuilt after ISO modifications
- Test boot process at each stage

### 4. Cross-Platform Compatibility
- Windows executable must work reliably
- WSL integration must be robust
- Linux ISO must boot on various hardware

## Development Rules

### Before Making Changes:
1. **Analyze** the current issue thoroughly
2. **Plan** the solution architecture
3. **Break down** into testable tasks
4. **Implement** one change at a time
5. **Test** each change before proceeding

### USB Boot Debugging Protocol:
1. **Identify** the specific boot failure point
2. **Research** the root cause (initramfs, filesystem, bootloader)
3. **Design** a minimal fix
4. **Test** the fix in isolation
5. **Verify** full boot process works

## Quality Standards

- All changes must be tested on actual USB hardware
- Build process must be reliable and repeatable
- Error handling must be comprehensive
- User experience must be smooth and informative

## Current Status

- **Working**: BootAI builds ISO successfully
- **Issue**: USB boots to BusyBox instead of Ubuntu
- **Root Cause**: Initramfs cannot locate root filesystem after ISO modifications
- **Fix Applied**: Added initramfs rebuild step to build script

## Forbidden Actions

- Making multiple changes simultaneously
- Breaking working functionality
- Skipping testing steps
- Modifying code without following Spec Kit methodology
