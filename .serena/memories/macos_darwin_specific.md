# macOS/Darwin Specific Information

## System Details
- **Platform**: Darwin (macOS)
- **Shell**: zsh (default on modern macOS)
- **Package Managers**: Homebrew, npm, pod (CocoaPods)

## macOS-Specific Commands

### Encoding Issues
Always use UTF-8 encoding for CocoaPods:
```bash
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 pod install
```

### Port Management
macOS uses `lsof` instead of `netstat`:
```bash
lsof -i :3000                # Check port 3000
lsof -i :5433                # Check PostgreSQL
lsof -i :8081                # Check Metro bundler
lsof -nP -iTCP -sTCP:LISTEN  # List all listening ports
```

### Process Management
```bash
ps aux | grep node           # Find Node processes
ps aux | grep Metro          # Find Metro bundler
pkill -f "nodemon"           # Kill by process name pattern
pgrep -f "Metro"             # Find process ID by name
```

### iOS Development Tools

#### Xcode Command Line
```bash
xcode-select -p              # Show Xcode path
xcode-select --install       # Install CLI tools
```

#### Simulator Management
```bash
xcrun simctl list            # List all devices/runtimes
xcrun simctl list devices available  # Available devices only
xcrun simctl boot "Device Name"      # Boot simulator
xcrun simctl shutdown "Device Name"  # Shutdown simulator
xcrun simctl erase "Device Name"     # Factory reset
```

#### Simulator App Management
```bash
xcrun simctl listapps "Device Name"  # List installed apps
xcrun simctl install "Device Name" path/to/app  # Install app
xcrun simctl uninstall "Device Name" bundle.id  # Uninstall app
xcrun simctl launch "Device Name" bundle.id     # Launch app
```

#### Simulator File System
```bash
xcrun simctl get_app_container "Device Name" bundle.id  # Get app container path
open ~/Library/Developer/CoreSimulator/Devices/         # Open simulator directory
```

### File System
```bash
# macOS uses BSD find, not GNU find
find . -name "*.ts" -not -path "*/node_modules/*"
find . -type f -name "package.json"

# Extended attributes (macOS specific)
xattr -l filename            # List extended attributes
xattr -d com.apple.FinderInfo filename  # Remove Finder info

# Open in default app
open filename.txt            # Open with TextEdit
open -a "Visual Studio Code" .  # Open in VSCode
open .                       # Open current directory in Finder
```

### Clipboard
```bash
pbcopy < file.txt            # Copy file to clipboard
pbpaste > file.txt           # Paste from clipboard
echo "text" | pbcopy         # Copy text to clipboard
```

### Homebrew Locations
```bash
# M1/M2 Macs (Apple Silicon)
/opt/homebrew/               # Homebrew prefix

# Intel Macs
/usr/local/                  # Homebrew prefix
```

## CocoaPods (iOS Dependencies)

### Installation
```bash
sudo gem install cocoapods   # Install CocoaPods
```

### Usage
```bash
cd mobile/ios
LC_ALL=en_US.UTF-8 pod install           # Install pods
LC_ALL=en_US.UTF-8 pod update            # Update pods
pod deintegrate                          # Remove CocoaPods
pod cache clean --all                    # Clear cache
```

### Common Issues
- **UTF-8 Error**: Always set `LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8`
- **M1/M2 Architecture**: Some pods may need Rosetta or arch flags
- **Xcode Version**: Ensure Xcode CLI tools match Xcode version

## Docker on macOS

### Docker Desktop Specifics
- Uses HyperKit VM (Intel) or Apple Virtualization (M1/M2)
- File sharing may be slower than Linux
- Ports bind to localhost by default

### Performance
```bash
docker system df             # Check Docker disk usage
docker system prune -af      # Clean everything (careful!)
docker volume prune -f       # Clean volumes
```

### Networking
- `localhost` works from containers (unlike Linux)
- `host.docker.internal` resolves to host machine
- Port conflicts common with local services

## Node.js/npm

### Version Management (nvm recommended)
```bash
nvm install 18               # Install Node 18
nvm use 18                   # Use Node 18
nvm alias default 18         # Set default version
```

### Global Packages Location
```bash
npm config get prefix        # Show global install location
# Usually: /usr/local (Intel) or /opt/homebrew (M1/M2)
```

## Environment Variables
```bash
# Shell config: ~/.zshrc (modern macOS) or ~/.bash_profile
export PATH="/opt/homebrew/bin:$PATH"
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

## Xcode Build Tools
```bash
xcodebuild -version          # Check Xcode version
xcodebuild clean             # Clean build
xcodebuild -list             # List schemes and targets
```

## System Monitoring
```bash
top                          # Process monitor (press q to quit)
htop                         # Better process monitor (install with brew)
activity monitor            # GUI activity monitor
```
