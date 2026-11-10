#!/bin/bash
# one-time setup in a fresh container: python TTS, three.js, voice model, Korean fonts
set -e; cd "$(dirname "$0")"
pip install -q --break-system-packages sherpa-onnx==2.0.1 numpy pillow
npm install --silent
if [ ! -d models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11 ]; then
  mkdir -p models && curl -sL -o models/st.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2
  tar -xjf models/st.tar.bz2 -C models && rm models/st.tar.bz2
fi
ls /usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc >/dev/null 2>&1 || (apt-get install -y -q fonts-noto-cjk fonts-noto-cjk-extra >/dev/null 2>&1 || echo "WARN: install Noto CJK fonts")
node -e "require('playwright')" && echo "setup ok"
