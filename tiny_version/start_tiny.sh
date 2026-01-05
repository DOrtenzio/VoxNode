#!/bin/bash

# VoxNode_Pro Tiny Bootstrapper
# Optimized for NVIDIA T4 and legacy CUDA hardware

set -e

echo "-------------------------------------------------------"
echo "🧊 VoxNode_Pro TINY: Specialized Deployment"
echo "-------------------------------------------------------"

if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ Error: NVIDIA GPU not detected. Tiny-optimized version requires CUDA."
    exit 1
fi

echo "📦 Installing optimized dependencies..."
pip install -r requirements_tiny.txt

export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
export CUDA_LAUNCH_BLOCKING=0

echo "🚀 Launching app-tiny.py (Phi-3-mini + Whisper-Tiny)..."
python app-tiny.py
