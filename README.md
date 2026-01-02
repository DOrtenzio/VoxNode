## VoxNode - Your Open-Source Voice AI Agent

**Project Status:** In_Development | **License:** MIT | **Version:** 0.1

### 🚀 Overview

**VoxNode Pro** is an advanced open-source Voice AI Agent designed for rapid prototyping and deployment of intelligent voice assistants. It integrates state-of-the-art Speech-to-Text (STT), Retrieval-Augmented Generation (RAG) with leading Large Language Models (LLMs), and high-quality Text-to-Speech (TTS) into a seamless, real-time conversational experience.

Unlike traditional chatbots, VoxNode Pro emphasizes **extensibility, modularity, and customization**, allowing developers to easily swap LLM backends, integrate custom knowledge bases, and implement powerful Function Calling for real-world applications.

**Key Features:**

* **Plug-and-Play LLM Selection:** Effortlessly switch between optimized Phi-3 Mini and Llama-3.1 8B Instruct.
* **Real-time Interaction:** Streamed LLM responses and instant TTS for minimal perceived latency.
* **Custom Knowledge Base (RAG):** Upload PDF/TXT documents to ground the LLM's responses, making it an expert on *your* data.
* **Modular Architecture:** Designed for easy extension and integration of custom tools/APIs.
* **Gradio UI:** Intuitive web interface for easy interaction and development.

### ✨ Demos

#### **1. Basic Conversation**

A glimpse into VoxNode Pro's responsive conversational capabilities.

<an image is coming here>

#### **2. RAG in Action: Custom Knowledge**

See how VoxNode Pro leverages uploaded documents to provide accurate, context-aware answers.

<an image is coming here>

#### **3. Function Calling (Simulated): Agent in Action**

Future integration will show real-time logs of API calls and actions taken by the AI.

<an image is coming here>

### 🌳 Repo's Structure

```text
voxnode-pro/
├── .github/             # Automation Workflow (CI/CD)
├── assets/              # Images and demos for the README
├── data/                # Folder where the user will upload the PDFs for the RAG
├── src/                 # Modular source code
│ ├── __init__.py
│ ├── engine.py          # LLM (Llama/Phi) and Quantization Management
│ ├── rag.py             # FAISS Logic and Embeddings
│ ├── tts_stt.py         # Whisper and KittenTTS Integration
│ └── actions.py         # API Logic (Calendar, Orders)
├── app.py               # Entry point (Gradio Interface)
├── requirements.txt     # Python dependencies
├── Dockerfile           # To run everything in a container
├── .env.example         # Template for your API keys (Google, etc.)
└── README.md            # The project showcase

```

### 🛠 Customization & Extensibility

VoxNode Pro is built to be a framework. You can extend it in three ways:

**A. Adding New Tools (Function Calling)**
To add a new action (e.g., sending an email), simply register a function in `src/actions.py`:

```python
def send_email(recipient, body):
    # Your SMTP logic here
    return f"Email sent to {recipient}"

# The Agent will trigger this if 'email' is detected in the intent.

```

**B. Swapping LLM Backends**
Modify `src/engine.py` to support local providers like **Ollama** or cloud APIs like **Groq** for sub-100ms response times.

**C. Custom Vector Stores**
By default, we use **FAISS** for local speed. If you have millions of documents, you can switch to **Pinecone** or **Milvus** by updating `src/rag.py`.
