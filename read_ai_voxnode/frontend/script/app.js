const AppState = {
    language: 'it',       // Lingua corrente (it/en)
    isListening: false,
    isPaused: false,
    transcript: '',       // Tutto il testo accumulato
    wordCount: 0,
    apiConfig: null       // Configurazione Groq
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 VoiceReader App Inizializzata");
    
    // Recupera API Key salvata
    const savedKey = localStorage.getItem('groq_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        connectAPI(true); // Connessione silenziosa
    }

    // Imposta lingua di default
    setLanguage('it');
    
    // Setup Visualizer (animazione barre)
    setupVisualizer();
});

// ==========================================
// GESTIONE LINGUA (FIX CRITICO)
// ==========================================
function setLanguage(lang) {
    AppState.language = lang;
    
    // 1. Aggiorna UI Bottoni
    document.getElementById('langIt').classList.toggle('active', lang === 'it');
    document.getElementById('langEn').classList.toggle('active', lang === 'en');
    
    // 2. Notifica il backend tramite VoxNodeIntegration (se necessario per riavvio stream)
    // Nota: Il backend riceve la lingua ad ogni chunk audio, quindi basta aggiornare AppState.
    console.log(`🌍 Lingua impostata su: ${lang.toUpperCase()}`);
    
    // Reset parziale UI se necessario
    const statusText = document.getElementById('statusText');
    if (!AppState.isListening) {
        statusText.innerText = lang === 'it' ? 'Pronto' : 'Ready';
    }
}

// ==========================================
// COMANDI VOCALI (Play/Pause/Stop)
// ==========================================
async function startListening() {
    if (AppState.isListening && !AppState.isPaused) return;

    try {
        updateStatus('listening');
        toggleButtons(true);

        if (AppState.isPaused) {
            VoxNodeIntegration.resume(); // Metodo aggiunto in integration
            AppState.isPaused = false;
        } else {
            // Avvia nuova sessione
            await VoxNodeIntegration.startRealtimeTranscription(
                (text) => handleTranscript(text), // Callback successo
                (err) => handleError(err)         // Callback errore
            );
            AppState.isListening = true;
            document.getElementById('voiceVisualizer').classList.add('speaking');
        }
    } catch (err) {
        handleError("Impossibile accedere al microfono: " + err);
    }
}

function pauseListening() {
    if (!AppState.isListening) return;
    VoxNodeIntegration.pause();
    AppState.isPaused = true;
    updateStatus('paused');
    document.getElementById('voiceVisualizer').classList.remove('speaking');
    
    // Aggiorna bottoni
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

function stopListening() {
    VoxNodeIntegration.stop();
    AppState.isListening = false;
    AppState.isPaused = false;
    updateStatus('ready');
    toggleButtons(false);
    document.getElementById('voiceVisualizer').classList.remove('speaking');
}

// ==========================================
// GESTIONE TRASCRIZIONE
// ==========================================
function handleTranscript(newText) {
    if (!newText || !newText.trim()) return;

    const container = document.getElementById('transcriptText');
    
    // Rimuovi messaggio di benvenuto se è il primo testo
    if (AppState.transcript === '') {
        container.innerHTML = '';
    }

    AppState.transcript += " " + newText.trim();
    
    // Aggiungi testo all'HTML con animazione
    const span = document.createElement('span');
    span.innerText = newText + " ";
    span.style.animation = "fadeIn 0.5s ease"; // Assicurati di avere @keyframes fadeIn nel CSS
    container.appendChild(span);

    // Scroll automatico
    const wrapper = document.getElementById('transcriptContainer');
    wrapper.scrollTop = wrapper.scrollHeight;

    // Aggiorna contatori
    AppState.wordCount = AppState.transcript.trim().split(/\s+/).length;
    document.getElementById('wordCount').innerText = `${AppState.wordCount} parole`;

    // Abilita funzioni IA se c'è testo
    if (AppState.wordCount > 10 && AppState.apiConfig) {
        enableAiFeatures(true);
    }
}

// ==========================================
// GESTIONE INTELLIGENZA ARTIFICIALE
// ==========================================
function connectAPI(silent = false) {
    const key = document.getElementById('apiKey').value.trim();
    if (!key) {
        if(!silent) alert("Per favore inserisci una API Key valida.");
        return;
    }
    
    AppState.apiConfig = { apiKey: key };
    localStorage.setItem('groq_api_key', key);
    
    if(!silent) {
        alert("Chiave salvata! Ora puoi usare l'assistente IA.");
        document.getElementById('apiConfigPanel').style.display = 'none'; // Nascondi pannello per pulizia
    }
    
    if (AppState.transcript.length > 0) enableAiFeatures(true);
}

async function askQuestion(queryText = null) {
    const input = document.getElementById('chatInput');
    const question = queryText || input.value.trim();

    if (!question) return;
    if (!AppState.apiConfig) return alert("Inserisci prima la API Key di Groq.");

    // Mostra messaggio utente
    appendChatMessage('user', question);
    input.value = '';

    // Mostra indicatore caricamento
    const loadingId = appendChatMessage('ai', '...', true);

    try {
        // COSTRUZIONE DEL CONTESTO (FIX "Non capisce nulla")
        // Inviamo all'IA tutto il testo letto finora
        const context = AppState.transcript;
        
        const response = await VoxNodeIntegration.generateAiResponse(question, context, AppState.apiConfig.apiKey);
        
        // Rimuovi loading e metti risposta vera
        document.getElementById(loadingId).remove();
        appendChatMessage('ai', response);

    } catch (e) {
        document.getElementById(loadingId).innerHTML = '<span class="text-danger">Errore di connessione IA.</span>';
        console.error(e);
    }
}

function sendMessage() {
    askQuestion();
}

// ==========================================
// UTILITY UI
// ==========================================
function updateStatus(state) {
    const el = document.getElementById('statusText');
    const dot = document.getElementById('statusDot');
    
    switch(state) {
        case 'listening':
            el.innerText = AppState.language === 'it' ? 'In Ascolto...' : 'Listening...';
            dot.className = 'status-dot bg-danger pulse';
            break;
        case 'paused':
            el.innerText = 'In Pausa';
            dot.className = 'status-dot bg-warning';
            break;
        case 'ready':
            el.innerText = 'Pronto';
            dot.className = 'status-dot bg-success';
            break;
    }
}

function toggleButtons(isRecording) {
    document.getElementById('startBtn').disabled = isRecording;
    document.getElementById('pauseBtn').disabled = !isRecording;
    document.getElementById('stopBtn').disabled = !isRecording;
}

function enableAiFeatures(enabled) {
    document.getElementById('chatInput').disabled = !enabled;
    document.getElementById('sendBtn').disabled = !enabled;
    document.getElementById('btnSummary').disabled = !enabled;
    document.getElementById('btnConcepts').disabled = !enabled;
}

function appendChatMessage(role, text, isLoading = false) {
    const container = document.getElementById('chatContainer');
    const div = document.createElement('div');
    const id = 'msg_' + Date.now();
    div.id = id;
    
    div.className = `d-flex mb-3 ${role === 'user' ? 'justify-content-end' : 'justify-content-start'}`;
    
    const contentClass = role === 'user' ? 'bg-primary text-white' : 'bg-light text-dark border';
    
    div.innerHTML = `
        <div class="p-2 rounded shadow-sm" style="max-width: 80%; ${contentClass}">
            <small class="d-block opacity-75 mb-1" style="font-size: 0.7rem;">${role.toUpperCase()}</small>
            <div>${text}</div>
        </div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id; // Ritorna ID per poterlo rimuovere se è un loading message
}

function clearTranscript() {
    if(confirm("Cancellare tutto il testo?")) {
        AppState.transcript = '';
        AppState.wordCount = 0;
        document.getElementById('transcriptText').innerHTML = '';
        document.getElementById('wordCount').innerText = '0 parole';
        document.getElementById('chatContainer').innerHTML = ''; // Resetta anche la chat perché il contesto è perso
    }
}

function copyTranscript() {
    navigator.clipboard.writeText(AppState.transcript);
    alert("Testo copiato!");
}

function handleError(msg) {
    console.error(msg);
    alert("Errore: " + msg);
    stopListening();
}

function setupVisualizer() {
    // Animazione semplice randomica
    setInterval(() => {
        if(AppState.isListening && !AppState.isPaused) {
            document.querySelectorAll('.bar').forEach(bar => {
                bar.style.height = Math.floor(Math.random() * 30 + 10) + 'px';
            });
        }
    }, 100);
}