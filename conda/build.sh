#!/bin/bash
set -e
cd "$SRC_DIR"
npm install
npm run build
jupyter labextension install . --no-build
