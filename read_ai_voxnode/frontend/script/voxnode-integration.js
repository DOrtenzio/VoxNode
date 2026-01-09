/**
 * VoxNode Integration Layer
 * Gestisce la comunicazione con:
 * 1. Backend Python (Server Flask) per Whisper (Trascrizione)
 * 2. Groq Cloud API per LLM (Intelligenza)
 */

const VoxNodeIntegration = {
    state: {
        mediaRecorder: null,
        stream: null,
        isProcessing: false
    },

    // =======================================================
    // 1. TRASCRIZIONE (Whisper su Python Backend)
    // =======================================================

    startRealtimeTranscription: async function(onTextCallback, onErrorCallback) {
        try {
            // 1. Ottieni accesso al microfono
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.state.stream = stream;

            // 2. Setup MediaRecorder
            // Usiamo un timeslice di 3 secondi per inviare chunks audio al backend
            const options = { mimeType: 'audio/webm' };
            const mediaRecorder = new MediaRecorder(stream, options);
            this.state.mediaRecorder = mediaRecorder;

            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && mediaRecorder.state === 'recording') {
                    // Invia il blob al backend Python
                    await this.sendAudioToBackend(event.data, onTextCallback);
                }
            };

            // Avvia registrazione (invia dati ogni 2500ms = 2.5 secondi)
            // Questo delay permette di avere frasi abbastanza complete per Whisper
            mediaRecorder.start(2500); 

        } catch (err) {
            onErrorCallback(err);
        }
    },

    sendAudioToBackend: async function(audioBlob, onTextCallback) {
        if (this.state.isProcessing) return; // Evita sovrapposizioni troppo aggressive
        
        // Recupera lingua corrente dall'AppState globale (definito in app.js)
        // Questo risolve il problema che la lingua non cambiava
        const currentLang = (typeof AppState !== 'undefined') ? AppState.language : 'it';

        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', currentLang); // <--- FIX CRITICO: Invio lingua al backend

        try {
            this.state.isProcessing = true;
            const response = await fetch('http://localhost:5000/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);

            const data = await response.json();
            
            if (data.text) {
                onTextCallback(data.text);
            }
        } catch (error) {
            console.error("Errore invio audio:", error);
        } finally {
            this.state.isProcessing = false;
        }
    },

    stop: function() {
        if (this.state.mediaRecorder) {
            this.state.mediaRecorder.stop();
            this.state.mediaRecorder = null;
        }
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
            this.state.stream = null;
        }
    },

    pause: function() {
        if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
            this.state.mediaRecorder.pause();
        }
    },

    resume: function() {
        if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'paused') {
            this.state.mediaRecorder.resume();
        }
    },

    // =======================================================
    // 2. INTELLIGENZA ARTIFICIALE (Groq API diretta)
    // =======================================================

    generateAiResponse: async function(userQuestion, contextText, apiKey) {
        if (!contextText || contextText.length < 10) {
            return "Il testo è troppo breve per essere analizzato. Leggi ancora un po'.";
        }

        // COSTRUZIONE DEL SYSTEM PROMPT (FIX CRITICO)
        // Definisce il comportamento dell'IA
        const systemPrompt = `
Sei un assistente di studio esperto e preciso.
Il tuo compito è analizzare il testo fornito dall'utente (che è una trascrizione di una lettura tecnica).
Rispondi alla domanda dell'utente BASANDOTI SOLAMENTE sul testo fornito nel contesto.
Se la risposta non è nel testo, dillo chiaramente.
Sii conciso e strutturato (usa elenchi puntati se necessario).
        `.trim();

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `CONTESTO TESTO LETTO:\n"${contextText}"\n\nDOMANDA UTENTE:\n${userQuestion}` }
        ];

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192", // Modello veloce ed efficace
                    messages: messages,
                    temperature: 0.3, // Bassa temperatura per risposte più fedeli al testo
                    max_tokens: 500
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            return data.choices[0].message.content;

        } catch (error) {
            console.error("Groq API Error:", error);
            return "Mi dispiace, si è verificato un errore nel contattare il cervello IA (Groq). Verifica la Key o la connessione.";
        }
    }
};