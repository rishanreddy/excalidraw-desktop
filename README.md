# Excalidraw Desktop

> A simple desktop application for creating diagrams and sketches using Excalidraw

## Features

- **Native Desktop App**: Cross-platform Electron application
- **Local File Storage**: Store drawings in a local vault folder
- **Drawing Tools**: Full Excalidraw integration with all drawing tools
- **File Management**: Grid/list view, search, and delete functionality
- **Export Options**: Export as PNG, SVG, or JPG
- **Auto-Save**: Automatic saving for existing files

## Installation

### Development

```bash
# Clone the repository
git clone https://github.com/rishanreddy/excalidraw-desktop.git
cd excalidraw-desktop

# Install dependencies
npm install

# Start development
npm run dev
```

### Build

```bash
# Build for your platform
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

1. **First Launch**: Set up your vault location (where drawings will be stored)
2. **Create**: Click "New Drawing" to start a new diagram
3. **Save**: Use Ctrl/Cmd+S to save your work
4. **Manage**: Browse, search, and organize your drawings in the library

## Project Structure

```
src/
├── main/           # Electron main process
├── preload/        # Preload scripts
└── renderer/       # React frontend
    └── components/ # UI components
```

## Tech Stack

- **Electron** - Desktop app framework
- **React** - UI framework
- **Excalidraw** - Drawing library
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made by [Rishan Reddy](https://github.com/rishanreddy)
