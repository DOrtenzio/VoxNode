#!/bin/bash
echo "🚀 Initializing VoxNode Pro..."
apt-get update && apt-get install -y espeak-ng
pip install -r requirements.txt
pip install https://github.com/KittenML/KittenTTS/releases/download/0.1/kittentts-0.1.0-py3-none-any.whl
echo "✅ Installation complete. Run 'python app.py'"