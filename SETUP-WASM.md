# WebAssembly Setup Instructions

## Quick Setup (macOS/Linux)

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. Add WASM target
rustup target add wasm32-unknown-unknown

# 3. Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# 4. Build the WASM module
npm run build:wasm

# 5. Start the development server
npm run dev
```

## Alternative: Manual Build (without wasm-pack)

If wasm-pack installation fails, you can use the manual build script:

```bash
# Install wasm-bindgen CLI tool
cargo install wasm-bindgen-cli

# Run manual build
cd wasm-pathfinder
./build-manual.sh
```

## Verifying the Installation

Once built successfully, you should see these files in `src/wasm-pathfinder/`:
- `tanuki_pathfinder_bg.wasm` - The compiled WebAssembly module
- `tanuki_pathfinder.js` - JavaScript bindings
- `tanuki_pathfinder_bg.js` - Additional bindings

The application will automatically detect and use the WASM module for improved performance.

## Troubleshooting

1. **"wasm-pack: command not found"**
   - Make sure wasm-pack is in your PATH
   - Try installing with cargo: `cargo install wasm-pack`

2. **"error: can't find crate"**
   - Run `cargo update` in the wasm-pathfinder directory
   - Make sure you have internet connection for downloading dependencies

3. **Build fails with "target not found"**
   - Run `rustup target add wasm32-unknown-unknown`

4. **Performance not improved**
   - Check browser console for WASM initialization errors
   - Ensure the WASM files are properly generated in src/wasm-pathfinder/
   - Try clearing browser cache and reloading