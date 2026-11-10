import json, os, subprocess, wave, re
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import sys
D = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(D, sys.argv[1]); FR = os.path.join(O, "frames")
tl = json.load(open(f"{O}/tl.json")); meta = json.load(open(f"{FR}/meta.json"))
VW, VH, FPS = 1080, 1920, 30
FB = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
fCap = ImageFont.truetype(FB, 112, index=1); fCal = ImageFont.truetype(FB, 40, index=1)
KEY = re.compile(tl["keys"])

# word-by-word chunks, aligned to the actual speech: find voiced regions and pauses in each clip
def speech_map(path):
    w = wave.open(path); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
    hop = int(sr * .01); n_ = len(a) // hop
    rms = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2)) for i in range(n_)])
    v = rms > max(.012, rms.max() * .06)
    idx = np.where(v)[0]
    if len(idx) == 0: return 0, len(a) / sr, []
    s0, s1 = idx[0] * .01, (idx[-1] + 1) * .01
    pauses, run = [], 0
    for i in range(idx[0], idx[-1] + 1):
        if not v[i]: run += 1
        else:
            if run * .01 >= .09: pauses.append(((i - run) * .01, i * .01))
            run = 0
    return s0, s1, pauses
chunks = []
for g in tl["segs"]:
    words = g["sub"].split(" "); groups, cur = [], ""
    for w in words:
        if cur and (len(cur) + len(w) > 7 or cur[-1] in ",.?"): groups.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    groups.append(cur)
    if g.get("phr"):
        for ptxt, pst, pdur in g["phr"]:
            gs, cur = [], ""
            for w in ptxt.split(" "):
                if cur and (len(cur) + len(w) > 7 or os.environ.get("ONEWORD") == "1"): gs.append(cur); cur = w
                else: cur = (cur + " " + w).strip()
            gs.append(cur); wts = [len(re.sub(r"[,.?!' ]", "", x)) + .6 for x in gs]; t_ = pst
            for x, wt in zip(gs, wts):
                d = pdur * wt / sum(wts); chunks.append([g["start"] + t_ - .04, g["start"] + t_ + d, x.rstrip(",.")]); t_ += d
        chunks[-1][1] += .25
        continue
    s0, s1, pauses = speech_map(g["wav"])
    # phrases end at punctuation; match phrase breaks to the longest pauses (kept in time order)
    phr = [[]]
    for x in groups:
        phr[-1].append(x)
        if x[-1] in ",.?" and x is not groups[-1]: phr.append([])
    phr = [p_ for p_ in phr if p_]
    need = len(phr) - 1
    if need and len(pauses) >= need:
        cut = sorted(sorted(pauses, key=lambda p_: p_[0] - p_[1])[:need])
        spans = [(s0, cut[0][0])] + [(cut[i][1], cut[i + 1][0]) for i in range(need - 1)] + [(cut[-1][1], s1)]
    else:
        tot = sum(len(''.join(p_)) for p_ in phr); spans, t_ = [], s0
        for p_ in phr: d = (s1 - s0) * len(''.join(p_)) / tot; spans.append((t_, t_ + d)); t_ += d
    for p_, (a_, b_) in zip(phr, spans):
        wts = [len(re.sub(r"[,.?!' ]", "", x)) + .6 for x in p_]; t_ = a_
        for x, wt in zip(p_, wts):
            d = (b_ - a_) * wt / sum(wts); chunks.append([g["start"] + t_ - .05, g["start"] + t_ + d, x.rstrip(",.")]); t_ += d
    chunks[-1][1] += .25
# hold each caption until the next one starts (no flicker in short gaps)
for i in range(len(chunks) - 1):
    if 0 < chunks[i + 1][0] - chunks[i][1] < .35: chunks[i][1] = chunks[i + 1][0]
chunks = [tuple(c) for c in chunks]

def caption(im, t):
    cur = [c for c in chunks if c[0] <= t < c[1]]
    if not cur: return
    s, e, txt = cur[0]; pop = min(1, (t - s) / .08)
    col = (255, 214, 64) if KEY.search(txt) else (255, 255, 255)
    FB_ = FB
    if os.environ.get('NOVEL') == '1': FB_ = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc"; col = (244, 200, 120) if KEY.search(txt) else (250, 242, 222)
    f = ImageFont.truetype(FB_, int(112 * (0.86 + 0.14 * pop)), index=1)
    d = ImageDraw.Draw(im)
    w = f.getlength(txt)
    if w > VW - 80: f = ImageFont.truetype(FB_, int(112 * (VW - 80) / w), index=1)
    R = tl["reveal"]; y = 1560 if (tl["segs"][R]["start"] - .2 <= t < (tl["segs"][R+1]["start"] if R + 1 < len(tl["segs"]) else 1e9)) and meta_low(t) else 1180
    d.text((VW / 2 + 6, y + 8), txt, font=f, fill=(0, 0, 0), anchor="mm", stroke_width=12, stroke_fill=(0, 0, 0))
    d.text((VW / 2, y), txt, font=f, fill=col, anchor="mm", stroke_width=10, stroke_fill=(0, 0, 0))

DAYS = ["일", "월", "화", "수", "목", "금", "토"]
def calendar(im, idx):
    d = ImageDraw.Draw(im); x0, y0, bw = 120, 230, 120
    d.rounded_rectangle([x0 - 20, y0 - 20, x0 + 7 * bw + 0, y0 + 150], radius=26, fill=(10, 12, 28, 200))
    for i, dn in enumerate(DAYS):
        x = x0 + i * bw; on = i == idx
        fill = (255, 205, 70) if i == 0 else (40, 50, 90)
        if on: d.rounded_rectangle([x - 6, y0 - 6, x + 100 + 6, y0 + 126], radius=22, outline=(255, 255, 255), width=6)
        d.rounded_rectangle([x, y0, x + 100, y0 + 120], radius=18, fill=fill)
        d.text((x + 50, y0 + 30), dn, font=fCal, fill=(30, 25, 10) if i == 0 else (220, 225, 255), anchor="mm")
        if i == 0:
            d.ellipse([x + 32, y0 + 62, x + 68, y0 + 98], fill=(255, 120, 30))
        else:
            d.ellipse([x + 34, y0 + 62, x + 66, y0 + 94], fill=(235, 235, 210)); d.ellipse([x + 44, y0 + 56, x + 76, y0 + 88], fill=(40, 50, 90))

def meta_low(t):
    m = meta[min(len(meta) - 1, int(t * FPS))]; return m.get("lowcap", True)
fHud = ImageFont.truetype(FB, 64, index=1)
def hud(ov, lines):
    d = ImageDraw.Draw(ov); h = 90 * len(lines) + 30
    d.rounded_rectangle([140, 200, VW - 140, 200 + h], radius=30, fill=(10, 12, 28, 200))
    for k, (txt, col) in enumerate(lines): d.text((VW / 2, 200 + 60 + 90 * k), txt, font=fHud, fill=tuple(col), anchor="mm")
NOVEL = os.environ.get('NOVEL') == '1'
if NOVEL:
    FS = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
    src = json.load(open(f"{O}.json")); CHAP = src.get("chapter", "")
    fTitle = ImageFont.truetype(FS, 46, index=1); fSmall = ImageFont.truetype(FS, 34, index=1)
    yy, xx = np.mgrid[0:VH, 0:VW]; rr = np.sqrt(((xx - VW / 2) / (VW * .62)) ** 2 + ((yy - VH / 2) / (VH * .62)) ** 2)
    VIG = (np.clip(1.15 - rr * .55, .45, 1)[..., None] * np.array([1.0, .95, .84])).astype(np.float32)
def novel(im, t):
    a = (np.asarray(im.convert("RGB")).astype(np.float32) * VIG).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(a).convert("RGBA"); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, VW, 190], fill=(0, 0, 0, 255)); d.rectangle([0, VH - 190, VW, VH], fill=(0, 0, 0, 255))
    d.text((VW / 2, 110), CHAP, font=fTitle, fill=(236, 222, 190), anchor="mm")
    d.line([VW / 2 - 60, 160, VW / 2 + 60, 160], fill=(150, 130, 100), width=2)
    pg = int(t / 4) + 1; d.text((VW / 2, VH - 100), f"— {pg} —", font=fSmall, fill=(150, 135, 110), anchor="mm")
    return im
def frame(i):
    m = meta[i]; t = m["t"]
    im = Image.open(f"{FR}/f{i:04d}.png").convert("RGB").resize((VW, VH), Image.LANCZOS).convert("RGBA")
    ov = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    if "week" in m: calendar(ov, m["week"])
    if m.get("hud"): hud(ov, m["hud"])
    im.alpha_composite(ov)
    # quick flash on the reveal
    rv = tl["segs"][tl["reveal"]]["start"]
    if 0 <= t - rv < .25: im = Image.blend(im, Image.new("RGBA", (VW, VH), (255, 255, 255, 255)), .6 * (1 - (t - rv) / .25))
    if NOVEL: im = novel(im, t)
    caption(im, t)
    return im.convert("RGB")

n = len(meta); tmp = f"{O}/video.tmp.mp4"
p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{VW}x{VH}", "-r", str(FPS), "-i", "-",
                      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
for i in range(n): p.stdin.write(frame(i).tobytes())
p.stdin.close(); assert p.wait() == 0; os.replace(tmp, f"{O}/video.mp4")
for k, g_ in enumerate(tl["segs"]): frame(min(n - 1, int((g_["start"] + g_["dur"] * .6) * FPS))).save(f"{O}/chk{k}.jpg", quality=80)

# ---------- audio ----------
SR = 44100; N = int(n / FPS * SR); mix = np.zeros(N); rng = np.random.default_rng(3)
tt = lambda d: np.arange(int(d * SR)) / SR
hz = lambda m_: 440 * 2 ** ((m_ - 69) / 12)
def add(t0, x):
    a = int(t0 * SR); b = min(N, a + len(x))
    if a < N: mix[a:b] += x[:b - a]
def lp(x, k): return np.convolve(x, np.ones(k) / k, mode="same")
shots = []
for g_ in tl["segs"]:
    if not shots or shots[-1][0] != g_["shot"]: shots.append((g_["shot"], g_["start"]))
def pad(t0, d, notes, v):
    t = tt(d); env = np.minimum(1, t / .8) * np.minimum(1, (d - t) / .8)
    add(t0, v * env * sum(np.sin(2 * np.pi * hz(m_) * t) + .4 * np.sin(2 * np.pi * hz(m_) * 2.003 * t) for m_ in notes))
turn = tl["segs"][tl["turn"]]["start"] - .4; rv = tl["segs"][tl["reveal"]]["start"]
MUSIC = os.environ.get('NOMUSIC') != '1' or os.path.exists(os.path.join(D, 'force_music'))
SCARY = os.environ.get('SCARY') == '1'
if SCARY:
    MUSIC = False
    def box(t0, m_, v=.05, det=0.0):   # music-box plink, slightly out of tune
        x = tt(1.2); f = hz(m_) * (1 + det)
        add(t0, v * (np.sin(2 * np.pi * f * x) + .3 * np.sin(2 * np.pi * f * 3.01 * x)) * np.exp(-x / .35))
    mel = [69, 72, 76, 74, 72, 71, 72, 69, 64, 68, 71, 69]
    i = 0; t0 = 0.3
    while t0 < n / FPS - 1.5:
        late = t0 > turn
        box(t0, mel[i % len(mel)] + (-12 if late and i % 4 == 3 else 0), .045 if not late else .035, det=(.03 * np.sin(i) if late else 0))
        t0 += .42 if not late else .55; i += 1
    def drone(t0, d, notes, v):
        t = tt(d); env = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 1.0)
        add(t0, v * env * sum(np.sin(2 * np.pi * hz(m_) * t + .3 * np.sin(2 * np.pi * .2 * t)) for m_ in notes))
    drone(0, turn + .5, [45, 52], .03)
    drone(turn, n / FPS - turn, [40, 41, 47], .045)          # dissonant low cluster
    x = tt(rv - turn); add(turn, .012 * np.sin(2 * np.pi * hz(88) * x) * (0.5 + .5 * np.sin(2 * np.pi * 7 * x)) * np.minimum(1, x / 2))  # thin tremolo
    t0 = turn + 1
    while t0 < rv - .3:
        for dd in (0, .18):
            x = tt(.12); add(t0 + dd, .16 * np.sin(2 * np.pi * 50 * x) * np.exp(-x / .05))
        t0 += max(.45, .9 - (t0 - turn) * .04)
    x = tt(1.4); os.environ.get('NOSFX') == '1' or add(rv, .06 * np.sin(2 * np.pi * (1400 - 700 * x) * x) * np.exp(-x / .5))   # sting on the reveal
if os.environ.get('HUM') == '1':   # fluorescent buzz that dies at the reveal
    x = tt(rv); add(0, (.018 * np.sin(2 * np.pi * 120 * x) + .008 * np.sign(np.sin(2 * np.pi * 240 * x))) * np.minimum(1, x / .3))
k = 0
while MUSIC and k * 4 < turn:
    pad(k * 4.0, min(4.6, turn - k * 4 + .8), [[60, 64, 67], [65, 69, 72], [67, 71, 74], [57, 60, 64]][k % 4], .022); k += 1
k = 0
while MUSIC and turn + k * 4 < n / FPS:
    pad(turn + k * 4, max(1.7, min(4.6, n / FPS - turn - k * 4 + .2)), [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]][k % 4], .02); k += 1
t0 = turn + 4
while MUSIC and t0 < rv - .3:
    x = tt(.12); add(t0, .1 * np.sin(2 * np.pi * 55 * x) * np.exp(-x / .05)); t0 += .55
def whoosh(t0, d=.6, v=.12):
    x = lp(rng.standard_normal(int(d * SR)), 30) * 3; add(t0, v * x * np.sin(np.pi * tt(d) / d) ** 2)
NOSFX = os.environ.get('NOSFX') == '1'
for nm, s0 in shots[1:]: NOSFX or whoosh(s0 - .25)
def chime(t0, notes, v=.05):
    for m_ in notes:
        x = tt(1.6); add(t0, v * np.sin(2 * np.pi * hz(m_) * x) * np.exp(-x / .5))
SCARY or chime(.8, [72, 76, 79, 84])
x = tt(3); NOSFX or add(rv, .55 * np.sin(2 * np.pi * 42 * x) * np.exp(-x / .8) + .15 * lp(rng.standard_normal(len(x)), 20) * np.exp(-x / .3))
# narration (male voice)
voice = np.zeros(N)
for g in tl["segs"]:
    w = wave.open(g["wav"]); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
    a = np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a)
    s = int(g["start"] * SR); e = min(N, s + len(a)); voice[s:e] += .85 * a[:e - s] / (np.abs(a).max() + 1e-9)
duck = 1 - .45 * lp((lp(np.abs(voice), 2205) > .01).astype(float), 8820)
if os.environ.get('VOICE') == '1': mix[:] = 0   # narration only
mix = mix * duck + voice
mix[-int(1.0 * SR):] *= np.linspace(1, 0, int(1.0 * SR))
mix = np.tanh(mix * 1.05) * .92
print("tail rms", [round(float(np.sqrt(np.mean(mix[N - (j + 1) * SR:N - j * SR] ** 2))), 3) for j in range(4)][::-1])
with wave.open(f"{O}/audio.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32000).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{O}/video.mp4", "-i", f"{O}/audio.wav", "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", f"{O}/{tl['title']}.mp4"], check=True)
print("ok", n / FPS)
