# VoiceReader AI - Hybrid Intelligence Assistant (VoxNode Branch)

## 📖 Overview

**VoiceReader AI** is a specialized high-performance reading assistant designed to convert technical speech into structured, analyzable data. Unlike standard browser-based solutions, this branch utilizes a **Hybrid Architecture**: local high-fidelity transcription via **OpenAI Whisper** and ultra-fast cloud inference through **Groq Llama-3**.

It is specifically engineered for professionals and students who need to analyze technical manuals, documentation, or research papers through verbal reading and real-time AI interaction.

## 🛠️ System Architecture

The application operates on a dual-layer stack:

1. **Local Backend (Python/Flask)**: Handles heavy-duty DSP (Digital Signal Processing) and runs the OpenAI Whisper model for STT (Speech-to-Text).
2. **Frontend (Vanilla JS/Bootstrap)**: Provides a low-latency glassmorphic UI, manages local notebooks via `LocalStorage`, and orchestrates API calls to Groq Cloud.

## 🚀 Getting Started

### Prerequisites

* **Python 3.9+**
* **FFmpeg**: Essential for audio stream processing.
* *macOS*: `brew install ffmpeg`
* *Ubuntu*: `sudo apt install ffmpeg`
* *Windows*: `choco install ffmpeg`


* **Groq API Key**: Obtainable at [console.groq.com](https://console.groq.com/).

### Installation & Setup

#### 1. Clone and Prepare Backend

```bash
git clone https://github.com/DOrtenzio/VoxNode_Pro.git
cd voicereader-ai/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

```

#### 2. Launch the Application

You can use the provided automation script (recommended):

```bash
# From the root directory
chmod +x start.sh
./start.sh

```

*The script will initialize the Flask server on port 5000 and the Frontend server on port 8000.*

## ⚙️ Configuration

1. **Model Selection**: Upon launching the UI, toggle between **Local Whisper** (for privacy/accuracy) and **Cloud APIs**.
2. **API Key**: Enter your Groq Key in the "AI Model" card to enable the real-time research assistant.
3. **Language**: Switch between `IT` and `EN`. The Whisper backend will automatically adjust its greedy decoding for the selected language.

## 📦 Project Structure

```text
├── backend/
│   ├── server.py             # Flask API & Whisper Integration
│   └── requirements.txt      # Torch, Whisper, Flask-CORS
├── frontend/
│   ├── index.html            # Main Dashboard
│   ├── style/styles.css      # Custom Glassmorphism UI
│   └── script/
│       ├── app.js            # Frontend State Controller
│       ├── voxnode-integration.js # Backend Bridge
│       └── notebook-manager.js   # Local Persistence Logic
└── start.sh                  # Multi-service orchestrator

```

## ⚠️ Technical Debt & Alpha Limitations

* **VAD (Voice Activity Detection)**: Currently relies on fixed-interval chunks. Future releases will implement WebRTC VAD for better silence detection.
* **Concurrency**: The current local server is optimized for a single-user local session.
* **Security**: API Keys are stored in `localStorage`. Ensure your environment is secure.

## 🎯 Roadmap

* [x] **Phase 1**: Hybrid STT integration (Local Whisper + Web UI).
* [ ] **Phase 2**: RAG (Retrieval-Augmented Generation) for local Notebooks.
* [ ] **Phase 3**: Progressive Web App (PWA) support for mobile devices.
* [ ] **Phase 4**: WebSocket implementation for true zero-latency streaming.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Lead Maintainer**: VoxNode Development Team

**Status**: Alpha - Active Development

**Last Updated**: January 2026
