#!/bin/bash
# BootAI Build Script - Current Working Version
# This script creates AI-powered Linux ISOs with Ollama integration

set -e

# Get command line arguments
BASE_OS="$1"
MODEL_NAME="$2"

# Default values if not provided
if [ -z "$BASE_OS" ]; then
    BASE_OS="ubuntu-22.04"
fi

if [ -z "$MODEL_NAME" ]; then
    MODEL_NAME="phi3:mini"
fi

echo "🚀 BootAI - Building $BASE_OS with $MODEL_NAME"

# Create cache directories
CACHE_DIR="/root/bootai-cache"
ISO_CACHE="$CACHE_DIR/isos"
MODEL_CACHE="$CACHE_DIR/models"
mkdir -p "$ISO_CACHE" "$MODEL_CACHE"

# Function to validate file integrity
validate_file() {
    local file="$1"
    local expected_size="$2"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    local actual_size=$(stat -c%s "$file" 2>/dev/null || echo "0")
    if [ "$actual_size" -lt "$expected_size" ]; then
        echo "⚠️ File $file appears corrupted (size: $actual_size, expected: $expected_size)"
        return 1
    fi
    
    return 0
}

# Download base OS with caching
case "$BASE_OS" in
  "ubuntu-22.04")
    ISO_URL="https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso"
    ISO_NAME="ubuntu-22.04.5-live-server-amd64.iso"
    MIN_SIZE=1000000000  # 1GB minimum
    ;;
  "ubuntu-24.04")
    ISO_URL="https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso"
    ISO_NAME="ubuntu-24.04.1-live-server-amd64.iso"
    MIN_SIZE=1000000000  # 1GB minimum
    ;;
  "debian-12")
    ISO_URL="https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.7.0-amd64-netinst.iso"
    ISO_NAME="debian-12.7.0-amd64-netinst.iso"
    MIN_SIZE=500000000   # 500MB minimum
    ;;
esac

CACHED_ISO="$ISO_CACHE/$ISO_NAME"

echo "📦 Checking for cached ISO..."
if validate_file "$CACHED_ISO" "$MIN_SIZE"; then
    echo "✅ Using cached ISO: $ISO_NAME"
    cp "$CACHED_ISO" "base.iso"
else
    echo "📥 Downloading $BASE_OS ISO..."
    curl -4 -o base.iso -L "$ISO_URL"
    echo "💾 Caching ISO for future use..."
    cp "base.iso" "$CACHED_ISO"
fi

echo "🤖 Installing Ollama..."
if ! command -v ollama &> /dev/null; then
    curl -4 -fsSL https://ollama.ai/install.sh | sh
else
    echo "✅ Ollama already installed"
fi

echo "⬇️ Checking for cached model..."
if ollama list | grep -q "$MODEL_NAME"; then
    echo "✅ Model $MODEL_NAME already available"
else
    echo "📥 Pulling model $MODEL_NAME..."
    ollama pull "$MODEL_NAME"
fi

echo "💿 Creating AI Node ISO..."

# Install required tools for ISO modification
apt-get update -qq
apt-get install -y -qq xorriso squashfs-tools rsync

# Create mount points
mkdir -p iso_mount iso_extract iso_new

# Mount the original ISO
echo "📂 Mounting original ISO..."
mount -o loop "base.iso" iso_mount

# Copy ISO contents
echo "📋 Copying ISO contents..."
# Use rsync for better handling of permissions and large files
rsync -av iso_mount/ iso_new/ || {
    echo "⚠️ rsync failed, trying cp..."
    cp -r iso_mount/* iso_new/
}

# Unmount original ISO
umount iso_mount

# For Ubuntu Server, we'll create a minimal filesystem instead of extracting
echo "🔓 Creating minimal filesystem for Ubuntu Server..."
mkdir -p iso_extract/{bin,sbin,etc,usr,var,lib,opt,home,root,tmp,dev,proc,sys,mnt,media}

# Create essential directories
mkdir -p iso_extract/usr/{bin,sbin,lib,share,local}
mkdir -p iso_extract/etc/{systemd/system,init.d}
mkdir -p iso_extract/var/{log,lib,run}

# Create essential device nodes
echo "🔧 Creating essential device nodes..."
mknod iso_extract/dev/console c 5 1 2>/dev/null || true
mknod iso_extract/dev/null c 1 3 2>/dev/null || true
mknod iso_extract/dev/zero c 1 5 2>/dev/null || true
mknod iso_extract/dev/random c 1 8 2>/dev/null || true
mknod iso_extract/dev/urandom c 1 9 2>/dev/null || true
mknod iso_extract/dev/tty c 5 0 2>/dev/null || true
mknod iso_extract/dev/ptmx c 5 2 2>/dev/null || true
mknod iso_extract/dev/full c 1 7 2>/dev/null || true

# Install Ollama in the extracted filesystem
echo "🤖 Installing Ollama in filesystem..."
cp /usr/local/bin/ollama iso_extract/usr/local/bin/ 2>/dev/null || echo "Ollama binary not found, will install during boot"

# Create Ollama service file
echo "⚙️ Creating Ollama service..."
mkdir -p iso_extract/etc/systemd/system
cat > iso_extract/etc/systemd/system/ollama.service << EOF
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=5
Environment=OLLAMA_HOST=0.0.0.0:11434

[Install]
WantedBy=multi-user.target
EOF

# Enable Ollama service
ln -sf /etc/systemd/system/ollama.service iso_extract/etc/systemd/system/multi-user.target.wants/

# Create startup script to pull the model
echo "📜 Creating model download script..."
cat > iso_extract/usr/local/bin/setup-ai-model.sh << EOF
#!/bin/bash
echo "🤖 Setting up AI model: $MODEL_NAME"
if ! ollama list | grep -q "$MODEL_NAME"; then
    echo "📥 Downloading model $MODEL_NAME..."
    ollama pull "$MODEL_NAME"
fi
echo "✅ AI model $MODEL_NAME ready!"
EOF

chmod +x iso_extract/usr/local/bin/setup-ai-model.sh

# Add model setup to startup
echo "🚀 Adding model setup to startup..."
cat > iso_extract/etc/rc.local << EOF
#!/bin/bash
# Start Ollama service
systemctl start ollama

# Setup AI model in background
/usr/local/bin/setup-ai-model.sh &

exit 0
EOF

chmod +x iso_extract/etc/rc.local

# Rebuild the squashfs filesystem
echo "🔒 Rebuilding filesystem..."
# Find the appropriate squashfs file to replace
SQUASHFS_FILE=""
if [ -f "iso_new/casper/filesystem.squashfs" ]; then
    SQUASHFS_FILE="iso_new/casper/filesystem.squashfs"
elif [ -f "iso_new/casper/ubuntu-server-minimal.squashfs" ]; then
    SQUASHFS_FILE="iso_new/casper/ubuntu-server-minimal.squashfs"
elif [ -f "iso_new/casper/ubuntu-server-minimal.ubuntu-server.squashfs" ]; then
    SQUASHFS_FILE="iso_new/casper/ubuntu-server-minimal.ubuntu-server.squashfs"
fi

if [ -n "$SQUASHFS_FILE" ]; then
    # Make the target file writable
    chmod 644 "$SQUASHFS_FILE" 2>/dev/null || true
    if ! mksquashfs iso_extract "$SQUASHFS_FILE" -comp xz -e boot; then
        echo "❌ Failed to rebuild filesystem"
        exit 1
    fi
    echo "✅ Rebuilt filesystem: $SQUASHFS_FILE"
else
    echo "⚠️ No squashfs file found to rebuild"
fi

# Update the manifest
echo "📝 Updating manifest..."
# Find the appropriate manifest file
MANIFEST_FILE=""
if [ -f "iso_new/casper/filesystem.manifest" ]; then
    MANIFEST_FILE="iso_new/casper/filesystem.manifest"
elif [ -f "iso_new/casper/ubuntu-server-minimal.manifest" ]; then
    MANIFEST_FILE="iso_new/casper/ubuntu-server-minimal.manifest"
elif [ -f "iso_new/casper/ubuntu-server-minimal.ubuntu-server.manifest" ]; then
    MANIFEST_FILE="iso_new/casper/ubuntu-server-minimal.ubuntu-server.manifest"
fi

if [ -n "$MANIFEST_FILE" ]; then
    chmod +w "$MANIFEST_FILE"
    chroot iso_extract dpkg-query -W --showformat='${Package} ${Version}\n' > "$MANIFEST_FILE"
    chmod -w "$MANIFEST_FILE"
    echo "📝 Updated manifest: $MANIFEST_FILE"
else
    echo "⚠️ No manifest file found to update"
fi

# Calculate new filesystem size
echo "📊 Calculating filesystem size..."
# Find the appropriate size file
SIZE_FILE=""
if [ -f "iso_new/casper/filesystem.size" ]; then
    SIZE_FILE="iso_new/casper/filesystem.size"
elif [ -f "iso_new/casper/ubuntu-server-minimal.size" ]; then
    SIZE_FILE="iso_new/casper/ubuntu-server-minimal.size"
elif [ -f "iso_new/casper/ubuntu-server-minimal.ubuntu-server.size" ]; then
    SIZE_FILE="iso_new/casper/ubuntu-server-minimal.ubuntu-server.size"
fi

if [ -n "$SIZE_FILE" ]; then
    du -sx --block-size=1 iso_extract | cut -f1 > "$SIZE_FILE"
    echo "📊 Updated size file: $SIZE_FILE"
else
    echo "⚠️ No size file found to update"
fi

# Rebuild initramfs to ensure proper boot
echo "🔧 Rebuilding initramfs..."
chroot iso_extract update-initramfs -u -k all

# Generate new MD5 sums
echo "🔍 Generating checksums..."
cd iso_new
find . -type f -print0 | xargs -0 md5sum > md5sum.txt
cd ..

# Create the new ISO
echo "💿 Building final BootAI ISO..."
if ! xorriso -as mkisofs \
    -iso-level 3 \
    -full-iso9660-filenames \
    -volid "BootAI $BASE_OS $MODEL_NAME" \
    -appid "BootAI" \
    -publisher "BootAI" \
    -preparer "BootAI" \
    -eltorito-boot isolinux/isolinux.bin \
    -eltorito-catalog isolinux/boot.cat \
    -no-emul-boot \
    -boot-load-size 4 \
    -boot-info-table \
    -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
    -output "ai-node.iso" \
    iso_new/; then
    echo "❌ Failed to create ISO"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -rf iso_mount iso_extract iso_new

echo "✅ AI Node ISO created successfully!"
echo "📁 ISO saved as: $(pwd)/ai-node.iso"
echo "📊 File size: $(du -h ai-node.iso | cut -f1)"
echo "🚀 Ready to boot with AI model: $MODEL_NAME"
