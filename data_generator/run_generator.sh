#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
GENERATOR_SCRIPT="$ROOT_DIR/data_generator/generator.py"
GENERATOR_DIR="$ROOT_DIR/data_generator"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Error: Python environment not found at $PYTHON_BIN"
  echo "Create the environment first, then install required packages (nflreadpy, pyarrow, pandas, fastparquet)."
  exit 1
fi

if [[ ! -f "$GENERATOR_SCRIPT" ]]; then
  echo "Error: Missing generator script at $GENERATOR_SCRIPT"
  exit 1
fi

echo "Running data generator with $PYTHON_BIN"
cd "$GENERATOR_DIR"
"$PYTHON_BIN" "$GENERATOR_SCRIPT"
