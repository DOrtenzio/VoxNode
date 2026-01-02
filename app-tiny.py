import torch
import whisper
import gradio as gr
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TextIteratorStreamer
from threading import Thread
from src.tts_stt import VoiceProcessor
from src.rag import DocumentRetriever
try:
    from optimum.bettertransformer import BetterTransformer
except ImportError:
    print("Optimum non trovato. Esegui: pip install optimum")

device = "cuda"
model_id = "microsoft/Phi-3-mini-4k-instruct"

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    trust_remote_code=True,
    torch_dtype=torch.float16,
    attn_implementation="flash_attention_2", 
    quantization_config=BitsAndBytesConfig(load_in_4bit=True)
)

try:
    model = BetterTransformer.transform(model)
    print("🚀 BetterTransformer attivato!")
except:
    print("BetterTransformer non supportato, procedo con Flash Attention.")

tokenizer = AutoTokenizer.from_pretrained(model_id)
stt_tiny = whisper.load_model("tiny", device=device)
voice = VoiceProcessor(device=device)
rag = DocumentRetriever()

def tiny_process(audio):
    text = stt_tiny.transcribe(audio, language='it')["text"]
    context = rag.search(text)
    
    prompt = f"<|system|>Usa: {context}\nRispondi breve.<|end|><|user|>{text}<|end|><|assistant|>"
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    
    Thread(target=model.generate, kwargs=dict(inputs, streamer=streamer, max_new_tokens=100)).start()
    
    full_res = ""
    for part in streamer:
        full_res += part
        yield text, full_res, None
        
    audio_path = voice.synthesize(full_res)
    yield text, full_res, audio_path

with gr.Blocks(theme=gr.themes.Monochrome()) as demo:
    gr.Markdown("# 🧊 VoxNode Tiny-Optimized (Local GPU)")
    audio_in = gr.Audio(sources="microphone", type="filepath")
    with gr.Row():
        txt_out = gr.Textbox(label="AI Output")
        aud_out = gr.Audio(autoplay=True)
    
    audio_in.stop_recording(tiny_process, audio_in, [gr.State(), txt_out, aud_out])

demo.launch(debug=True)