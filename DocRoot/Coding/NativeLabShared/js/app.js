const codeEditor = document.getElementById('codeEditor');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const cursorInfo = document.getElementById('cursorInfo');
const lineNumbers = document.getElementById('lineNumbers');
const tabName = document.getElementById('tabName');
const fileTree = document.getElementById('fileTree');
const runBtn = document.getElementById('runBtn');
const sampleBtn = document.getElementById('sampleBtn');
const newFileBtn = document.getElementById('newFileBtn');
const openFileBtn = document.getElementById('openFileBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const clearCodeBtn = document.getElementById('clearCodeBtn');
const clearOutputBtn = document.getElementById('clearOutputBtn');
const fileInput = document.getElementById('fileInput');

const config = window.labConfig || {};
let currentFileName = config.fileName || 'main.txt';

function setStatus(message) {
  statusEl.textContent = message;
}

function renderLineNumbers() {
  const lineCount = codeEditor.value.split('\n').length;
  lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n') || '1';
}

function syncScroll() {
  lineNumbers.scrollTop = codeEditor.scrollTop;
}

function updateCursorInfo() {
  const position = codeEditor.selectionStart;
  const textBeforeCursor = codeEditor.value.slice(0, position);
  const lines = textBeforeCursor.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  cursorInfo.textContent = `Ln ${line}, Col ${col}`;
}

function setCurrentFileName(name) {
  currentFileName = name || config.fileName || 'main.txt';
  tabName.textContent = currentFileName;
  fileTree.innerHTML = `<li>${currentFileName}</li>`;
}

function downloadCodeFile() {
  const blob = new Blob([codeEditor.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = currentFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`${currentFileName} 파일로 저장했습니다.`);
}

function runGuide() {
  const source = codeEditor.value;
  if (!source.trim()) {
    setStatus('코드를 입력하세요.');
    return;
  }

  output.textContent = [
    `[${config.language || 'Language'} 안내]`,
    '브라우저 단독 환경에서는 네이티브 컴파일/실행을 직접 수행하지 않습니다.',
    '',
    '1) 아래 명령으로 로컬에서 실행하세요.',
    config.command || '(실행 명령 미정)',
    '',
    '2) 현재 코드는 저장 버튼으로 파일 저장 후 사용하면 됩니다.'
  ].join('\n');

  setStatus('실행 안내를 출력했습니다.');
}

sampleBtn.addEventListener('click', () => {
  codeEditor.value = config.sampleCode || '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus('예제 코드를 불러왔습니다.');
});

clearCodeBtn.addEventListener('click', () => {
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus('코드를 지웠습니다.');
});

clearOutputBtn.addEventListener('click', () => {
  output.textContent = '';
  setStatus('출력을 지웠습니다.');
});

newFileBtn.addEventListener('click', () => {
  const inputName = prompt(`새 파일 이름을 입력하세요 (${config.extension || '.txt'})`, currentFileName);
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const ext = config.extension || '.txt';
  const fileName = trimmed ? (trimmed.endsWith(ext) ? trimmed : `${trimmed}${ext}`) : `main${ext}`;
  setCurrentFileName(fileName);
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${fileName} 새 파일을 만들었습니다.`);
});

openFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  codeEditor.value = text;
  setCurrentFileName(file.name || currentFileName);
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
});

saveFileBtn.addEventListener('click', downloadCodeFile);
runBtn.addEventListener('click', runGuide);

codeEditor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = `${codeEditor.value.substring(0, start)}    ${codeEditor.value.substring(end)}`;
    codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    renderLineNumbers();
    updateCursorInfo();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    downloadCodeFile();
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runGuide();
  }
});

codeEditor.addEventListener('input', () => {
  renderLineNumbers();
  updateCursorInfo();
});
codeEditor.addEventListener('click', updateCursorInfo);
codeEditor.addEventListener('keyup', updateCursorInfo);
codeEditor.addEventListener('scroll', syncScroll);

setCurrentFileName(currentFileName);
codeEditor.value = config.sampleCode || '';
renderLineNumbers();
updateCursorInfo();
setStatus(`준비 완료. ${config.language || ''} 코드를 작성하세요.`.trim());
