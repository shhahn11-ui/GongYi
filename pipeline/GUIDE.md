# Daily story Shorts — how to make and post 3 videos

Owner: 시형 (Instagram gongyi01). Style the owner liked: "백지 카드", "용이 은퇴한 날", "종이 울리는 왕국", "고양이가 시장인 마을"
(see `examples/`). Fast cuts, one-word captions, expressive blocky characters, male narrator, soft background music, NO sound effects.

## 0. Setup (fresh container)
    cd pipeline && ./setup.sh          # sherpa-onnx TTS, three.js, voice model, fonts; prints "setup ok"

## 1. Write 3 NEW original stories
- Read `topics.md` and never repeat a topic. Original ideas only: no copyrighted characters/stories, no real people, no politics.
- Format: a fantasy/everyday world with one absurd rule → 2–3 funny consequences (big facial expressions) →
  a turn (problem) → ONE clear twist that pays off the setup (understood instantly, funny or heart-warming, a little spooky is OK) →
  closing question to the viewer ("여러분이라면 …?").
- Korean 해요체. First line is the hook ("이 세계에서는, …" / "이 마을은, …"). 40–60 s total, 14–22 lines, each line short (≤ ~3 s).
- Avoid endings that come out of nowhere (the owner hated "계산하고 나갈 건가요?"). The twist must connect to earlier lines.
- Save as `stories/<name>.json` (see `examples/*.json`):
  `{"title": "제목_밑줄", "name": "<name>", "turn": <index of turn line>, "reveal": <index of twist line>, "keys": "<regex of words to highlight>",
    "segs": [["A", "자막 겸 대사"], ["B", "…"], ["G", "직전 줄,", null, 0.8], ["G2", "반전 줄"], …]}`
  First item of each row = shot name used by the HTML. Put a 0.8 s pause (4th item) right before the reveal line.
- `python3 gen_tl.py stories/<name>.json` → narration (per-phrase TTS, voice id 6) + timing.

## 2. Build the scene  `story_<name>.html` (in `pipeline/`)
- Copy the closest example from `examples/` and rewrite shots. Use lib.js helpers: `buildTown`, `buildRoom(scene, x)`, `person`, `crowdPerson`,
  `hero`, `walk`, `idle`, `armsUp`, `setFace(p, kind)` with kinds neutral/happy/sad/angry/shock/blush/smirk/determined/soot/wink, `textTex`, `plane`, `label`.
- Cut the camera every ~1.4 s inside longer lines (`cut(u)`), mix close-ups of faces/props with wide shots. Show info with props (signs, years, labels).
- Camera safety (town): road runs along x; houses occupy |z| 6–12 for x −35…31; lamps at x=−18,−6,6,18 z=3.6; trees at z=±4.6.
  Keep ground cameras at |z| ≤ 2.5 or outside the town (x > 36). Interiors: `buildRoom(scene, 300|600|900)` spans x±7, z±6, y 0–8.
- Test: `./teststory.sh <name>` then LOOK at `stories/<name>/st/grid.jpg` (Read tool). Fix any frame where a head/wall blocks the camera,
  the subject is off-screen, or it is too dark. Repeat until every frame clearly shows its line.

## 3. Render
    NOSFX=1 ONEWORD=1 ./renderstory.sh <name>      # ~6–8 min each on 2 cores; run the 3 one after another
- Output: `stories/<name>/<title>.mp4`. Check the printed `tail rms` (audio present) and look at `python3 chkgrid.py stories/<name>` → `stories/<name>/chkgrid.jpg`.

## 4. Host the files (public raw URL needed by Instagram)
- Repo `shhahn11-ui/GongYi`. Create an orphan branch `daily-YYYYMMDD` with `videos/<nn>_<name>.mp4`, push it.
- URL: `https://raw.githubusercontent.com/shhahn11-ui/GongYi/daily-YYYYMMDD/videos/<file>.mp4` — check `curl -sI` returns 200.

## 5. Post to Instagram (Windsor.ai MCP)
- `execute_action` connector `instagram`, account `17841480244166843`, action `create_video_post`, params `{video_url, caption}`.
- Caption template:
      <제목> <emoji>
      (blank line)
      <설정 한 줄>
      <갈등 한 줄>…
      (blank line)
      <마지막 질문> 👇
      (blank line)
      #만약에 #세계관 #<주제 태그 2~3개> #애니메이션 #릴스 #shorts

## 6. Finish
- Append the 3 new titles to `topics.md` on branch `shorts-pipeline` and push.
- Report: the 3 titles, one-line summary each, and the Instagram media ids.
