import torch
import whisper
import gradio as gr
import soundfile as sf
from threading import Thread
from kittentts import KittenTTS
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer, BitsAndBytesConfig
from src.rag_engine import RagEngine
from src.actions import ActionManager

device = "cuda" if torch.cuda.is_available() else "cpu"
rag = RagEngine()
actions = ActionManager()
stt_model = whisper.load_model("base", device=device)
tts_model = KittenTTS("KittenML/kitten-tts-nano-0.2")

model, tokenizer, current_model_id = None, None, ""

def load_model(name):
    global model, tokenizer, current_model_id
    ids = {"Phi-3 Mini (Veloce)": "microsoft/Phi-3-mini-4k-instruct", 
           "Llama-3.1 8B (Intelligente)": "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"}
    new_id = ids[name]
    tokenizer = AutoTokenizer.from_pretrained(new_id)
    bnb_cfg = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.float16)
    model = AutoModelForCausalLM.from_pretrained(new_id, quantization_config=bnb_cfg, trust_remote_code=True)
    current_model_id = new_id
    return f"✅ {name} Loaded!"

def chat_step(audio):
    if not model: return "Error", "Load a model!", None, ""
    
    text = stt_model.transcribe(audio, language='it')["text"]
    
    context = rag.get_context(text)
    prompt = f"<|system|>Context: {context}\nAnswer briefly.<|end|><|user|>{text}<|end|><|assistant|>"
    
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    Thread(target=model.generate, kwargs=dict(inputs, streamer=streamer, max_new_tokens=150)).start()
    
    full_res = ""
    for part in streamer:
        full_res += part
        yield text, full_res, None, "\n".join(actions.logs)
    
    actions.execute_logic(full_res)
    wav = tts_model.generate(full_res, voice='expr-voice-2-f')
    sf.write("res.wav", wav, 24000)
    yield text, full_res, "res.wav", "\n".join(actions.logs)

with gr.Blocks(theme=gr.themes.Glass()) as demo:
    gr.Markdown("# 🤖 VoxNode Pro - Enterprise Voice Agent")
    with gr.Row():
        with gr.Column():
            m_sel = gr.Dropdown(["Phi-3 Mini (Fast)", "Llama-3.1 8B (Intelligent)"], label="AI Brain")
            gr.Button("Load Model").click(load_model, m_sel, gr.Textbox(label="Status"))
            f_in = gr.File(label="Company Documents (PDF)")
            gr.Button("Upload to RAG").click(rag.process_file, f_in, gr.Textbox(label="RAG Status"))
        with gr.Column():
            audio_in = gr.Audio(sources="microphone", type="filepath", label="Talk to agent")
            ans_out = gr.Textbox(label="AI Response")
            aud_out = gr.Audio(autoplay=True, label="Generated Audio")
            log_out = gr.Code(label="Action Logs (API calls)", language="text")
            audio_in.stop_recording(chat_step, audio_in, [gr.State(), ans_out, aud_out, log_out])

demo.launch(share=True)