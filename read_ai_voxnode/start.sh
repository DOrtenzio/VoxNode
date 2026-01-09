#!/bin/bash

# Chiudi processi precedenti se attivi
kill $(lsof -t -i:5000) 2>/dev/null
kill $(lsof -t -i:8000) 2>/dev/null

echo "🚀 Avvio VoiceReader AI..."

# 1. Avvio Backend
echo "📦 Avvio Backend (Flask + Whisper)..."
cd backend
source venv/bin/activate
python server.py &
BACKEND_PID=$!
cd ..

# Aspetta che il backend sia pronto
sleep 5

# 2. Avvio Frontend
echo "🌐 Avvio Frontend su http://localhost:8000..."
cd frontend
python3 -m http.server 8000 &
FRONTEND_PID=$!
cd ..

echo "✅ Sistema pronto!"
echo "Premi CTRL+C per fermare tutto."

# Mantieni lo script attivo
wait $BACKEND_PID $FRONTEND_PID