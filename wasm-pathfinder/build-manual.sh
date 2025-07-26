#!/bin/bash

set -e

echo "Building WASM module manually..."

# Build the WASM file
cargo build --target wasm32-unknown-unknown --release

# Create output directory
mkdir -p ../src/wasm-pathfinder

# Generate bindings (if wasm-bindgen is installed)
if command -v wasm-bindgen &> /dev/null; then
    wasm-bindgen \
        --target web \
        --out-dir ../src/wasm-pathfinder \
        --no-typescript \
        target/wasm32-unknown-unknown/release/tanuki_pathfinder.wasm
    echo "WASM module built successfully with bindings!"
else
    # Just copy the WASM file
    cp target/wasm32-unknown-unknown/release/tanuki_pathfinder.wasm ../src/wasm-pathfinder/
    echo "WASM file copied. Note: JavaScript bindings were not generated."
    echo "Install wasm-bindgen-cli for full functionality:"
    echo "  cargo install wasm-bindgen-cli"
fi