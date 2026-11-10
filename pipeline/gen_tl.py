# usage: python3 gen_tl.py <story.json>   -> <dir>/tl.json, <dir>/times.json
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tts3
S = json.load(open(sys.argv[1])); D = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), S["name"]); os.makedirs(D, exist_ok=True)
import re, wave, numpy as np
def say_phrases(sub, fn, i):
    # one TTS call per phrase so caption timing is exact; trim silence and join with short pauses
    parts = [p.strip() for p in re.findall(r"[^,.?!]+[,.?!]?", sub) if p.strip()]
    out, phr, t, sr = [], [], 0.0, 44100
    for k, p in enumerate(parts):
        tmp = f"{D}/_p{i}_{k}.wav"; tts3.say(p, tmp, 6)
        w = wave.open(tmp); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32); os.remove(tmp)
        hop = sr // 100; e = np.array([np.abs(a[j * hop:(j + 1) * hop]).mean() for j in range(len(a) // hop)])
        v = np.where(e > e.max() * .012)[0]; a0 = max(0, (v[0] - 6) * hop); a1 = min(len(a), (v[-1] + 18) * hop); a = a[a0:a1].copy()
        f = int(.012 * sr); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)   # soft edges, no clicks
        phr.append([p, round(t, 3), round(len(a) / sr, 3)]); out.append(a); t += len(a) / sr
        if k < len(parts) - 1:
            g = .14 if p[-1] == ',' else .24; out.append(np.zeros(int(g * sr), np.float32)); t += g
    a = np.concatenate(out)
    with wave.open(fn, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(a.astype(np.int16).tobytes())
    return len(a) / sr, phr
t = 0.3; segs = []
for i, row in enumerate(S["segs"]):
    shot, sub = row[0], row[1]; spk = row[2] if len(row) > 2 and row[2] else None; gap = row[3] if len(row) > 3 else 0.18
    fn = f"{D}/n{i}.wav"
    if spk: d = tts3.say(spk, fn, 6); phr = None
    else: d, phr = say_phrases(sub, fn, i)
    segs.append(dict(shot=shot, sub=sub, wav=fn, start=round(t, 3), dur=round(d, 3), phr=phr)); t += d + gap
json.dump(dict(segs=segs, dur=round(t + 1.0, 2), turn=S["turn"], reveal=S["reveal"], keys=S["keys"], title=S["title"]), open(f"{D}/tl.json", "w"), ensure_ascii=False, indent=1)
sh = []
for s in segs:
    if not sh or sh[-1]["name"] != s["shot"]: sh.append(dict(name=s["shot"], t=s["start"] if sh else 0))
json.dump({"shots": sh}, open(f"{D}/times.json", "w"))
print(S["name"], round(t + 1.0, 1), [(x["name"], round(x["t"], 1)) for x in sh])
