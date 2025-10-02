# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

GDevelop is a full-featured, no-code, open-source game development software for creating 2D, 3D and multiplayer games. The codebase consists of:
- **Core** (C++): Game structure and IDE manipulation tools
- **GDJS** (TypeScript): The game engine using PixiJS and Three.js
- **GDevelop.js**: WebAssembly bindings of Core/GDJS/Extensions to JavaScript
- **newIDE** (React/Electron): The game editor application
- **Extensions**: Objects, behaviors, and features for the game engine

## Architecture Fundamentals

### IDE vs Runtime Distinction
- **IDE/Editor**: Code that runs in the GDevelop editor (not in games)
- **Runtime**: Code that runs during a game (the game engine)
- Extensions have both IDE declarations (in `JsExtension.js`) and Runtime implementations (in TypeScript files)
- For example: `gd::Variable` (IDE, in Core) vs `gdjs.Variable` (Runtime, in GDJS)

### Key Directories
- `Core/GDCore/Project/`: Classes describing game structure (Project, Scene, Object, Behavior, Events)
- `Core/GDCore/IDE/`: Tools for manipulating projects (refactoring, search, etc.)
- `GDJS/Runtime/`: Game engine (TypeScript)
- `GDJS/GDJS/`: C++ IDE part (exporters, code generation from events)
- `GDevelop.js/Bindings/Bindings.idl`: Interface definition for C++ to JavaScript bridge
- `newIDE/app/`: React-based editor application
- `Extensions/`: Built-in extensions (not part of Core)

### Events and Code Generation
- Events are NOT executed at runtime - they are transpiled to JavaScript/TypeScript code
- Code generation happens in `GDJS/GDJS/Events/CodeGeneration/`
- A `gd::Instruction` is essentially a function call with parameters
- StandardEvent contains conditions (filters) and actions

## Common Development Commands

### Setting Up Development Environment

```bash
# Clone and install IDE dependencies
git clone https://github.com/4ian/GDevelop.git
cd GDevelop/newIDE/app
npm install  # or yarn
```

### Running the Web IDE

```bash
cd newIDE/app
npm start
# Opens at http://localhost:3000 (or http://gdevelop-app-local.com:3000 for cloud storage testing)
```

### Running the Electron App

```bash
# Terminal 1: Keep the web app running
cd newIDE/app
npm start

# Terminal 2: Run Electron
cd newIDE/electron-app
npm install
npm start
```

### GDJS Game Engine Development

```bash
# Build the game engine
cd GDJS
npm install
npm run build

# Build options:
npm run build              # Production build (minified)
npm run build -- --debug   # Debug build (no minification)
npm run build -- --out=/path/to/output  # Custom output path

# Type checking
npm run check-types

# Format code
npm run format

# Check formatting
npm run check-format
```

### Running Game Engine Tests

```bash
cd GDJS/tests
npm install

# Run tests
npm run test              # Single run with Chrome Headless
npm run test:watch        # Watch mode
npm run test-benchmark:watch  # With benchmarks
npm run test:firefox:watch    # Using Firefox
```

### IDE Development

```bash
cd newIDE/app

# Run tests
npm test

# Type checking with Flow
npm run flow

# Format code
npm run format

# Check formatting
npm run check-format

# Run Storybook for UI component development
npm run storybook  # Opens on http://localhost:9009

# Extract translations
npm run extract-all-translations

# Compile translations
npm run compile-translations
```

### Building GDevelop.js (C++ to WebAssembly)

**Note**: Only needed if modifying C++ code in Core, GDJS Platform, or Extensions.

```bash
# Install Emscripten 3.1.21 first
git clone https://github.com/emscripten-core/emsdk/
cd emsdk
./emsdk install 3.1.21
./emsdk activate 3.1.21

# Load Emscripten environment (required for each new terminal session)
source ./emsdk_env.sh  # Linux/macOS
# or ./emsdk_env.ps1 (Windows PowerShell)
# or ./emsdk_env.bat (Windows cmd)

# Build GDevelop.js
cd GDevelop.js
npm install
npm run build

# Build variants:
npm run build -- --variant=dev              # Faster linking for development
npm run build -- --variant=debug            # With debugging information
npm run build -- --variant=debug-assertions # With memory checks
npm run build -- --variant=debug-sanitizers # With sanitizers (very slow)

# Run tests
npm test
```

### Extension Development

```bash
# After modifying extension files, changes are auto-imported when IDE is running
# Watch for console message: "GDJS Runtime update"

# Manual import (if needed):
cd newIDE/app/scripts
node import-GDJS-Runtime.js

# Or reload extensions only:
cd newIDE/app
npm run reload-extensions
```

### Working with Extensions

Extension files are in `Extensions/[ExtensionName]/`:
- `JsExtension.js`: IDE declaration (actions, conditions, expressions, properties)
- `*runtimeobject.ts`: Runtime object implementation
- `*runtimebehavior.ts`: Runtime behavior implementation  
- `*tools.ts`: Runtime functions for actions/conditions
- `*-pixi-renderer.ts`: PixiJS renderer for objects
- `*.spec.js`: Tests for the extension

After editing extension files:
1. If you modified `JsExtension.js`: Reload IDE with Ctrl+R (Cmd+R on macOS)
2. If you modified Runtime files: Relaunch a game preview
3. Always check the developer console for errors

## Code Style and Tools

### JavaScript/TypeScript
- Use Prettier for formatting (already configured)
- IDE uses Flow for type checking
- Game engine uses TypeScript
- Modern JavaScript features are supported (see newIDE/docs/)

### C++
- C++11 standard (consider upgrading to C++17)
- Use clang-format with Google style: `{BasedOnStyle: Google, BinPackParameters: false, BinPackArguments: false}`
- Configuration in `.clang_format` and `.clang-tidy`

### Recommended VS Code Extensions
- Prettier - Code formatter
- ESLint
- Flow Language Support
- clang-format

## Testing Strategy

### Game Engine Tests
- Located in `GDJS/tests/` for core engine
- Located alongside extensions in `Extensions/[ExtensionName]/tests/`
- Run with Karma using Chrome Headless (or Firefox)
- Include benchmarks with `--enableBenchmarks` flag

### IDE Tests
- Use Jest (via react-scripts)
- Run with `npm test` in `newIDE/app`
- Coverage: `npm run analyze-test-coverage`

### Extension Tests
Individual extension tests run as part of the GDJS test suite.

## Important Development Notes

### GDevelop.js Bridge
- `Bindings.idl` defines what C++ is exposed to JavaScript
- 90% of the time, editing `Bindings.idl` is sufficient
- May need to add header files to `Wrapper.cpp` for new C++ classes
- Compiled with CMake using Emscripten

### Resource Import
When IDE starts, it automatically:
- Downloads or copies libGD.js (if not building locally)
- Imports GDJS Runtime
- Imports extensions
- Imports external editors (Piskel, JFXR, Yarn)
- Builds theme resources

Manual resource import:
```bash
cd newIDE/app
npm run import-resources
```

### Cloud Storage Development
To test Google Drive, Dropbox, OneDrive in development:
1. Add to `/etc/hosts`: `127.0.0.1 gdevelop-app-local.com`
2. Access IDE at `http://gdevelop-app-local.com:3000`

### Hot Reloading
- IDE: Changes auto-reload when running `npm start`
- Game Engine: Auto-rebuilds when files change (watch console)
- Extensions: Auto-imported when IDE is running in development

### Build System
- IDE: Uses react-scripts with react-app-rewired for customization
- Game Engine: Uses esbuild (fast builds) + TypeScript for type checking
- C++ parts: CMake build system
- Desktop app: Electron Builder

## CI/CD

Builds run on:
- **CircleCI**: macOS and Linux builds
- **AppVeyor**: Windows builds  
- **Semaphore**: Fast tests

Artifacts uploaded to S3 at `s3://gdevelop-releases/[branch]/[commit|latest]/`

## Documentation

- Core C++ Documentation: https://docs.gdevelop.io/GDCore%20Documentation/
- GDJS Runtime Documentation: https://docs.gdevelop.io/GDJS%20Runtime%20Documentation/
- Architecture Overview: `Core/GDevelop-Architecture-Overview.md`
- IDE README: `newIDE/README.md`
- GDJS README: `GDJS/README.md`
- Extensions Guide: `newIDE/README-extensions.md`
- Themes Guide: `newIDE/README-themes.md`

## Quick Reference for Common Tasks

### I want to add a new action/condition to an extension
1. Edit `Extensions/[ExtensionName]/JsExtension.js` to declare it
2. Implement the function in `Extensions/[ExtensionName]/*tools.ts`
3. Reload IDE (Ctrl+R) and test in a preview

### I want to create a new behavior
1. Create `*runtimebehavior.ts` extending `gdjs.RuntimeBehavior`
2. Declare in `JsExtension.js` using `addBehavior`
3. Implement `doStepPreEvents`/`doStepPostEvents` for logic

### I want to create a new object type
1. Create `*runtimeobject.ts` extending `gdjs.RuntimeObject`
2. Create `*-pixi-renderer.ts` for the renderer
3. Declare in `JsExtension.js` using `addObject`

### I want to modify the Core C++ library
1. Make changes to C++ files in `Core/`
2. Add to `Bindings.idl` if exposing to JavaScript
3. Rebuild GDevelop.js with Emscripten
4. Test in IDE

### I need to run a single test file
```bash
# For GDJS tests
cd GDJS/tests
npm run test:watch  # Then use Karma's filtering

# For IDE tests  
cd newIDE/app
npm test -- --testPathPattern=YourTest.spec.js
```

## File Organization Patterns

### Extension Structure
```
Extensions/MyExtension/
  JsExtension.js          # IDE declaration
  mytools.ts              # Runtime functions
  myruntimeobject.ts      # Runtime object
  myruntimebehavior.ts    # Runtime behavior
  my-pixi-renderer.ts     # PixiJS renderer
  myeffect.ts             # Shader/filter
  tests/
    *.spec.js             # Tests
```

### IDE App Structure  
```
newIDE/app/src/
  MainFrame/              # Main application frame
  EventsSheet/            # Events editor
  ObjectsRendering/       # Scene editor renderers
  ObjectEditor/           # Object properties editors
  BehaviorsEditor/        # Behavior editors
  UI/                     # Reusable UI components
  Utils/                  # Utility functions
  Export/                 # Export functionality
```

## Performance Considerations

- GDJS uses esbuild for near-instant builds during development
- Type checking is separate and slower - run periodically
- Use `--max-old-space-size=7168` for Node.js when building IDE
- Build times: GDJS ~seconds, GDevelop.js ~minutes, Full IDE build ~minutes

## Asynchronous Actions

To create async actions:
1. Make your function return a `gdjs.AsyncTask`
2. Use `gdjs.PromiseTask` for promises: `return new gdjs.PromiseTask(yourPromise)`
3. Declare with `setAsyncFunctionName()` instead of `setFunctionName()`
4. Only actions can be asynchronous (not conditions or expressions)
