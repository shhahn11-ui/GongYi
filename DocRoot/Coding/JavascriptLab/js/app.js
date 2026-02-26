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

const sampleCode = `function greet(name) {
  return ` + "`" + `안녕하세요, ${name}!` + "`" + `;
}

console.log(greet('JavascriptLab'));

const nums = [1, 2, 3, 4, 5];
const sum = nums.reduce((a, b) => a + b, 0);
console.log('합계:', sum);
console.log('평균:', sum / nums.length);`;

let currentFileName = 'main.js';

function setStatus(message) {
  statusEl.textContent = message;
}

function appendOutput(text) {
  output.textContent += text;
  output.scrollTop = output.scrollHeight;
}

function renderLineNumbers() {
  const lineCount = codeEditor.value.split('\n').length;
  const numbers = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
  lineNumbers.textContent = numbers || '1';
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
  currentFileName = name || 'main.js';
  tabName.textContent = currentFileName;
  fileTree.innerHTML = `<li class="active">${currentFileName}</li>`;
}

function downloadCodeFile() {
  const code = codeEditor.value;
  const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' });
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
  setCurrentFileName(file.name || 'main.js');
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
}

function createNewFile() {
  const inputName = prompt('새 파일 이름을 입력하세요 (.js)', 'main.js');
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const fileName = trimmed ? (trimmed.endsWith('.js') ? trimmed : `${trimmed}.js`) : 'main.js';

  setCurrentFileName(fileName);
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${fileName} 새 파일을 만들었습니다.`);
}

async function runCode() {
  const userCode = codeEditor.value;
  if (!userCode.trim()) {
    setStatus('실행할 코드를 입력하세요.');
    return;
  }

  runBtn.disabled = true;
  setStatus('JavaScript 코드 실행 중...');
  output.textContent = '';

  try {
    const logs = [];
    const sandboxConsole = {
      log: (...args) => logs.push(args.map((value) => String(value)).join(' ')),
      error: (...args) => logs.push('[error] ' + args.map((value) => String(value)).join(' ')),
      warn: (...args) => logs.push('[warn] ' + args.map((value) => String(value)).join(' ')),
      info: (...args) => logs.push('[info] ' + args.map((value) => String(value)).join(' '))
    };

    const runner = new Function('console', `"use strict";\n${userCode}`);
    runner(sandboxConsole);

    if (logs.length === 0) {
      appendOutput('(출력 없음)\n');
    } else {
      appendOutput(logs.join('\n') + '\n');
    }

    setStatus('실행 완료.');
  } catch (error) {
    appendOutput('[실행 예외] ' + error.message + '\n');
    setStatus('실행 중 오류가 발생했습니다.');
  } finally {
    runBtn.disabled = false;
  }
}

sampleBtn.addEventListener('click', () => {
  codeEditor.value = sampleCode;
  renderLineNumbers();
  updateCursorInfo();
  setStatus('예제 코드를 불러왔습니다. 실행 버튼을 눌러보세요.');
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
runBtn.addEventListener('click', runCode);

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
    runCode();
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

setCurrentFileName('main.js');
renderLineNumbers();
updateCursorInfo();
setStatus('준비 완료. JavaScript 코드를 실행해보세요.');
