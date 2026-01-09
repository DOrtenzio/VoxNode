from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import torch
import os
import tempfile
from datetime import datetime

app = Flask(__name__)
CORS(app)

print("🔄 Caricamento modello Whisper in corso (questo potrebbe richiedere tempo)...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model = whisper.load_model("base", device=device)
print(f"✅ Whisper caricato correttamente su: {device}")

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "Nessun file audio ricevuto"}), 400
    
    audio_file = request.files['audio']
    target_language = request.form.get('language', 'it')
    
    print(f"🎙️ Ricevuto chunk audio. Lingua target: {target_language}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        audio_file.save(temp_audio.name)
        temp_path = temp_audio.name

    try:
        result = model.transcribe(
            temp_path, 
            language=target_language,
            fp16=False 
        )
        
        transcript_text = result.get("text", "").strip()
        print(f"📝 Trascritto: {transcript_text}")

        return jsonify({
            "text": transcript_text,
            "language": target_language
        })

    except Exception as e:
        print(f"❌ Errore durante la trascrizione: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        # Pulizia file temporaneo
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "model": "whisper-base"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)