class NotebookManager {
    static NOTEBOOKS_KEY = 'reading_assistant_notebooks';
    static CURRENT_NOTEBOOK_KEY = 'current_notebook';
    
    static getNotebooks() {
        const notebooks = localStorage.getItem(this.NOTEBOOKS_KEY);
        return notebooks ? JSON.parse(notebooks) : [];
    }
    
    static saveNotebooks(notebooks) {
        localStorage.setItem(this.NOTEBOOKS_KEY, JSON.stringify(notebooks));
    }
    
    static createNotebook(name, description = '') {
        const notebooks = this.getNotebooks();
        const newNotebook = {
            id: Date.now().toString(),
            name: name,
            description: description,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            entries: [],
            totalWords: 0,
            totalEntries: 0
        };
        
        notebooks.push(newNotebook);
        this.saveNotebooks(notebooks);
        return newNotebook;
    }
    
    static addEntry(notebookId, title, content) {
        const notebooks = this.getNotebooks();
        const notebookIndex = notebooks.findIndex(n => n.id === notebookId);
        
        if (notebookIndex === -1) return false;
        
        const entry = {
            id: Date.now().toString(),
            title: title,
            content: content,
            date: new Date().toISOString(),
            wordCount: content.split(/\s+/).filter(w => w.length > 0).length
        };
        
        notebooks[notebookIndex].entries.push(entry);
        notebooks[notebookIndex].totalWords += entry.wordCount;
        notebooks[notebookIndex].totalEntries++;
        notebooks[notebookIndex].updated = new Date().toISOString();
        
        this.saveNotebooks(notebooks);
        return true;
    }
    
    static deleteNotebook(notebookId) {
        let notebooks = this.getNotebooks();
        notebooks = notebooks.filter(n => n.id !== notebookId);
        this.saveNotebooks(notebooks);
    }
    
    static getNotebook(notebookId) {
        const notebooks = this.getNotebooks();
        return notebooks.find(n => n.id === notebookId);
    }
    
    static setCurrentNotebook(notebookId) {
        localStorage.setItem(this.CURRENT_NOTEBOOK_KEY, notebookId);
    }
    
    static getCurrentNotebook() {
        const notebookId = localStorage.getItem(this.CURRENT_NOTEBOOK_KEY);
        return notebookId ? this.getNotebook(notebookId) : null;
    }
}

function loadNotebooks() {
    const notebooks = NotebookManager.getNotebooks();
    const container = document.getElementById('notebooksList');
    
    if (notebooks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open fa-2x text-muted mb-3"></i>
                <p class="text-muted">Nessun quaderno</p>
                <small>Crea il tuo primo quaderno per salvare le letture</small>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    notebooks.forEach(notebook => {
        html += `
            <a href="#" class="list-group-item list-group-item-action" 
                onclick="selectNotebook('${notebook.id}')">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${notebook.name}</h6>
                        <small class="text-muted">${notebook.description || 'Nessuna descrizione'}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">${notebook.entries.length}</span>
                </div>
                <small class="text-muted d-block mt-2">
                    <i class="fas fa-calendar me-1"></i>${new Date(notebook.created).toLocaleDateString()}
                </small>
            </a>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function createNewNotebook() {
    const name = prompt('Nome del nuovo quaderno:');
    if (!name) return;
    
    const description = prompt('Descrizione (opzionale):', '');
    const notebook = NotebookManager.createNotebook(name, description);
    
    NotebookManager.setCurrentNotebook(notebook.id);
    AppState.currentNotebook = notebook;
    
    loadNotebooks();
    showNotification(`Quaderno "${name}" creato!`);
}

function selectNotebook(notebookId) {
    const notebook = NotebookManager.getNotebook(notebookId);
    if (!notebook) return;
    
    NotebookManager.setCurrentNotebook(notebookId);
    AppState.currentNotebook = notebook;
    
    const modalHtml = `
        <div class="modal fade" id="notebookDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">${notebook.name}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted">${notebook.description || 'Nessuna descrizione'}</p>
                        <div class="d-flex justify-content-between mb-3">
                            <span class="badge bg-info">${notebook.entries.length} letture</span>
                            <span class="badge bg-success">${notebook.totalWords} parole totali</span>
                        </div>
                        <hr>
                        <h6>Letture salvate:</h6>
                        <div class="list-group mt-3">
                            ${notebook.entries.length > 0 ? 
                                notebook.entries.map(entry => `
                                    <div class="list-group-item">
                                        <h6 class="text-primary">${entry.title}</h6>
                                        <p class="small">${entry.content.substring(0, 150)}${entry.content.length > 150 ? '...' : ''}</p>
                                        <div class="d-flex justify-content-between">
                                            <small class="text-muted">
                                                <i class="fas fa-calendar me-1"></i>${new Date(entry.date).toLocaleString()}
                                            </small>
                                            <small class="text-muted">
                                                <i class="fas fa-font me-1"></i>${entry.wordCount} parole
                                            </small>
                                        </div>
                                    </div>
                                `).join('') : 
                                '<p class="text-muted text-center py-3">Nessuna lettura salvata</p>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    const modal = new bootstrap.Modal(document.getElementById('notebookDetailsModal'));
    modal.show();
    
    modalContainer.addEventListener('hidden.bs.modal', () => {
        modalContainer.remove();
    });
}

function saveToNotebook() {
    if (!AppState.transcript.trim()) {
        showError('Nessun testo da salvare');
        return;
    }
    
    if (!AppState.currentNotebook) {
        const create = confirm('Nessun quaderno selezionato. Creare un nuovo quaderno?');
        if (create) {
            createNewNotebook();
        }
        return;
    }
    
    const title = prompt('Titolo per questa lettura:', `Lettura ${new Date().toLocaleDateString()}`);
    if (!title) return;
    
    const success = NotebookManager.addEntry(
        AppState.currentNotebook.id,
        title,
        AppState.transcript
    );
    
    if (success) {
        showNotification('Lettura salvata nel quaderno!');
        loadNotebooks();
    } else {
        showError('Errore nel salvataggio');
    }
}

function showNotebookManager() {
    const modalHtml = `
        <div class="modal fade" id="notebookManagerModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Gestione Quaderni</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex justify-content-between mb-3">
                            <h6>I tuoi quaderni</h6>
                            <button class="btn btn-sm btn-success" onclick="createNewNotebook()">
                                <i class="fas fa-plus me-1"></i>Nuovo
                            </button>
                        </div>
                        <div id="notebookManagerList"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    const modal = new bootstrap.Modal(document.getElementById('notebookManagerModal'));
    modal.show();
    
    setTimeout(() => {
        const notebooks = NotebookManager.getNotebooks();
        const container = document.getElementById('notebookManagerList');
        
        if (notebooks.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-5">Nessun quaderno creato.</p>';
            return;
        }
        
        let html = '<div class="row row-cols-1 row-cols-md-2 g-3">';
        notebooks.forEach(notebook => {
            html += `
                <div class="col">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${notebook.name}</h5>
                            <p class="card-text text-muted small">${notebook.description || 'Nessuna descrizione'}</p>
                            <div class="d-flex justify-content-between mb-2">
                                <span class="badge bg-primary">${notebook.entries.length} letture</span>
                                <span class="badge bg-secondary">${notebook.totalWords} parole</span>
                            </div>
                            <div class="mt-3">
                                <button class="btn btn-sm btn-outline-primary" onclick="selectNotebook('${notebook.id}')">
                                    <i class="fas fa-eye me-1"></i>Apri
                                </button>
                                <button class="btn btn-sm btn-outline-danger ms-2" 
                                    onclick="deleteNotebook('${notebook.id}')">
                                    <i class="fas fa-trash me-1"></i>Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }, 100);
    
    modalContainer.addEventListener('hidden.bs.modal', () => {
        modalContainer.remove();
    });
}

function deleteNotebook(notebookId) {
    if (confirm('Eliminare questo quaderno? Tutte le letture verranno perse.')) {
        NotebookManager.deleteNotebook(notebookId);
        if (AppState.currentNotebook && AppState.currentNotebook.id === notebookId) {
            AppState.currentNotebook = null;
        }
        showNotification('Quaderno eliminato');
        loadNotebooks();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('notebookManagerModal'));
        if (modal) modal.hide();
    }
}