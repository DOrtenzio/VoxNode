const AppState = {
    language: 'it',
    isListening: false,
    isPaused: false,
    transcript: '',
    interimTranscript: '',
    currentNotebook: null,
    aiMode: 'groq',
    apiConfig: null,
    isProcessing: false,
    audioLevel: 0,
    sentences: [],
    confidenceHistory: [],
    wordCount: 0,
    characterCount: 0,
    sessionStartTime: null,
    isSpeechEnabled: false,
    analysisInterval: null
};

const Translations = {
    it: {
        statusReady: 'Pronto',
        statusListening: 'Ascoltando...',
        statusPaused: 'In pausa',
        statusFinished: 'Completato',
        statusProcessing: 'Elaborando...',
        commandPause: 'PAUSA',
        commandStop: 'STOP',
        commandResume: 'CONTINUA',
        placeholderChat: 'Chiedi qualcosa sul testo...',
        placeholderApiKey: 'Inserisci API Key...',
        btnSave: 'Salva',
        btnClear: 'Pulisci',
        btnCopy: 'Copia',
        btnStart: 'Inizia',
        btnPause: 'Pausa',
        btnStop: 'Stop',
        btnConnect: 'Connetti',
        btnSend: 'Invia',
        quickSummary: 'Riassumi',
        quickKeypoints: 'Punti Chiave',
        quickExplain: 'Spiega',
        quickSentiment: 'Analisi',
        quickQuestions: 'Domande',
        notificationListening: 'Ascolto iniziato',
        notificationPaused: 'Pausa - Testo salvato',
        notificationStopped: 'Lettura completata!',
        notificationError: 'Errore microfono',
        notificationSaved: 'Salvato con successo',
        notificationCopied: 'Testo copiato!',
        notificationCleared: 'Testo cancellato',
        notificationConnected: 'Connesso all\'IA!',
        notificationExported: 'Esportato con successo!',
        notificationSpeaking: 'Sintesi vocale avviata'
    },
    en: {
        statusReady: 'Ready',
        statusListening: 'Listening...',
        statusPaused: 'Paused',
        statusFinished: 'Completed',
        statusProcessing: 'Processing...',
        commandPause: 'PAUSE',
        commandStop: 'STOP',
        commandResume: 'CONTINUE',
        placeholderChat: 'Ask something about the text...',
        placeholderApiKey: 'Enter API Key...',
        btnSave: 'Save',
        btnClear: 'Clear',
        btnCopy: 'Copy',
        btnStart: 'Start',
        btnPause: 'Pause',
        btnStop: 'Stop',
        btnConnect: 'Connect',
        btnSend: 'Send',
        quickSummary: 'Summarize',
        quickKeypoints: 'Key Points',
        quickExplain: 'Explain',
        quickSentiment: 'Sentiment',
        quickQuestions: 'Questions',
        notificationListening: 'Listening started',
        notificationPaused: 'Paused - Text saved',
        notificationStopped: 'Reading completed!',
        notificationError: 'Microphone error',
        notificationSaved: 'Saved successfully',
        notificationCopied: 'Text copied!',
        notificationCleared: 'Text cleared',
        notificationConnected: 'Connected to AI!',
        notificationExported: 'Exported successfully!',
        notificationSpeaking: 'Speech synthesis started'
    }
};

async function initializeApplication() {
    try {
        console.log('Inizializzazione applicazione VoxNode...');
        
        // Mostra loader
        showLoading('Caricamento modelli IA locali...');
        
        // Carica configurazioni
        loadUserPreferences();
        
        // Inizializza VoxNode
        await VoxNodeIntegration.initialize();
        
        // Inizializza sintesi vocale
        initializeSpeechSynthesis();
        
        // Carica notebook
        loadNotebooks();
        
        // Aggiorna UI
        updateUI();
        
        // Configura event listeners
        setupEventListeners();
        
        // Nascondi loader
        hideLoading();
        
        // Messaggio di benvenuto
        setTimeout(() => {
            addChatMessage('ai', '✅ VoxNode Pro inizializzato! Sistema AI locale pronto all\'uso. Inizia a leggere ad alta voce.');
        }, 1000);
        
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification(`Errore: ${error.message}`, 'error');
        
        // Fallback a Web Speech API se VoxNode fallisce
        if (error.message.includes('VoxNode')) {
            showNotification('Usando riconoscimento vocale del browser come fallback', 'warning');
            await initializeSpeechRecognitionFallback();
        }
    }
}

function showLoading(message) {
    const loader = document.createElement('div');
    loader.id = 'voxnode-loader';
    loader.innerHTML = `
        <div class="loader-overlay">
            <div class="loader-content">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="loader-text mt-3">${message}</div>
                <div class="progress mt-3" style="width: 200px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         style="width: 0%"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('voxnode-loader');
    if (loader) {
        loader.remove();
    }
}

function updateLoadingProgress(message, percent) {
    const loaderText = document.querySelector('#voxnode-loader .loader-text');
    const progressBar = document.querySelector('#voxnode-loader .progress-bar');
    
    if (loaderText) loaderText.textContent = message;
    if (progressBar) progressBar.style.width = `${percent}%`;
}

async function initializeSpeechRecognitionFallback() {
    console.log('🔄 Avvio fallback Web Speech API...');
    
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            throw new Error('Web Speech API non supportata');
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = AppState.language === 'it' ? 'it-IT' : 'en-US';
        
        // Salva per uso futuro
        AppState.fallbackRecognition = recognition;
        
        showNotification('Usando riconoscimento vocale del browser', 'info');
        return true;
        
    } catch (error) {
        console.error('Fallback initialization error:', error);
        showNotification('Microfono non disponibile', 'error');
        disableVoiceFeatures();
        return false;
    }
}

// Setup event listeners avanzati
function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter per inviare messaggio
        if (e.ctrlKey && e.key === 'Enter' && !document.getElementById('chatInput').disabled) {
            sendMessage();
        }
        
        // Ctrl+S per salvare
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveToNotebook();
        }
        
        // Space per start/stop listening
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            toggleListening();
        }
    });
    
    // Gestione visiva del trascrittore
    const transcriptContainer = document.getElementById('transcriptContainer');
    if (transcriptContainer) {
        transcriptContainer.addEventListener('scroll', handleTranscriptScroll);
        transcriptContainer.addEventListener('click', handleTranscriptClick);
    }
    
    // Auto-save ogni 30 secondi
    setInterval(autoSave, 30000);
}

// Inizializzazione riconoscimento vocale
async function initializeSpeechRecognition() {
    try {
        console.log('Inizializzazione riconoscimento vocale...');
        await SpeechManager.initialize();
        updateStatusIndicator('ready');
        AppState.sessionStartTime = new Date();
        
        // Test rapido microfono
        testMicrophone();
        
    } catch (error) {
        console.error('Speech initialization error:', error);
        showNotification(Translations[AppState.language].notificationError, 'error');
        disableVoiceFeatures();
    }
}

// Test microfono
async function testMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        console.log('Microfono testato con successo');
    } catch (error) {
        console.warn('Microfono non disponibile:', error);
    }
}

// Disabilita funzionalità vocali in caso di errore
function disableVoiceFeatures() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (startBtn) startBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = 'Microfono non disponibile';
    }
}

// Inizializza sintesi vocale
function initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        AppState.isSpeechEnabled = true;
        console.log('Speech synthesis available');
    }
}

// Avvia/ferma ascolto con toggle
function toggleListening() {
    if (AppState.isListening) {
        pauseListening();
    } else if (AppState.isPaused) {
        resumeListening();
    } else {
        startListening();
    }
}

// Avvia ascolto
async function startListening() {
    if (AppState.isListening || AppState.isProcessing) return;
    
    try {
        console.log('Avvio ascolto...');
        await SpeechManager.startListening(handleSpeechResult);
        
        AppState.isListening = true;
        AppState.isPaused = false;
        AppState.sessionStartTime = new Date();
        
        updateUI();
        updateStatusIndicator('listening');
        startVoiceVisualizer();
        
        showNotification(Translations[AppState.language].notificationListening, 'info');
        
        // Analisi in tempo reale
        startRealtimeAnalysis();
        
    } catch (error) {
        console.error('Start listening error:', error);
        showNotification(Translations[AppState.language].notificationError, 'error');
    }
}

// Gestisce risultati riconoscimento vocale
function handleSpeechResult(transcript, isFinal, confidence) {
    console.log('Risultato vocale:', { transcript, isFinal, confidence });
    
    if (!transcript) return;
    
    if (!isFinal) {
        // Testo intermedio
        AppState.interimTranscript = transcript;
        updateTranscript();
    } else {
        // Testo finale
        processFinalTranscript(transcript, confidence);
    }
    
    // Aggiorna interfaccia
    updateVoiceVisualizer(confidence);
    updateConfidence(confidence);
    
    // Analisi in tempo reale
    if (isFinal) {
        analyzeTextRealtime(transcript);
    }
}

// Processa testo finale
function processFinalTranscript(transcript, confidence) {
    // Aggiungi al transcript
    AppState.transcript += transcript + ' ';
    AppState.interimTranscript = '';
    
    // Salva confidenza per statistiche
    AppState.confidenceHistory.push({
        text: transcript,
        confidence: confidence,
        timestamp: new Date()
    });
    
    // Aggiorna statistiche
    updateStatistics();
    
    // Animazione testo
    appendToTranscript(transcript);
    
    // Controlla comandi vocali
    if (checkForCommands(transcript)) {
        return;
    }
    
    // Abilita funzionalità chat dopo primo testo
    if (AppState.transcript.trim().split(/\s+/).length > 10) {
        enableChatFeatures();
    }
}

// Controlla comandi vocali
function checkForCommands(transcript) {
    const t = Translations[AppState.language];
    const lowerTranscript = transcript.toLowerCase().trim();
    
    const commands = {
        'pausa': pauseListening,
        'pause': pauseListening,
        'stop': stopListening,
        'termina': stopListening,
        'fine': stopListening,
        'continua': resumeListening,
        'continue': resumeListening,
        'riprendi': resumeListening,
        'salva': saveToNotebook,
        'esporta': () => exportTranscript('txt'),
        'cancella': clearTranscript,
        'pulisci': clearTranscript,
        'copia': copyTranscript,
        'leggi': () => speakText(AppState.transcript)
    };
    
    for (const [command, action] of Object.entries(commands)) {
        if (lowerTranscript === command) {
            console.log(`Comando vocale rilevato: ${command}`);
            action();
            
            // Feedback vocale per comandi importanti
            if (['pausa', 'stop', 'fine', 'salva'].includes(command) && AppState.isSpeechEnabled) {
                speakText(t[`notification${command.charAt(0).toUpperCase() + command.slice(1)}`] || 'Comando eseguito');
            }
            
            return true;
        }
    }
    
    return false;
}

// Metti in pausa ascolto
function pauseListening() {
    if (AppState.isListening) {
        console.log('Pausa ascolto...');
        SpeechManager.pause();
        AppState.isListening = false;
        AppState.isPaused = true;
        
        // Salva testo intermedio
        if (AppState.interimTranscript) {
            AppState.transcript += AppState.interimTranscript + ' ';
            AppState.interimTranscript = '';
            updateTranscript();
            updateStatistics();
        }
        
        updateUI();
        updateStatusIndicator('paused');
        stopVoiceVisualizer();
        
        showNotification(Translations[AppState.language].notificationPaused, 'info');
    }
}

// Riprendi ascolto
function resumeListening() {
    if (AppState.isPaused) {
        startListening();
    }
}

// Ferma ascolto
function stopListening() {
    console.log('Stop ascolto...');
    SpeechManager.stop();
    AppState.isListening = false;
    AppState.isPaused = false;
    
    // Ferma analisi in tempo reale
    if (AppState.analysisInterval) {
        clearInterval(AppState.analysisInterval);
        AppState.analysisInterval = null;
    }
    
    // Salva tutto il testo intermedio
    if (AppState.interimTranscript) {
        AppState.transcript += AppState.interimTranscript + ' ';
        AppState.interimTranscript = '';
        updateTranscript();
        updateStatistics();
    }
    
    // Calcola durata sessione
    const sessionDuration = AppState.sessionStartTime ? 
        Math.round((new Date() - AppState.sessionStartTime) / 1000) : 0;
    console.log(`Session duration: ${sessionDuration}s`);
    
    updateUI();
    updateStatusIndicator('finished');
    stopVoiceVisualizer();
    enableChatFeatures();
    
    showNotification(Translations[AppState.language].notificationStopped, 'success');
    
    // Auto-save se c'è abbastanza testo
    if (AppState.wordCount > 50) {
        setTimeout(() => {
            autoSave();
        }, 1000);
    }
}

// Aggiorna interfaccia utente
function updateUI() {
    const t = Translations[AppState.language];
    const elements = {
        startBtn: document.getElementById('startBtn'),
        pauseBtn: document.getElementById('pauseBtn'),
        stopBtn: document.getElementById('stopBtn'),
        saveBtn: document.getElementById('saveBtn'),
        statusText: document.getElementById('statusText'),
        chatInput: document.getElementById('chatInput'),
        sendBtn: document.getElementById('sendBtn'),
        apiKey: document.getElementById('apiKey')
    };
    
    // Aggiorna stati bottoni
    if (AppState.isListening) {
        if (elements.statusText) elements.statusText.textContent = t.statusListening;
        if (elements.startBtn) elements.startBtn.disabled = true;
        if (elements.pauseBtn) elements.pauseBtn.disabled = false;
        if (elements.stopBtn) elements.stopBtn.disabled = false;
        if (elements.saveBtn) elements.saveBtn.disabled = true;
        if (elements.chatInput) elements.chatInput.disabled = true;
        if (elements.sendBtn) elements.sendBtn.disabled = true;
    } else if (AppState.isPaused) {
        if (elements.statusText) elements.statusText.textContent = t.statusPaused;
        if (elements.startBtn) elements.startBtn.disabled = false;
        if (elements.pauseBtn) elements.pauseBtn.disabled = true;
        if (elements.stopBtn) elements.stopBtn.disabled = false;
        if (elements.saveBtn) elements.saveBtn.disabled = !AppState.transcript.trim();
        if (elements.chatInput) elements.chatInput.disabled = false;
        if (elements.sendBtn) elements.sendBtn.disabled = false;
    } else {
        if (elements.statusText) elements.statusText.textContent = AppState.transcript ? t.statusFinished : t.statusReady;
        if (elements.startBtn) elements.startBtn.disabled = false;
        if (elements.pauseBtn) elements.pauseBtn.disabled = true;
        if (elements.stopBtn) elements.stopBtn.disabled = true;
        if (elements.saveBtn) elements.saveBtn.disabled = !AppState.transcript.trim();
        if (elements.chatInput) elements.chatInput.disabled = !AppState.transcript.trim();
        if (elements.sendBtn) elements.sendBtn.disabled = !AppState.transcript.trim();
    }
    
    // Aggiorna placeholder
    if (elements.chatInput) {
        elements.chatInput.placeholder = t.placeholderChat;
    }
    if (elements.apiKey) {
        elements.apiKey.placeholder = t.placeholderApiKey;
    }
    
    // Aggiorna testi bottoni
    updateButtonTexts();
    
    // Aggiorna statistiche
    updateStatistics();
}

// Aggiorna testi bottoni
function updateButtonTexts() {
    const t = Translations[AppState.language];
    
    // Bottoni controllo vocale
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.querySelector('.btn-clear');
    const copyBtn = document.querySelector('.btn-copy');
    
    if (startBtn && startBtn.querySelector('.btn-label')) {
        startBtn.querySelector('.btn-label').textContent = t.btnStart;
    }
    if (pauseBtn && pauseBtn.querySelector('.btn-label')) {
        pauseBtn.querySelector('.btn-label').textContent = t.btnPause;
    }
    if (stopBtn && stopBtn.querySelector('.btn-label')) {
        stopBtn.querySelector('.btn-label').textContent = t.btnStop;
    }
    if (saveBtn) {
        saveBtn.innerHTML = `<i class="fas fa-save"></i> ${t.btnSave}`;
    }
    if (clearBtn) {
        clearBtn.innerHTML = `<i class="fas fa-trash"></i> ${t.btnClear}`;
    }
    if (copyBtn) {
        copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${t.btnCopy}`;
    }
    
    // Bottoni chat
    const sendBtn = document.getElementById('sendBtn');
    const connectBtn = document.querySelector('.btn-connect');
    
    if (sendBtn) {
        sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i>`;
    }
    if (connectBtn) {
        connectBtn.innerHTML = `<i class="fas fa-plug"></i> ${t.btnConnect}`;
    }
    
    // Quick actions
    const quickBtns = document.querySelectorAll('.btn-quick');
    const quickLabels = [t.quickSummary, t.quickKeypoints, t.quickExplain, t.quickSentiment, t.quickQuestions];
    
    quickBtns.forEach((btn, index) => {
        const icon = btn.querySelector('i');
        if (icon && quickLabels[index]) {
            btn.innerHTML = `<i class="${icon.className}"></i> ${quickLabels[index]}`;
        }
    });
}

// Aggiungi testo al trascrittore con animazione
function appendToTranscript(text) {
    const transcriptElement = document.getElementById('transcriptText');
    const container = document.getElementById('transcriptContainer');
    
    if (!transcriptElement || !container) return;
    
    if (transcriptElement.querySelector('.empty-state')) {
        transcriptElement.innerHTML = '';
    }
    
    // Crea elemento con animazione
    const textItem = document.createElement('div');
    textItem.className = 'text-item floating';
    textItem.textContent = text;
    
    // Aggiungi timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'text-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    textItem.appendChild(timestamp);
    
    // Animazione entrata
    textItem.style.opacity = '0';
    textItem.style.transform = 'translateY(20px) scale(0.95)';
    
    transcriptElement.appendChild(textItem);
    
    // Trigger animazione
    setTimeout(() => {
        textItem.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        textItem.style.opacity = '1';
        textItem.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    // Scroll automatico
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

// Aggiorna trascrittore
function updateTranscript() {
    const transcriptElement = document.getElementById('transcriptText');
    const container = document.getElementById('transcriptContainer');
    
    if (!transcriptElement || !container) return;
    
    if (!AppState.transcript.trim() && !AppState.interimTranscript) {
        transcriptElement.innerHTML = `
            <div class="empty-state floating">
                <i class="fas fa-comment-dots fa-3x"></i>
                <h4>Inizia a leggere</h4>
                <p>Il testo apparirà qui in tempo reale</p>
                <small>Premi lo spazio o clicca "Inizia"</small>
            </div>
        `;
        return;
    }
    
    // Costruisci HTML
    let html = '';
    
    // Suddividi in frasi per visualizzazione migliore
    const sentences = AppState.transcript.split(/(?<=[.!?])\s+/);
    
    sentences.forEach((sentence, index) => {
        if (sentence.trim()) {
            html += `
                <div class="text-item ${index === sentences.length - 1 ? 'last-item' : ''}">
                    ${sentence}
                    <div class="text-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            `;
        }
    });
    
    // Aggiungi testo intermedio se presente
    if (AppState.interimTranscript) {
        html += `<div class="interim-text">${AppState.interimTranscript}</div>`;
    }
    
    transcriptElement.innerHTML = html;
    
    // Scroll
    container.scrollTop = container.scrollHeight;
}

// Aggiorna statistiche
function updateStatistics() {
    const transcript = AppState.transcript;
    
    // Conta parole
    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
    AppState.wordCount = words.length;
    
    // Conta caratteri
    AppState.characterCount = transcript.length;
    
    // Conta frasi
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    AppState.sentences = sentences;
    
    // Calcola accuratezza media
    const avgConfidence = AppState.confidenceHistory.length > 0 ?
        AppState.confidenceHistory.reduce((sum, item) => sum + item.confidence, 0) / AppState.confidenceHistory.length : 0;
    
    // Aggiorna UI
    const wordCountElement = document.getElementById('wordCount');
    const confidenceElement = document.getElementById('confidence');
    
    if (wordCountElement) {
        wordCountElement.textContent = `${AppState.wordCount} parole`;
    }
    if (confidenceElement) {
        confidenceElement.textContent = `${Math.round(avgConfidence * 100)}% accuratezza`;
    }
}

// Analisi testo in tempo reale
function analyzeTextRealtime(text) {
    if (!text.trim() || AppState.isProcessing) return;
    
    try {
        // Analisi base del sentiment
        const sentiment = analyzeSentiment(text);
        updateSentimentDisplay(sentiment);
        
    } catch (error) {
        console.warn('Realtime analysis error:', error);
    }
}

// Analizza sentiment del testo
function analyzeSentiment(text) {
    const positiveWords = ['buono', 'ottimo', 'fantastico', 'eccellente', 'perfetto', 'meraviglioso', 'grande', 'bello'];
    const negativeWords = ['cattivo', 'brutto', 'terribile', 'orribile', 'pessimo', 'triste', 'male', 'difficile'];
    
    const lowerText = text.toLowerCase();
    let positive = 0;
    let negative = 0;
    
    positiveWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        positive += (lowerText.match(regex) || []).length;
    });
    
    negativeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        negative += (lowerText.match(regex) || []).length;
    });
    
    const score = positive - negative;
    
    if (score > 2) return { label: 'Positivo', emoji: '😊', color: '#10b981' };
    if (score < -2) return { label: 'Negativo', emoji: '😞', color: '#ef4444' };
    return { label: 'Neutrale', emoji: '😐', color: '#6b7280' };
}

// Aggiorna display sentiment
function updateSentimentDisplay(sentiment) {
    const element = document.getElementById('sentiment');
    if (element) {
        element.innerHTML = `${sentiment.emoji} ${sentiment.label}`;
        element.style.color = sentiment.color;
        element.style.borderColor = sentiment.color;
    }
}

// Avvia analisi in tempo reale
function startRealtimeAnalysis() {
    // Inizializza elementi display se non esistono
    if (!document.getElementById('sentiment')) {
        createAnalysisDisplay();
    }
    
    // Aggiorna periodicamente
    if (AppState.analysisInterval) {
        clearInterval(AppState.analysisInterval);
    }
    
    AppState.analysisInterval = setInterval(() => {
        if (AppState.transcript) {
            analyzeTextRealtime(AppState.transcript);
        }
    }, 5000);
}

// Crea display analisi
function createAnalysisDisplay() {
    const statsElement = document.querySelector('.stats');
    if (statsElement) {
        statsElement.innerHTML += `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Sentiment</div>
                    <div id="sentiment" class="stat-value sentiment">Neutrale</div>
                </div>
            </div>
        `;
    }
}

// Aggiorna visualizzatore vocale
function updateVoiceVisualizer(confidence) {
    const visualizer = document.getElementById('voiceVisualizer');
    if (!visualizer) return;
    
    const bars = visualizer.querySelectorAll('.bar');
    const intensity = Math.min(confidence * 1.5, 1);
    
    bars.forEach((bar, index) => {
        const baseHeight = 20;
        const maxHeight = 80;
        const waveHeight = Math.sin(Date.now() / 200 + index * 0.5) * maxHeight * intensity;
        const height = baseHeight + Math.max(0, waveHeight);
        
        bar.style.height = `${height}px`;
        bar.style.background = `linear-gradient(135deg, var(--primary) 0%, var(--secondary) ${intensity * 100}%, var(--accent) 100%)`;
        bar.style.opacity = 0.3 + (intensity * 0.7);
        bar.style.transform = `scaleY(${0.8 + intensity * 0.4})`;
    });
    
    // Aggiorna livello audio per effetti visivi
    AppState.audioLevel = intensity;
}

// Avvia visualizzatore vocale
function startVoiceVisualizer() {
    const visualizer = document.getElementById('voiceVisualizer');
    if (visualizer) {
        visualizer.classList.add('listening');
        visualizer.classList.add('pulse');
    }
}

// Ferma visualizzatore vocale
function stopVoiceVisualizer() {
    const visualizer = document.getElementById('voiceVisualizer');
    if (visualizer) {
        visualizer.classList.remove('listening');
        visualizer.classList.remove('pulse');
        
        const bars = visualizer.querySelectorAll('.bar');
        bars.forEach(bar => {
            bar.style.height = '20px';
            bar.style.opacity = '0.2';
            bar.style.transform = 'scaleY(1)';
        });
    }
}

// Aggiorna confidenza
function updateConfidence(confidence) {
    const confidenceElement = document.getElementById('confidence');
    if (confidenceElement) {
        const percent = Math.round(confidence * 100);
        confidenceElement.textContent = `${percent}% accuratezza`;
    }
}

// Aggiorna indicatore di stato
function updateStatusIndicator(status) {
    const dot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    const t = Translations[AppState.language];
    
    if (!dot || !statusText) return;
    
    switch(status) {
        case 'ready':
            dot.style.background = 'var(--success)';
            dot.style.animation = 'pulse 2s infinite';
            statusText.textContent = t.statusReady;
            break;
        case 'listening':
            dot.style.background = 'var(--primary)';
            dot.style.animation = 'pulse 0.5s infinite';
            statusText.textContent = t.statusListening;
            break;
        case 'paused':
            dot.style.background = 'var(--warning)';
            dot.style.animation = 'pulse 1s infinite';
            statusText.textContent = t.statusPaused;
            break;
        case 'finished':
            dot.style.background = 'var(--success)';
            dot.style.animation = 'none';
            statusText.textContent = t.statusFinished;
            break;
        case 'processing':
            dot.style.background = 'var(--accent)';
            dot.style.animation = 'spin 1s linear infinite';
            statusText.textContent = t.statusProcessing;
            break;
    }
}

// Pulisci trascrittore
function clearTranscript() {
    if (AppState.isListening) {
        showNotification('Fermati prima di cancellare', 'warning');
        return;
    }
    
    if (confirm('Cancellare tutto il testo?')) {
        AppState.transcript = '';
        AppState.interimTranscript = '';
        AppState.confidenceHistory = [];
        AppState.wordCount = 0;
        AppState.characterCount = 0;
        AppState.sentences = [];
        
        updateTranscript();
        updateUI();
        updateStatistics();
        
        showNotification(Translations[AppState.language].notificationCleared, 'info');
    }
}

// Copia trascrittore
function copyTranscript() {
    if (!AppState.transcript) {
        showNotification('Nessun testo da copiare', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(AppState.transcript).then(() => {
        showNotification(Translations[AppState.language].notificationCopied, 'success');
        
        // Effetto visivo
        const copyBtn = document.querySelector('.btn-copy');
        if (copyBtn) {
            copyBtn.classList.add('copied');
            setTimeout(() => copyBtn.classList.remove('copied'), 1000);
        }
    }).catch(err => {
        console.error('Copy error:', err);
        showNotification('Errore nella copia', 'error');
    });
}

// Abilita funzionalità chat
function enableChatFeatures() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const quickBtns = document.querySelectorAll('.btn-quick');
    
    if (chatInput) chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    
    quickBtns.forEach(btn => {
        btn.disabled = false;
        btn.classList.add('enabled');
    });
    
    // Focus sull'input
    setTimeout(() => {
        if (chatInput) chatInput.focus();
    }, 100);
}

// Invia messaggio chat
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Aggiungi messaggio utente
    addChatMessage('user', message);
    input.value = '';
    
    // Mostra stato elaborazione
    updateStatusIndicator('processing');
    AppState.isProcessing = true;
    updateUI();
    
    try {
        const response = await ChatbotManager.generateOnlineResponse(
            message, 
            AppState.transcript, 
            AppState.apiConfig
        );
        
        // Aggiungi risposta IA
        addChatMessage('ai', response);
        
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('ai', `⚠️ Errore: ${error.message}. Verifica la connessione all'IA.`);
    } finally {
        AppState.isProcessing = false;
        updateStatusIndicator('finished');
        updateUI();
    }
}

// Aggiungi messaggio alla chat
function addChatMessage(sender, text) {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = sender === 'user' ? 
        '<i class="fas fa-user"></i>' : 
        '<i class="fas fa-robot"></i>';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${formatMessageText(text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    
    // Animazione
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
    
    // Scroll
    container.scrollTop = container.scrollHeight;
}

// Formatta testo messaggio
function formatMessageText(text) {
    // Supporto base per markdown
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    return formatted;
}

function askQuestion(type) {
    if (!AppState.transcript.trim()) {
        showNotification('Prima leggi qualche testo', 'warning');
        return;
    }
    
    const questions = {
        'summary': 'Riassumi il seguente testo in 3 punti principali:',
        'keypoints': 'Estrai i 5 punti chiave più importanti:',
        'explain': 'Spiega i concetti principali in modo semplice:',
        'sentiment': 'Analizza il sentiment e lo stile del testo:',
        'questions': 'Genera 3 domande di comprensione del testo:'
    };
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput && questions[type]) {
        chatInput.value = questions[type];
        sendMessage();
    }
}

// Mostra notifica
function showNotification(message, type = 'info') {
    // Rimuovi notifiche precedenti
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animazione entrata
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Rimuovi dopo 4 secondi
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// Ottieni icona notifica
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Imposta lingua
function setLanguage(lang) {
    AppState.language = lang;
    SpeechManager.setLanguage(lang);
    updateUI();
}

function selectModel(model) {
    AppState.aiMode = model;
    
    document.querySelectorAll('.model-option').forEach(opt => {
        opt.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    const apiConfig = document.getElementById('apiConfig');
    if (apiConfig) apiConfig.style.display = 'none';
    
    AppState.apiConfig = { type: 'local', apiKey: null };
    
    showNotification('Modello locale selezionato', 'success');
}

// Connetti API
function connectAPI() {
    const apiKeyInput = document.getElementById('apiKey');
    if (!apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    const model = AppState.aiMode;
    
    if (!apiKey) {
        showNotification('Inserisci una API Key valida', 'error');
        return;
    }
    
    AppState.apiConfig = {
        type: model,
        apiKey: apiKey
    };
    
    // Salva API Key (in chiaro, ma solo per questa sessione)
    localStorage.setItem(`apiKey_${model}`, apiKey);
    
    showNotification(Translations[AppState.language].notificationConnected, 'success');
    
    // Test connessione
    testAPIConnection();
}

// Test connessione API
async function testAPIConnection() {
    try {
        const testResponse = await ChatbotManager.generateOnlineResponse(
            'Test connessione',
            'Questo è un test.',
            AppState.apiConfig
        );
        
        console.log('API test successful:', testResponse);
        addChatMessage('ai', '✅ Connessione all\'IA stabilita con successo!');
        
    } catch (error) {
        console.error('API test failed:', error);
        showNotification('Errore connessione API', 'error');
    }
}

// Carica preferenze utente
function loadUserPreferences() {
    // Carica API Key salvate
    const savedGroqKey = localStorage.getItem('apiKey_groq');
    const apiKeyInput = document.getElementById('apiKey');
    
    if (savedGroqKey && apiKeyInput) {
        apiKeyInput.value = savedGroqKey;
        AppState.apiConfig = { type: 'groq', apiKey: savedGroqKey };
    }
    
    // Carica lingua preferita
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
        AppState.language = savedLang;
    }
}

// Auto-save
function autoSave() {
    if (AppState.transcript && AppState.transcript.length > 100 && !AppState.isListening) {
        const key = `autosave_${new Date().toISOString().split('T')[0]}`;
        const data = {
            transcript: AppState.transcript,
            timestamp: new Date().toISOString(),
            wordCount: AppState.wordCount
        };
        
        localStorage.setItem(key, JSON.stringify(data));
        console.log('Auto-saved');
    }
}

// Sintesi vocale
function speakText(text) {
    if (!AppState.isSpeechEnabled || !text.trim()) return;
    
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel(); // Interrompi eventuale parlato in corso
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = AppState.language === 'it' ? 'it-IT' : 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Seleziona voce
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.lang.startsWith(AppState.language === 'it' ? 'it' : 'en')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // Eventi
        utterance.onstart = () => {
            document.body.classList.add('speaking');
            showNotification(Translations[AppState.language].notificationSpeaking, 'info');
        };
        
        utterance.onend = () => {
            document.body.classList.remove('speaking');
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            document.body.classList.remove('speaking');
        };
        
        speechSynthesis.speak(utterance);
        
    } else {
        showNotification('Sintesi vocale non supportata', 'warning');
    }
}

// Esporta trascrittore
function exportTranscript(format = 'txt') {
    if (!AppState.transcript.trim()) {
        showNotification('Nessun testo da esportare', 'warning');
        return;
    }
    
    let content, mimeType, filename;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch(format) {
        case 'txt':
            content = AppState.transcript;
            mimeType = 'text/plain';
            filename = `lettura-${timestamp}.txt`;
            break;
            
        case 'json':
            const data = {
                transcript: AppState.transcript,
                metadata: {
                    wordCount: AppState.wordCount,
                    characterCount: AppState.characterCount,
                    sentences: AppState.sentences.length,
                    createdAt: new Date().toISOString(),
                    confidence: AppState.confidenceHistory.length > 0 ?
                        AppState.confidenceHistory.reduce((sum, item) => sum + item.confidence, 0) / AppState.confidenceHistory.length : 0
                }
            };
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            filename = `lettura-${timestamp}.json`;
            break;
            
        default:
            showNotification('Formato non supportato', 'error');
            return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(Translations[AppState.language].notificationExported, 'success');
}

// Analisi AI avanzata
function analyzeWithAI(type) {
    if (!AppState.transcript.trim()) {
        showNotification('Nessun testo da analizzare', 'warning');
        return;
    }
    
    if (!AppState.apiConfig || !AppState.apiConfig.apiKey) {
        showNotification('Configura prima l\'API Key', 'error');
        return;
    }
    
    askQuestion(type);
}

// Gestione scroll trascrittore
function handleTranscriptScroll(event) {
    const container = event.target;
    const scrollRemaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    // Mostra/nascondi indicatore scroll
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        indicator.style.opacity = scrollRemaining > 100 ? '1' : '0';
    }
}

// Gestione click trascrittore
function handleTranscriptClick(event) {
    if (event.target.classList.contains('text-item')) {
        // Evidenzia elemento cliccato
        document.querySelectorAll('.text-item').forEach(item => {
            item.classList.remove('selected');
        });
        event.target.classList.add('selected');
        
        // Copia automaticamente testo selezionato
        const text = event.target.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Frase copiata', 'info');
        });
    }
}

// Demo
function startDemo() {
    if (AppState.isListening) return;
    
    showNotification('Demo iniziata. Leggi qualcosa!', 'info');
    
    // Testo demo se non c'è microfono
    if (!SpeechManager.recognition) {
        setTimeout(() => {
            const demoText = "Questo è un testo di esempio per dimostrare le funzionalità dell'assistente di lettura intelligente. Il sistema converte la voce in testo e permette di interagire con l'intelligenza artificiale per ottenere riassunti, spiegazioni e analisi.";
            AppState.transcript = demoText;
            AppState.wordCount = demoText.split(/\s+/).length;
            updateTranscript();
            updateUI();
            enableChatFeatures();
            showNotification('Demo completata! Prova a fare domande sul testo.', 'success');
        }, 1000);
    } else {
        startListening();
    }
}

// Salva nel notebook
function saveToNotebook() {
    if (!AppState.transcript.trim()) {
        showNotification('Nessun testo da salvare', 'warning');
        return;
    }
    
    // Se non c'è un notebook corrente, chiedi di crearne uno
    if (!AppState.currentNotebook) {
        const name = prompt('Nome del nuovo quaderno:');
        if (!name) return;
        
        const notebook = NotebookManager.createNotebook(name, 'Quaderno creato automaticamente');
        NotebookManager.setCurrentNotebook(notebook.id);
        AppState.currentNotebook = notebook;
    }
    
    const title = prompt('Titolo per questa lettura:', `Lettura ${new Date().toLocaleDateString()}`);
    if (!title) return;
    
    const success = NotebookManager.addEntry(
        AppState.currentNotebook.id,
        title,
        AppState.transcript
    );
    
    if (success) {
        showNotification('Lettura salvata nel quaderno!', 'success');
        loadNotebooks();
    } else {
        showNotification('Errore nel salvataggio', 'error');
    }
}

// Inizializza al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    initializeApplication();
    
    // Aggiungi stili per animazioni
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .floating {
            animation: float 3s ease-in-out infinite;
        }
        .pulse {
            animation: pulse 2s infinite;
        }
        .text-item {
            transition: all 0.3s ease;
        }
        .text-item.selected {
            background: rgba(99, 102, 241, 0.2);
            border-left: 4px solid var(--primary);
        }
        .btn-copy.copied {
            background: var(--success) !important;
        }
        .speaking .voice-visualizer .bar {
            animation: pulse 0.5s infinite;
        }
        .interim-text {
            color: var(--text-secondary);
            font-style: italic;
            opacity: 0.7;
        }
        .text-timestamp {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--text-secondary);
        }
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        .empty-state h4 {
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        .empty-state p {
            margin-bottom: 0.5rem;
        }
        .empty-state small {
            font-size: 0.875rem;
            opacity: 0.7;
        }
    `;
    document.head.appendChild(style);
});