#!/bin/bash

set -e

echo "Building WASM module..."
wasm-pack build --target web --out-dir ../src/wasm-pathfinder

echo "WASM module built successfully!"