# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tanuki-kokeshi (たぬきこけし) is a Japanese wordplay puzzle application that encodes and decodes text using linguistic transformation rules. The application operates entirely in Japanese and focuses on:
- Decoding puzzles by applying hints to transform encoded text
- Encoding answers by applying hints in reverse
- Finding transformation paths between two texts using a pathfinding algorithm

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production (TypeScript compile + Vite build)
npm run build

# Preview production build locally
npm run preview
```

## Architecture Overview

### Core Business Logic
- **src/cipher.ts**: Main encoding/decoding engine that applies hints to transform text
- **src/hints.ts**: Manages hint generation and creates hint objects from raw data
- **src/types.ts**: TypeScript interfaces and types for the entire application

### Hint System
Two types of hints exist:
1. **Remove hints** (src/removeHints.ts): Remove specific characters/patterns from text
2. **Replace hints** (src/replaceHints.ts): Replace characters/patterns with others

Each hint contains:
- `name`: Display name of the hint
- `reading`: Pronunciation guide
- `operations`: Array of transformation rules
- `description`: Explanation of what the hint does

### Web Worker Architecture
The pathfinding algorithm runs in a separate thread to maintain UI responsiveness:
- **src/pathfinder.ts**: Main thread interface for pathfinding
- **src/pathfinder-worker.ts**: Worker thread implementation
- Communication via postMessage with progress updates
- Supports cancellation of long-running operations

### UI Structure
- **src/index.ts**: Main application controller and DOM manipulation
- **public/index.html**: Single-page application structure
- **public/style.css**: All styling (no CSS framework used)

## Key Development Patterns

### Adding New Hints
1. Add entries to either `removeHints.ts` or `replaceHints.ts`
2. Follow the existing structure with name, reading, operations array, and description
3. Test encoding and decoding with the new hint

### Working with the Pathfinder
- The pathfinder uses breadth-first search to find transformation sequences
- It runs in a web worker to avoid blocking the UI
- Progress is reported back to the main thread for user feedback

### TypeScript Considerations
- Strict mode is enabled in tsconfig.json
- All data structures have corresponding TypeScript interfaces
- Use the types from `src/types.ts` for consistency

## Important Notes
- The entire application is in Japanese - maintain Japanese text in UI and hints
- The application uses vanilla JavaScript with no framework dependencies
- Web Workers require special handling for module imports in Vite
- Character transformations must preserve the semantic meaning for puzzles to work