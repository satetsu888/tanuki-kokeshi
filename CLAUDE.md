# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tanuki-kokeshi (たぬきこけし) is a Japanese wordplay puzzle application that encodes text using linguistic transformation rules. The application operates entirely in Japanese and focuses on:
- Encoding answers by applying hints in reverse to create puzzles
- Finding transformation paths between two texts using a high-performance WebAssembly pathfinding algorithm
- Managing hints grouped by usage frequency and effectiveness

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production (TypeScript compile + Vite build + WASM build)
npm run build

# Preview production build locally
npm run preview

# Build WebAssembly module separately (requires Rust and wasm-pack)
cd wasm-pathfinder
wasm-pack build --target web --out-dir ../src/wasm-pathfinder
```

## Architecture Overview

### Core Business Logic
- **src/cipher.ts**: Main encoding/decoding engine that applies hints to transform text
- **src/hints.ts**: Manages hint generation, creates hint objects from raw data, and handles group categorization
- **src/types.ts**: TypeScript interfaces and types for the entire application

### Hint System
Hints are organized into 4 groups based on usage frequency:
- **Group A**: Common hints (checked by default)
- **Group B**: Frequently used hints
- **Group C**: Occasionally used hints  
- **Group D**: Rarely used hints

Two types of hints exist:
1. **Remove hints** (src/removeHints.ts): Remove specific characters/patterns from text
2. **Replace hints** (src/replaceHints.ts): Replace characters/patterns with others

Each hint contains:
- `name`: Display name of the hint
- `reading`: Pronunciation guide
- `operation`: Single transformation rule with type, target, and optional replacement
- `description`: Explanation of what the hint does
- `group`: Category (A, B, C, or D) indicating usage frequency

### WebAssembly Pathfinding Engine
The pathfinding algorithm is implemented in Rust and compiled to WebAssembly for optimal performance:
- **wasm-pathfinder/src/lib.rs**: Rust implementation of the pathfinding engine
- **src/pathfinder-worker-engine.ts**: Web Worker wrapper around the WASM engine
- Uses A* search algorithm with custom evaluation function
- Supports real-time progress reporting and cancellation
- Maximum search depth: 30 steps
- Expected 10-50x performance improvement over JavaScript implementation

#### Evaluation Function
The pathfinding engine uses a sophisticated distance calculation:
1. **Base distance**: Levenshtein (edit) distance with space-optimized algorithm
2. **N-gram bonus**: Up to 40% reduction for matching 2-gram and 3-gram sequences
3. **Length penalties**:
   - Light penalty (×0.2) when current text is longer than target
   - Heavy penalty (×1.5) when current text is shorter than target

#### Performance Optimizations
- Binary heap priority queue for efficient state management
- HashMap caching for distance calculations and decode results
- Automatic cache cleanup at 10,000 entries
- Batch processing (100 iterations per cycle) for efficient JS↔WASM communication
- Progress estimation using conservative branching factor (0.15) with depth decay

### UI Features
- **src/index.ts**: Main application controller and DOM manipulation
- **public/index.html**: Single-page application structure
- **public/style.css**: All styling (no CSS framework used)
- Two operation modes: Encode and Pathfind (Decode mode was removed)
- Hint count slider (1-5 hints) for dynamic hint selection
- Grouped hint checkboxes with collapsible sections
- Progress bar with percentage display during pathfinding
- TOP30 best attempts display when no perfect path is found
- Cancellable search operations with intermediate results

## Key Development Patterns

### Adding New Hints
1. Add entries to either `removeHints.ts` or `replaceHints.ts`
2. Follow the existing structure with name, reading, operation object, description, and group
3. Assign appropriate group (A-D) based on expected usage frequency
4. Test encoding and pathfinding with the new hint

### Working with the WebAssembly Engine
- The WASM module is automatically built during `npm run build`
- Engine runs in a Web Worker for non-blocking operation
- Batch processing (100 iterations per cycle) for efficient JS↔WASM communication
- Automatic progress estimation with adaptive calculation
- Best attempts tracking (top 30) when no perfect path is found

### TypeScript Considerations
- Strict mode is enabled in tsconfig.json
- All data structures have corresponding TypeScript interfaces
- Use the types from `src/types.ts` for consistency
- WASM bindings are auto-generated by wasm-bindgen

### Deployment Configuration
- Base path set to `/tanuki-kokeshi/` in vite.config.ts for GitHub Pages
- GitHub Actions workflow handles automatic deployment
- Static assets served from the `dist` directory

## Additional Documentation
- **README.md**: Project overview and user guide (in Japanese)
- **README-WASM.md**: WebAssembly implementation details and performance metrics
- **SETUP-WASM.md**: Detailed setup instructions for the WASM development environment
- **WASM-ENGINE-ARCHITECTURE.md**: Architectural overview of the pathfinding engine (in Japanese)

## Important Notes
- The entire application is in Japanese - maintain Japanese text in UI and hints
- The application uses vanilla JavaScript with no framework dependencies
- WebAssembly requires Rust toolchain and wasm-pack for building
- Character transformations must preserve the semantic meaning for puzzles to work
- Search space estimation uses conservative branching factor (0.15) with depth decay
- Group A hints are selected by default in the UI for better user experience
- Hint effectiveness is checked during encoding to ensure solvable puzzles