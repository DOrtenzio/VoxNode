from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import whisper
import torch
import threading
from queue import Queue
import numpy as np
import tempfile
import os
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # Abilita CORS per tutte le rotte

# Coda per gestire richieste in parallelo
transcription_queue = Queue()

# Carica modello Whisper (una volta all'avvio)
print("🔄 Caricamento modello Whisper...")
try:
    model = whisper.load_model("base")  # base, small, medium, large
    print("✅ Modello Whisper caricato")
except Exception as e:
    print(f"❌ Errore caricamento modello: {e}")
    model = None

class TranscriptionWorker(threading.Thread):
    """Worker thread per trascrizioni asincrone"""
    def __init__(self, queue):
        threading.Thread.__init__(self)
        self.queue = queue
        self.daemon = True
        self.start()
    
    def run(self):
        while True:
            audio_path, result_queue, language = self.queue.get()
            try:
                if model:
                    result = model.transcribe(
                        audio_path,
                        language=language,
                        fp16=False  # CPU mode
                    )
                    result_queue.put({
                        'success': True,
                        'text': result['text'],
                        'confidence': 0.9,
                        'language': result.get('language', language)
                    })
                else:
                    result_queue.put({
                        'success': False,
                        'error': 'Modello non disponibile'
                    })
            except Exception as e:
                result_queue.put({
                    'success': False,
                    'error': str(e)
                })
            finally:
                self.queue.task_done()

# Avvia worker
transcription_worker = TranscriptionWorker(transcription_queue)

@app.route('/')
def index():
    return jsonify({
        'name': 'VoiceReader AI Backend',
        'version': '0.1.0',
        'status': 'running',
        'model_loaded': model is not None
    })

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """Trascrizione audio con Whisper"""
    if 'audio' not in request.files:
        return jsonify({'error': 'Nessun file audio'}), 400
    
    audio_file = request.files['audio']
    language = request.form.get('language', 'it')
    
    # Salva file temporaneo
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
        audio_file.save(tmp.name)
        temp_path = tmp.name
    
    try:
        # Trascrizione sincrona (per semplicità)
        if model:
            result = model.transcribe(
                temp_path,
                language=language,
                fp16=False,
                temperature=0.0,
                initial_prompt=request.form.get('context', '')
            )
            
            # Calcola confidenza approssimativa
            avg_logprob = np.mean([seg['avg_logprob'] for seg in result['segments']]) if result['segments'] else -0.5
            confidence = min(1.0, max(0.0, (avg_logprob + 5) / 5))
            
            return jsonify({
                'success': True,
                'text': result['text'].strip(),
                'confidence': float(confidence),
                'language': result.get('language', language),
                'segments': result.get('segments', [])
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Modello Whisper non caricato'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        # Pulisci file temporaneo
        if os.path.exists(temp_path):
            os.unlink(temp_path)

@app.route('/api/chat', methods=['POST'])
def chat_with_llm():
    """Chat con LLM (simulato per ora)"""
    data = request.json
    question = data.get('question', '')
    context = data.get('context', '')
    
    # Per ora restituiamo risposte simulate
    # TODO: Integrare modelli LLM locali (Phi-2, TinyLlama, etc.)
    
    responses = {
        'riassunto': f"**Riassunto:** Ho analizzato il tuo testo. Contiene informazioni su {context[:100]}...",
        'punti': "**Punti chiave:**\n1. Punto principale\n2. Secondo punto\n3. Terzo punto",
        'spiega': f"**Spiegazione:** {context[:200]}...",
        'analisi': "**Analisi sentiment:** Il testo sembra neutro/positivo/negativo..."
    }
    
    question_lower = question.lower()
    for key, response in responses.items():
        if key in question_lower:
            return jsonify({
                'success': True,
                'response': response
            })
    
    # Risposta generica
    return jsonify({
        'success': True,
        'response': f"""Ho analizzato il tuo testo e la tua domanda: "{question}"

Basandomi sul testo fornito, posso dire che contiene informazioni rilevanti.

**Consiglio:** Per una risposta più specifica, prova a:
1. Chiedere un riassunto
2. Chiedere i punti chiave
3. Chiedere spiegazioni su concetti specifici"""
    })

@app.route('/api/realtime/start', methods=['POST'])
def start_realtime():
    """Avvia trascrizione in tempo reale"""
    # Per ora, restituiamo info sulla sessione
    # TODO: Implementare WebSocket per streaming
    return jsonify({
        'success': True,
        'session_id': f"sess_{datetime.now().timestamp()}",
        'status': 'ready'
    })

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_available': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/config')
def get_config():
    return jsonify({
        'models': {
            'whisper': 'base',
            'llm': 'fallback (simulated)'
        },
        'languages': ['it', 'en'],
        'features': ['transcription', 'chat', 'realtime']
    })

if __name__ == '__main__':
    print("🚀 Avvio server VoiceReader AI Backend...")
    print("📝 Endpoint disponibili:")
    print("   POST /api/transcribe  - Trascrivi audio")
    print("   POST /api/chat        - Chat con AI")
    print("   GET  /api/health      - Controllo salute")
    print("   GET  /api/config      - Configurazione")
    print("\n🔊 In ascolto su http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)