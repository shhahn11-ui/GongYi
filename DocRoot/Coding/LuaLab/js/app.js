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

const sampleCode = `print("Hello, LuaLab")

for i = 1, 5 do
  print("line", i)
end`;

let currentFileName = 'main.lua';

function setStatus(message) {
  statusEl.textContent = message;
}

function renderLineNumbers() {
  const lineCount = codeEditor.value.split('\n').length;
  lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n') || '1';
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
  currentFileName = name || 'main.lua';
  tabName.textContent = currentFileName;
  fileTree.innerHTML = `<li class="active">${currentFileName}</li>`;
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

async function readSelectedFile(file) {
  const text = await file.text();
  codeEditor.value = text;
  setCurrentFileName(file.name || 'main.lua');
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
}

function createNewFile() {
  const inputName = prompt('새 파일 이름을 입력하세요 (.lua)', 'main.lua');
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const fileName = trimmed ? (trimmed.endsWith('.lua') ? trimmed : `${trimmed}.lua`) : 'main.lua';
  setCurrentFileName(fileName);
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${fileName} 새 파일을 만들었습니다.`);
}

function runLua() {
  const source = codeEditor.value;
  if (!source.trim()) {
    output.textContent = '[안내] 코드를 입력하세요.';
    setStatus('실행할 코드를 입력하세요.');
    return;
  }

  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;

  try {
    console.log = (...args) => {
      logs.push(args.map((item) => String(item)).join(' '));
      originalLog(...args);
    };

    console.error = (...args) => {
      logs.push('[에러] ' + args.map((item) => String(item)).join(' '));
      originalError(...args);
    };

    fengari.load(source)();
    output.textContent = logs.join('\n') || '[완료] 출력 없음';
    setStatus('실행 완료.');
  } catch (error) {
    output.textContent = '[오류] ' + error.message;
    setStatus('실행 중 오류가 발생했습니다.');
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

runBtn.addEventListener('click', runLua);

sampleBtn.addEventListener('click', () => {
  codeEditor.value = sampleCode;
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

openFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    await readSelectedFile(file);
  } catch (error) {
    setStatus(`파일 불러오기 실패: ${error.message}`);
  }
});

saveFileBtn.addEventListener('click', downloadCodeFile);
newFileBtn.addEventListener('click', createNewFile);

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

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    runLua();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    downloadCodeFile();
  }
});

codeEditor.addEventListener('input', () => {
  renderLineNumbers();
  updateCursorInfo();
});

codeEditor.addEventListener('click', updateCursorInfo);
codeEditor.addEventListener('keyup', updateCursorInfo);
codeEditor.addEventListener('scroll', syncScroll);

setCurrentFileName('main.lua');
if (!codeEditor.value.trim()) {
  codeEditor.value = sampleCode;
}
renderLineNumbers();
updateCursorInfo();
setStatus('준비 완료. Lua 코드를 실행해보세요.');
