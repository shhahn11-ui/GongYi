# Daily story Shorts — how to make and post 3 videos

Owner: 시형 (Instagram gongyi01). Style the owner liked: "백지 카드", "용이 은퇴한 날", "종이 울리는 왕국", "고양이가 시장인 마을"
(see `examples/`). Fast cuts, one-word captions, expressive blocky characters, male narrator, soft background music, NO sound effects.

## ★ 2026-11-28 시형님 요청: 이제부터 과학 퀴즈 영상이 기본 (세계관 스토리는 중단)
형식 (30–45초, 10–16줄, 해요체, 남자 내레이터, 배경음악, 효과음 없음, 한 단어 자막 그대로):
1. **첫 장면 = 상황 제시 + 질문 (0~3초)**: 일상 물건·몸·동물로 바로 그림이 되는 상황 하나. 첫 줄은 질문으로 끝나게.
   예) "지구에 감은 밧줄을 1미터만 늘리면, 그 틈으로 고양이가 지나갈 수 있을까요?"
   화면에 질문 소품(숫자·라벨)과 보기 2~3개(예/아니오, A/B/C)를 크게.
2. **"3초 안에 맞춰 보세요!"** 줄 다음에 3초 멈춤 → JSON 4번째 값으로 `3.0` 쉼을 주고, HTML에서 그 구간에 3·2·1 큰 카운트다운 라벨.
3. **정답 공개** (reveal 줄, 직관과 반대인 답일수록 좋음) → 왜 그런지 3~6줄로 짧게, 숫자·비교(자동차 몇 대, 지구 몇 바퀴)로 그림 보여 주기.
4. **마무리**: "친구는 맞힐 수 있을까요? 태그해서 물어보세요 👇" 류.
- JSON: `turn` = 카운트다운 직전 줄, `reveal` = 정답 줄. 주인공 이름이 필요하면 지우.
- 사실 정확성 필수: 숫자·사실은 WebSearch로 확인하고, 추정치는 "약"을 붙임. 틀린 과학은 절대 올리지 않기.
- 지난 데이터(perf.md 과학 메모): 잘 된 것 = 직관과 반대인 정답이 있는 퍼즐(밧줄 1m 4944·공유 35), 신기한 동물 사실(문어 공유 38).
  안 된 것 = 첫 줄이 개념 설명형(우주선 궤도, 상대성, 기조력, 이온) → 이탈 60~90%, 조회 100대. 첫 줄에 어려운 용어 금지.
- 캡션 템플릿 (과학 퀴즈):
      <질문형 제목> <emoji>
      (blank line)
      <상황 한 줄>
      3초 안에 맞춰 보세요! 정답은 영상에 👀
      (blank line)
      친구는 맞힐 수 있을까요? 태그해서 물어보세요 👇
      (blank line)
      #과학퀴즈 #과학상식 #맞춰보세요 #<주제 태그 2~3개> #애니메이션 #릴스 #shorts
- 성과 분석은 #과학퀴즈(새 형식)와 #과학상식(옛 과학 영상) 캡션 기준으로 한다.
- 아래 1장의 "세계관 스토리" 규칙은 참고용(캐릭터·카메라·렌더 방법은 그대로 사용).

## 0. Setup (fresh container)
    cd pipeline && ./setup.sh          # sherpa-onnx TTS, three.js, voice model, fonts; prints "setup ok"

## 1. Write 3 NEW original stories
- Read `topics.md` and never repeat a topic. Original ideas only: no copyrighted characters/stories, no real people, no politics.
- Format: a fantasy/everyday world with one absurd rule → 2–3 funny consequences (big facial expressions) →
  a turn (problem) → ONE clear twist that pays off the setup (understood instantly, funny or heart-warming, a little spooky is OK) →
  closing question to the viewer ("여러분이라면 …?").
- Owner request 2026-11-20: also try stories built on what's topical in Korea right now (수능·시험 문제, 요즘 화제·트렌드 — no politics, no real people).
  First test: 수능 듣기평가에 소리 내면 굳는 세상 (posted 2026-11-20, day after the 2027 수능). If it does well (check perf.md), make topical stories the main line.
- Main character name: 지우 (owner request 2026-11-17; do NOT use 민준 anymore). Side characters may have other names.
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

## 3. Render (HQ, owner asked for higher quality 2026-11-19)
    RES=1080x1920 HQ=1 NOSFX=1 ONEWORD=1 ./renderstory.sh <name>   # native 1080p, ACES tone mapping, soft shadows, fill light,
                                                                    # subtle camera drift, vignette, plucked melody over pads (~15 min each)
- In the HTML: call `life(p, t)` for every visible person at the end of renderAt (breathing, blinking, head sway), and move the camera
  with a smooth dolly in every shot (no static cameras). Test with `RES=1080x1920 ./teststory.sh <name>`.
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
