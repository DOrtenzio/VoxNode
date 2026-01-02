import whisper
import torch
from kittentts import KittenTTS
import soundfile as sf

class VoiceProcessor:
    def __init__(self, device="cuda"):
        self.device = device
        self.stt_model = whisper.load_model("base", device=self.device)
        self.tts_model = KittenTTS("KittenML/kitten-tts-nano-0.2")

    def transcribe(self, audio_path):
        """Convert audio to text"""
        if not audio_path: return ""
        result = self.stt_model.transcribe(audio_path, language='it')
        return result["text"]

    def synthesize(self, text, output_path="res.wav"):
        """Convert text to audio"""
        wav = self.tts_model.generate(text, voice='expr-voice-2-f')
        sf.write(output_path, wav, 24000)
        return output_path