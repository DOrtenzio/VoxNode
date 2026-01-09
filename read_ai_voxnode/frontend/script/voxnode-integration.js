// frontend/script/voxnode-integration.js
class VoxNodeIntegration {
    static config = {
        backendUrl: 'http://localhost:5000',
        fallbackEnabled: true,
        autoReconnect: true,
        reconnectDelay: 3000,
        maxRetries: 3
    };
    
    static state = {
        connected: false,
        initializing: false,
        retryCount: 0,
        currentSession: null,
        mediaRecorder: null,
        audioChunks: [],
        isRecording: false
    };
    
    static eventHandlers = {
        onConnected: null,
        onDisconnected: null,
        onError: null,
        onTranscriptionResult: null,
        onAiResponse: null
    };
    
    // ========== PUBLIC API ==========
    
    /**
     * Inizializza la connessione al backend
     */
    static async initialize() {
        if (this.state.initializing) {
            console.log('⚠️ Inizializzazione già in corso...');
            return false;
        }
        
        this.state.initializing = true;
        console.log('🔧 Inizializzazione VoxNode...');
        
        try {
            // 1. Verifica se backend è attivo
            const health = await this.checkBackendHealth();
            
            if (health.healthy) {
                this.state.connected = true;
                this.state.retryCount = 0;
                
                console.log('✅ Connesso al backend Python');
                this._triggerEvent('onConnected', {
                    url: this.config.backendUrl,
                    timestamp: new Date().toISOString(),
                    backendInfo: health.info
                });
                
                return true;
            } else {
                throw new Error('Backend non raggiungibile');
            }
            
        } catch (error) {
            console.error('❌ Errore inizializzazione:', error.message);
            
            // Fallback a Web Speech API se configurato
            if (this.config.fallbackEnabled) {
                console.log('🔄 Attivazione modalità fallback...');
                return this._activateFallbackMode();
            }
            
            this._triggerEvent('onError', {
                type: 'INITIALIZATION_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            return false;
            
        } finally {
            this.state.initializing = false;
        }
    }
    
    /**
     * Trascrive un file audio
     */
    static async transcribeAudio(audioBlob, options = {}) {
        const defaultOptions = {
            language: AppState?.language || 'it',
            context: '',
            model: 'base',
            temperature: 0.0
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // Se backend non connesso, usa fallback
        if (!this.state.connected) {
            return this._transcribeWithFallback(audioBlob, finalOptions);
        }
        
        try {
            console.log('🎤 Invio audio per trascrizione...');
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('language', finalOptions.language);
            formData.append('context', finalOptions.context);
            
            const response = await fetch(`${this.config.backendUrl}/api/transcribe`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Trascrizione fallita');
            }
            
            const transcriptionResult = {
                text: result.text.trim(),
                confidence: result.confidence || 0.8,
                language: result.language || finalOptions.language,
                isFinal: true,
                source: 'whisper-backend',
                timestamp: new Date().toISOString()
            };
            
            this._triggerEvent('onTranscriptionResult', transcriptionResult);
            return transcriptionResult;
            
        } catch (error) {
            console.warn('Backend transcription failed:', error.message);
            return this._transcribeWithFallback(audioBlob, finalOptions);
        }
    }
    
    /**
     * Avvia trascrizione in tempo reale
     */
    static async startRealtimeTranscription(callback, errorCallback) {
        console.log('🔊 Avvio trascrizione realtime...');
        
        // Memorizza callback per eventi
        if (callback) {
            this.eventHandlers.onTranscriptionResult = callback;
        }
        if (errorCallback) {
            this.eventHandlers.onError = errorCallback;
        }
        
        // Controlla se backend è connesso
        if (!this.state.connected) {
            console.log('⚠️ Backend non connesso, uso fallback...');
            return this._startFallbackRealtime();
        }
        
        try {
            // 1. Ottieni permessi microfono
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            // 2. Configura MediaRecorder
            this.state.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 16000
            });
            
            this.state.audioChunks = [];
            this.state.isRecording = true;
            
            // 3. Gestione chunk audio
            this.state.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.state.audioChunks.push(event.data);
                }
            };
            
            // 4. Quando finisce la registrazione, processa
            this.state.mediaRecorder.onstop = async () => {
                if (!this.state.isRecording) return;
                
                if (this.state.audioChunks.length > 0) {
                    const audioBlob = new Blob(this.state.audioChunks, {
                        type: 'audio/webm'
                    });
                    
                    try {
                        const result = await this.transcribeAudio(audioBlob, {
                            language: AppState?.language || 'it',
                            context: AppState?.transcript?.slice(-300) || ''
                        });
                        
                        if (this.eventHandlers.onTranscriptionResult) {
                            this.eventHandlers.onTranscriptionResult(
                                result.text,
                                result.isFinal,
                                result.confidence
                            );
                        }
                    } catch (error) {
                        console.error('Realtime transcription error:', error);
                        if (this.eventHandlers.onError) {
                            this.eventHandlers.onError(error);
                        }
                    }
                    
                    this.state.audioChunks = [];
                }
                
                // Riavvia registrazione se ancora in ascolto
                if (this.state.isRecording && this.state.mediaRecorder.state === 'inactive') {
                    setTimeout(() => {
                        if (this.state.isRecording) {
                            this.state.mediaRecorder.start();
                            setTimeout(() => {
                                if (this.state.mediaRecorder.state === 'recording') {
                                    this.state.mediaRecorder.stop();
                                }
                            }, 2000); // Registra 2 secondi alla volta
                        }
                    }, 100);
                }
            };
            
            // 5. Avvia ciclo di registrazione
            this.state.mediaRecorder.start();
            setTimeout(() => {
                if (this.state.mediaRecorder.state === 'recording') {
                    this.state.mediaRecorder.stop();
                }
            }, 2000);
            
            // 6. Ritorna controllo per stop/pause
            return {
                stop: () => this._stopRealtime(),
                pause: () => this._pauseRealtime(),
                getState: () => ({
                    isRecording: this.state.isRecording,
                    source: this.state.connected ? 'backend' : 'fallback'
                })
            };
            
        } catch (error) {
            console.error('Microphone access error:', error);
            
            if (errorCallback) {
                errorCallback(error);
            }
            
            // Fallback a Web Speech API
            return this._startFallbackRealtime(callback, errorCallback);
        }
    }
    
    /**
     * Genera risposta AI
     */
    static async generateResponse(question, context, options = {}) {
        const defaultOptions = {
            model: 'default',
            temperature: 0.7,
            maxLength: 500
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // Se backend non disponibile, usa risposte predefinite
        if (!this.state.connected) {
            return this._generateFallbackResponse(question, context);
        }
        
        try {
            console.log('🤖 Richiesta risposta AI...');
            
            const response = await fetch(`${this.config.backendUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question,
                    context: context,
                    options: finalOptions
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Generazione risposta fallita');
            }
            
            const aiResponse = {
                text: result.response,
                model: result.model || 'unknown',
                timestamp: new Date().toISOString(),
                source: 'backend-ai'
            };
            
            this._triggerEvent('onAiResponse', aiResponse);
            return aiResponse.text;
            
        } catch (error) {
            console.warn('AI response failed:', error.message);
            return this._generateFallbackResponse(question, context);
        }
    }
    
    /**
     * Test connessione backend
     */
    static async testConnection() {
        return this.checkBackendHealth();
    }
    
    /**
     * Disconnette dal backend
     */
    static disconnect() {
        this._stopRealtime();
        this.state.connected = false;
        this.state.currentSession = null;
        
        console.log('🔌 Disconnesso dal backend');
        this._triggerEvent('onDisconnected', {
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Imposta URL backend personalizzato
     */
    static setBackendUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('URL backend non valido');
        }
        
        // Rimuovi slash finale se presente
        this.config.backendUrl = url.replace(/\/$/, '');
        console.log(`🌐 Backend URL impostato: ${this.config.backendUrl}`);
        
        // Test nuova connessione
        setTimeout(() => this.initialize(), 1000);
    }
    
    /**
     * Imposta event handler
     */
    static on(event, handler) {
        if (!this.eventHandlers.hasOwnProperty(event)) {
            throw new Error(`Evento non supportato: ${event}`);
        }
        
        this.eventHandlers[event] = handler;
        return this; // Per chaining
    }
    
    // ========== PRIVATE METHODS ==========
    
    /**
     * Controlla stato backend
     */
    static async checkBackendHealth() {
        try {
            const startTime = Date.now();
            const response = await fetch(`${this.config.backendUrl}/api/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // Timeout 5 secondi
            });
            
            const responseTime = Date.now() - startTime;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                healthy: true,
                responseTime: responseTime,
                info: data,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Attiva modalità fallback
     */
    static _activateFallbackMode() {
        console.log('🔄 Modalità fallback attiva (Web Speech API)');
        
        // Verifica che Web Speech API sia disponibile
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const error = 'Nessun sistema di riconoscimento vocale disponibile';
            this._triggerEvent('onError', {
                type: 'NO_SPEECH_API',
                message: error
            });
            return false;
        }
        
        // Modalità fallback attiva
        this.state.connected = false; // Non connesso a backend
        this._triggerEvent('onConnected', {
            mode: 'fallback',
            source: 'web-speech-api',
            timestamp: new Date().toISOString()
        });
        
        return true;
    }
    
    /**
     * Trascrizione con fallback
     */
    static async _transcribeWithFallback(audioBlob, options) {
        console.log('🔄 Trascrizione con fallback...');
        
        // Nota: Web Speech API non supporta audio file, solo streaming live
        // Per fallback, useremo una trascrizione simulata con Web Speech live
        
        return new Promise((resolve, reject) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                reject(new Error('Web Speech API non disponibile'));
                return;
            }
            
            const recognition = new SpeechRecognition();
            recognition.lang = options.language === 'it' ? 'it-IT' : 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.continuous = false;
            
            // Imposta timeout
            const timeout = setTimeout(() => {
                recognition.stop();
                reject(new Error('Timeout trascrizione'));
            }, 10000);
            
            recognition.onresult = (event) => {
                clearTimeout(timeout);
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                resolve({
                    text: transcript,
                    confidence: confidence,
                    language: options.language,
                    isFinal: true,
                    source: 'web-speech-fallback',
                    timestamp: new Date().toISOString()
                });
            };
            
            recognition.onerror = (event) => {
                clearTimeout(timeout);
                reject(new Error(`Fallback error: ${event.error}`));
            };
            
            recognition.onend = () => {
                clearTimeout(timeout);
            };
            
            recognition.start();
        });
    }
    
    /**
     * Avvia trascrizione realtime in fallback
     */
    static _startFallbackRealtime(callback, errorCallback) {
        console.log('🔊 Avvio realtime fallback (Web Speech API)...');
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            const error = new Error('Web Speech API non disponibile');
            if (errorCallback) errorCallback(error);
            throw error;
        }
        
        const recognition = new SpeechRecognition();
        recognition.lang = AppState?.language === 'it' ? 'it-IT' : 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        
        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (callback) {
                if (interimTranscript) {
                    callback(interimTranscript, false, 0.5);
                }
                if (finalTranscript) {
                    callback(finalTranscript, true, 0.8);
                }
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Fallback recognition error:', event.error);
            if (errorCallback) {
                errorCallback(new Error(`Recognition error: ${event.error}`));
            }
        };
        
        recognition.start();
        this.state.isRecording = true;
        
        return {
            stop: () => {
                recognition.stop();
                this.state.isRecording = false;
            },
            pause: () => {
                recognition.stop();
            },
            getState: () => ({
                isRecording: this.state.isRecording,
                source: 'fallback'
            })
        };
    }
    
    /**
     * Ferma trascrizione realtime
     */
    static _stopRealtime() {
        if (this.state.mediaRecorder && this.state.mediaRecorder.state !== 'inactive') {
            this.state.mediaRecorder.stop();
        }
        
        if (this.state.mediaRecorder && this.state.mediaRecorder.stream) {
            this.state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        this.state.isRecording = false;
        this.state.audioChunks = [];
        
        console.log('⏹️ Trascrizione realtime fermata');
    }
    
    /**
     * Mette in pausa trascrizione realtime
     */
    static _pauseRealtime() {
        if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
            this.state.mediaRecorder.stop();
            console.log('⏸️ Trascrizione realtime in pausa');
        }
    }
    
    /**
     * Genera risposta di fallback
     */
    static _generateFallbackResponse(question, context) {
        console.log('🤖 Generazione risposta fallback...');
        
        const questionLower = question.toLowerCase();
        let response = '';
        
        if (questionLower.includes('riassum')) {
            response = `**Riassunto:** Basandomi sul testo fornito, posso identificare i seguenti punti principali:\n\n` +
                      `1. Il testo sembra trattare di ${context.substring(0, 50)}...\n` +
                      `2. Vengono presentate diverse informazioni rilevanti.\n` +
                      `3. La struttura appare organizzata in modo logico.\n\n` +
                      `*Nota: Per un riassunto più accurato, connetti il backend AI.*`;
        } 
        else if (questionLower.includes('punt') && questionLower.includes('chiav')) {
            response = `**Punti Chiave:**\n\n` +
                      `1. **Punto principale identificato** dal testo\n` +
                      `2. **Secondo concetto importante** menzionato\n` +
                      `3. **Informazione rilevante** per la comprensione\n` +
                      `4. **Dettaglio significativo** da considerare\n` +
                      `5. **Conclusione o sintesi** presente nel testo\n\n` +
                      `🔗 *Connetti il backend per punti chiave più precisi.*`;
        }
        else if (questionLower.includes('spieg')) {
            response = `**Spiegazione:** Il testo analizzato presenta concetti che meritano approfondimento. ` +
                      `In particolare, si osserva una trattazione di ${context.substring(0, 30)}... ` +
                      `Per una spiegazione dettagliata con riferimenti specifici, ` +
                      `si consiglia di attivare la connessione al backend AI.`;
        }
        else if (questionLower.includes('analiz') || questionLower.includes('sentiment')) {
            response = `**Analisi Sentiment:** Basandomi sul tono e la struttura del testo, ` +
                      `posso notare un approccio generalmente neutro/descrittivo. ` +
                      `Il linguaggio utilizzato sembra ${context.length > 100 ? 'articolato' : 'conciso'}. ` +
                      `Per un'analisi sentiment più accurata con rilevamento di emozioni specifiche, ` +
                      `attiva il backend AI completo.`;
        }
        else {
            response = `Ho analizzato la tua domanda: "${question}"\n\n` +
                      `Basandomi sul testo fornito, posso confermare che contiene informazioni rilevanti. ` +
                      `Per una risposta più specifica e dettagliata, ti consiglio di:\n\n` +
                      `1. **Connettere il backend AI** per elaborazione completa\n` +
                      `2. **Formulare domande più specifiche** su concetti chiave\n` +
                      `3. **Verificare la connessione** al server di trascrizione\n\n` +
                      `💡 *Suggerimento:* Prova con "Riassumi il testo" o "Quali sono i punti chiave?"`;
        }
        
        return response;
    }
    
    /**
     * Trigger event handler
     */
    static _triggerEvent(eventName, data) {
        if (this.eventHandlers[eventName] && typeof this.eventHandlers[eventName] === 'function') {
            try {
                this.eventHandlers[eventName](data);
            } catch (error) {
                console.error(`Error in ${eventName} handler:`, error);
            }
        }
    }
    
    /**
     * Getter per stato corrente
     */
    static get status() {
        return {
            connected: this.state.connected,
            initializing: this.state.initializing,
            recording: this.state.isRecording,
            backendUrl: this.config.backendUrl,
            fallbackActive: !this.state.connected && this.config.fallbackEnabled,
            retryCount: this.state.retryCount
        };
    }
}

// ========== GLOBAL EXPORTS ==========

// SpeechManager compatibility wrapper
window.SpeechManager = {
    initialize: async () => {
        try {
            const result = await VoxNodeIntegration.initialize();
            return result;
        } catch (error) {
            console.warn('SpeechManager init warning:', error.message);
            return true; // Sempre true per permettere fallback
        }
    },
    
    startListening: async (callback) => {
        try {
            AppState.voxnodeStream = await VoxNodeIntegration.startRealtimeTranscription(
                callback,
                (error) => {
                    console.error('Stream error:', error);
                    if (window.showNotification) {
                        showNotification('Errore riconoscimento vocale', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('Failed to start listening:', error);
            throw error;
        }
    },
    
    pause: () => {
        if (AppState.voxnodeStream) {
            AppState.voxnodeStream.pause();
        }
    },
    
    stop: () => {
        if (AppState.voxnodeStream) {
            AppState.voxnodeStream.stop();
            AppState.voxnodeStream = null;
        }
    },
    
    setLanguage: (lang) => {
        if (AppState) {
            AppState.language = lang;
        }
    }
};

// ChatbotManager compatibility wrapper
window.ChatbotManager = {
    generateOnlineResponse: async (question, context, config) => {
        // Ignora config se fornito, usa sempre VoxNodeIntegration
        return await VoxNodeIntegration.generateResponse(question, context);
    }
};

// Export globale per debug
window.VoxNodeIntegration = VoxNodeIntegration;

console.log('✅ VoxNodeIntegration caricato - Versione 2.0');