# VoiceReader AI - Python Backend Server

![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/flask-2.3%2B-green)
![Whisper](https://img.shields.io/badge/whisper-openai-purple)
![License](https://img.shields.io/badge/license-MIT-orange)

## 📋 Overview

Python backend server for VoiceReader AI, providing speech-to-text transcription using OpenAI's Whisper and AI-powered text analysis.

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- 2GB RAM minimum (4GB recommended)
- 1GB free disk space for models
- Microphone (for real-time features)

### Installation

#### Option 1: Automated Setup (Linux/Mac)
```bash
# Clone the repository
git clone https://github.com/DOrtenzio/VoxNode_Pro.git
cd VoxNode_Pro/backend

# Run setup script (if available)
chmod +x setup.sh
./setup.sh
```

#### Option 2: Manual Setup
```bash
# 1. Create and activate virtual environment
python -m venv venv

# On Linux/Mac:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Install PyTorch with CUDA for GPU support
# Visit: https://pytorch.org/get-started/locally/
```

### Running the Server

#### Basic Start
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Start the server
python server.py
```

#### With Custom Port
```bash
python server.py --port 8080 --host 0.0.0.0
```

#### Production (with Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 server:app
```

### Verify Installation
```bash
# Test server health
curl http://localhost:5000/api/health

# Expected response:
{
  "status": "healthy",
  "model_available": true,
  "timestamp": "2026-01-10T12:00:00Z"
}
```

## 📁 Project Structure

```
backend/
├── server.py              # Main Flask application
├── requirements.txt       # Python dependencies
├── models/               # Whisper models (auto-downloaded)
│   └── whisper-base/     # Base model files
├── uploads/              # Temporary audio uploads
├── logs/                 # Application logs
└── tests/                # Test files
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
# Server configuration
PORT=5000
HOST=0.0.0.0
DEBUG=False

# Whisper configuration
WHISPER_MODEL=base          # tiny, base, small, medium, large
WHISPER_LANGUAGE=it         # Default language
WHISPER_DEVICE=cpu         # cpu or cuda

# Audio processing
MAX_UPLOAD_SIZE=10485760   # 10MB max file size
UPLOAD_FOLDER=./uploads
LOG_LEVEL=INFO
```

### Model Selection
Modify in `server.py`:
```python
# Available models (larger = more accurate but slower)
model = whisper.load_model("base")  # Recommended balance
# Options: "tiny", "base", "small", "medium", "large"
```

## 📡 API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and model availability.

### Transcribe Audio
```
POST /api/transcribe
```
Transcribe audio file to text.

**Parameters (multipart/form-data):**
- `audio`: Audio file (WAV, MP3, M4A, WEBM)
- `language`: Language code (it, en, fr, de, es, etc.)
- `context`: Previous text for context (optional)

**Response:**
```json
{
  "success": true,
  "text": "transcribed text here",
  "confidence": 0.95,
  "language": "it",
  "processing_time": 2.5
}
```

### Chat with AI
```
POST /api/chat
```
Generate AI responses based on text.

**Body (application/json):**
```json
{
  "question": "Summarize this text",
  "context": "The full text to analyze"
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI generated response here",
  "model": "default"
}
```

### Server Configuration
```
GET /api/config
```
Returns server configuration and available features.

## 🔍 Testing

### Quick Tests
```bash
# Test with curl
curl -X POST -F "audio=@test.wav" http://localhost:5000/api/transcribe

# Test with Python
python test_api.py
```

### Sample Test Script
Create `test_api.py`:
```python
import requests

# Health check
response = requests.get("http://localhost:5000/api/health")
print("Health:", response.json())

# Test transcription
with open("test.wav", "rb") as f:
    files = {"audio": f}
    data = {"language": "it"}
    response = requests.post("http://localhost:5000/api/transcribe", files=files, data=data)
    print("Transcription:", response.json())
```

## 🐛 Troubleshooting

### Common Issues

1. **"ModuleNotFoundError: No module named 'whisper'"**
   ```bash
   pip install openai-whisper
   ```

2. **"Out of memory" error**
   - Use smaller Whisper model: `whisper.load_model("tiny")`
   - Close other applications
   - Add swap space (Linux/Mac)

3. **Slow transcription**
   ```bash
   # Install PyTorch with CUDA for GPU acceleration
   pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

4. **Port already in use**
   ```bash
   # Find and kill process
   lsof -ti:5000 | xargs kill -9  # Linux/Mac
   netstat -ano | findstr :5000   # Windows
   ```

5. **Audio format not supported**
   - Convert to WAV format (16kHz, mono)
   - Use FFmpeg: `ffmpeg -i input.mp3 -ar 16000 output.wav`

### Logs
Check logs in `logs/` directory or console output:
```bash
# Enable debug logging
python server.py --debug

# View recent errors
tail -f logs/error.log
```

## 🚀 Performance Tips

### For Better Speed
1. **Use GPU** (if available):
   ```python
   import torch
   if torch.cuda.is_available():
       model = whisper.load_model("base").cuda()
   ```

2. **Choose appropriate model size**:
   - `tiny`: Fastest, lowest accuracy
   - `base`: Good balance (default)
   - `small/medium/large`: Slower, higher accuracy

3. **Optimize audio files**:
   - 16kHz sample rate
   - Mono channel
   - WAV format

### Memory Optimization
- Use `tiny` model for limited RAM
- Process short audio segments
- Enable swap file

## 🔒 Security Considerations

1. **File uploads**: Validate file types and sizes
2. **Rate limiting**: Implement in production
3. **CORS**: Configure allowed origins
4. **Environment variables**: Don't commit secrets

## 📊 Monitoring

### Built-in Monitoring
The server provides:
- Health check endpoint
- Processing time metrics
- Error rate tracking

### External Monitoring
```bash
# Monitor with curl
watch -n 5 'curl -s http://localhost:5000/api/health'

# Log monitoring
tail -f logs/server.log | grep -E "(ERROR|WARNING)"
```

## 🔄 Updates

### Update Dependencies
```bash
pip install --upgrade -r requirements.txt
```

### Update Whisper
```bash
pip install --upgrade openai-whisper
```

### Check for Updates
```bash
pip list --outdated
```

## 🤝 Contributing

### Development Setup
```bash
# 1. Fork repository
# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Install development dependencies
pip install -r requirements-dev.txt

# 4. Run tests
pytest tests/

# 5. Submit pull request
```

### Code Style
- Follow PEP 8 guidelines
- Use type hints
- Add docstrings
- Write unit tests

## 📄 License

MIT License - See LICENSE file for details.

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Community**: VoxNode Discord/Forum

## 🚨 Emergency Procedures

### Server Crashes
```bash
# Restart server
pkill -f "python server.py"
python server.py

# Check logs
cat logs/error.log
```

### Model Download Issues
```bash
# Manual download
wget https://openaipublic.azureedge.net/main/whisper/models/1234567890abcdef/base.pt
mkdir -p ~/.cache/whisper
mv base.pt ~/.cache/whisper/
```

### Database Corruption
```bash
# Backup and restore
cp uploads/ backups/
rm -rf uploads/*
mkdir uploads
```

---

**Server Status**: ✅ Operational  
**Last Updated**: January 2026  
**Maintainer**: VoxNode Team  
**Default Port**: 5000  

*Need help? Check the troubleshooting section or open an issue.*