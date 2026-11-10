import sherpa_onnx as S, numpy as np, wave, sys, os
M=os.path.join(os.path.dirname(os.path.abspath(__file__)),"models","sherpa-onnx-supertonic-3-tts-int8-2026-05-11")+"/"
mc=S.OfflineTtsModelConfig(); mc.num_threads=4
mc.supertonic=S.OfflineTtsSupertonicModelConfig(M+"duration_predictor.int8.onnx",M+"text_encoder.int8.onnx",M+"vector_estimator.int8.onnx",M+"vocoder.int8.onnx",M+"tts.json",M+"unicode_indexer.bin",M+"voice.bin")
tts=S.OfflineTts(S.OfflineTtsConfig(model=mc))
SID=int(os.environ.get("SID","0"))
def say(text,out,sid=None):
    g=S.GenerationConfig(); g.sid=SID if sid is None else sid; g.speed=float(os.environ.get("TTS_SPEED","1.15")); g.num_steps=8; g.extra={"lang":"ko"}
    a=tts.generate(text,g); s=np.array(a.samples)
    with wave.open(out,'wb') as w: w.setnchannels(1);w.setsampwidth(2);w.setframerate(a.sample_rate);w.writeframes((np.clip(s,-1,1)*32767).astype(np.int16).tobytes())
    return len(s)/a.sample_rate
if __name__=="__main__":
    print(tts.num_speakers)
    for sid in range(tts.num_speakers): print(sid, say(sys.argv[1], f"sp{sid}.wav", sid))
