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

![basic conversation](assets/image-1.png)

#### **2. RAG in Action: Custom Knowledge**

See how VoxNode Pro leverages uploaded documents to provide accurate, context-aware answers.

<an image is coming here>

#### **3. Function Calling (Simulated): Agent in Action**

Future integration will show real-time logs of API calls and actions taken by the AI.

<an image is coming here>


### 📥 Installation & Setup

You can run **VoxNode Pro** locally or in a container. Follow these steps to get started:

#### **Prerequisites**

* Python 3.10+
* NVIDIA GPU with 8GB+ VRAM (for Llama-3.1) or 4GB+ (for Phi-3).
* [CUDA Toolkit](https://developer.nvidia.com/cuda-toolkit) installed.

#### **1. Clone the repository**

```bash
git clone https://github.com/your-username/voxnode-pro.git
cd voxnode-pro

```

#### **2. Install System Dependencies**

On Linux (Ubuntu/Debian):

```bash
sudo apt-get update && sudo apt-get install -y espeak-ng ffmpeg

```

#### **3. Install Python Packages**

We recommend using a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install https://github.com/KittenML/KittenTTS/releases/download/0.1/kittentts-0.1.0-py3-none-any.whl

```

#### **4. Environment Configuration**

```bash
cp .env.example .env
# Edit .env with your specific API keys if needed

```

---

### 🚀 Usage

#### **Running the Web UI**

Launch the interactive dashboard with:

```bash
python app.py

```

Once started, the terminal will provide a local URL (usually `http://127.0.0.1:7860`). Open it in your browser to:

1. **Select a Model**: Choose between Phi-3 (fast) or Llama-3.1 (smart).
2. **Upload Documents**: Drag and drop your PDFs into the RAG section.
3. **Talk**: Use your microphone to interact with your Agent in real-time.

#### **Running with Docker**

If you prefer a containerized environment:

```bash
docker build -t voxnode-pro .
docker run --gpus all -p 7860:7860 voxnode-pro

```

---

### 💡 Implementation Examples

#### **Example: Creating a specialized 'Sales Agent'**

You can bypass the UI and use the core modules to build a dedicated service:

```python
from src.engine import LLMEngine
from src.rag import DocumentRetriever
from src.tts_stt import VoiceProcessor

# Initialize components
engine = LLMEngine(model_id="unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit")
kb = DocumentRetriever()
voice = VoiceProcessor()

# Load sales catalog
kb.ingest("data/commercial_catalog.pdf")

# Process a voice lead
user_audio = "recordings/customer_query.wav"
query_text = voice.transcribe(user_audio)
context = kb.search(query_text)

response = engine.generate(query_text, context)
voice.synthesize(response, "responses/sales_pitch.wav")

```

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

### **📦 Available Editions**

| File | Target Hardware | Main Feature |
| --- | --- | --- |
| `app.py` | Local GPU (8GB+) | Standard balanced experience. |
| `tiny-app.py` | Google Colab / Low VRAM | **Flash Attention 2** & **BetterTransformer** optimizations. Uses Whisper-Tiny for instant STT. |
| `app-groq.py` | No GPU / Weak CPU | Sub-second response times using **Groq Cloud API**. Supports Llama-3.1 70B. |

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

### ⚡ Performance & Optimization

Running LLMs on consumer-grade or entry-level enterprise GPUs (like the **NVIDIA T4**) involves trade-offs. Here is how VoxNode Pro handles performance:

* **Quantization (4-bit NF4):** We use `bitsandbytes` to compress 8B models, reducing VRAM usage from ~16GB to ~5.5GB.
* **Token Streaming:** To reduce **Time To First Token (TTFT)**, text is streamed immediately to the UI, so the user starts reading while the AI is still "thinking".
* **STT Optimization:** Whisper is running on the `base` model for the best balance between speed and accuracy.

#### **Hardware Recommendations**

| GPU | LLM | Performance (Latency) |
| --- | --- | --- |
| **NVIDIA T4 (Colab)** | Phi-3 Mini | Moderate (~20-30 tokens/sec) |
| **NVIDIA T4 (Colab)** | Llama-3.1 8B | Slow (~8-12 tokens/sec) |
| **NVIDIA RTX 3090/4090** | Llama-3.1 8B | **Real-time** (>50 tokens/sec) |
| **Mac M2/M3 Max** | All | Fast (via MLX integration) |

### Future Roadmap


### 🗺️ Roadmap
- Integration with **Groq API** for sub-100ms latency. (Not Done)
- **Ollama** support for local-only deployment. (Not Done)
- Multi-document RAG with **ChromaDB**. (Not Done)
-  Real-time Voice Activity Detection (VAD) to eliminate the "Stop Recording" button. (Not Done)