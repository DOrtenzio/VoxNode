# require !pip install groq

import os
import gradio as gr
from groq import Groq
from src.tts_stt import VoiceProcessor
from src.rag import DocumentRetriever
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "INSERT_HERE_IF_NOT_USING_ENV")

client = Groq(api_key=GROQ_API_KEY)
voice = VoiceProcessor(device="cpu") 
rag = DocumentRetriever()

def groq_chat_process(audio, current_logs):
    if not audio: return "", "", None, current_logs
    
    text = voice.stt_model.transcribe(audio, language='en')["text"]
    context = rag.search(text)
    stream = client.chat.completions.create(
        model="llama-3.1-70b-versatile",
        messages=[
            {"role": "system", "content": f"You are an expert assistant. Use this context: {context}"},
            {"role": "user", "content": text}
        ],
        stream=True,
    )

    full_res = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            full_res += content
            yield text, full_res, None, current_logs

    audio_path = voice.synthesize(full_res)
    yield text, full_res, audio_path, current_logs

with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# ⚡ VoxNode (Groq Cloud)")
    with gr.Row():
        with gr.Column():
            f_in = gr.File(label="Upload Knowledge (PDF)")
            gr.Button("Index Document").click(rag.ingest, f_in, gr.Textbox(label="RAG Status"))
        with gr.Column():
            audio_in = gr.Audio(sources="microphone", type="filepath", label="Talk")
            ans_out = gr.Textbox(label="AI Response")
            aud_out = gr.Audio(autoplay=True)
            log_box = gr.Code(label="Action Logs", language="text")
            
            audio_in.stop_recording(groq_chat_process, [audio_in, log_box], [gr.State(), ans_out, aud_out, log_box])

demo.launch(share=True)