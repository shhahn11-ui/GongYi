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

const sampleCode = `def greet(name):
    return f"안녕하세요, {name}!"

print(greet("PythonLab"))

numbers = [2, 4, 6, 8, 10]
print("합계:", sum(numbers))
print("평균:", sum(numbers) / len(numbers))`;

let pyodide;
let currentFileName = 'main.py';

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
  currentFileName = name || 'main.py';
  tabName.textContent = currentFileName;
  fileTree.innerHTML = `<li class="active">${currentFileName}</li>`;
}

function downloadCodeFile() {
  const code = codeEditor.value;
  const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
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
  setCurrentFileName(file.name || 'main.py');
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
}

function createNewFile() {
  const inputName = prompt('새 파일 이름을 입력하세요 (.py)', 'main.py');
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const fileName = trimmed ? (trimmed.endsWith('.py') ? trimmed : `${trimmed}.py`) : 'main.py';

  setCurrentFileName(fileName);
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${fileName} 새 파일을 만들었습니다.`);
}

async function initPyodideRuntime() {
  try {
    setStatus('파이썬 런타임 로딩 중...');
    pyodide = await loadPyodide();
    runBtn.disabled = false;
    setStatus('준비 완료. 코드를 실행해보세요.');
  } catch (error) {
    setStatus(`런타임 로딩 실패: ${error.message}`);
  }
}

async function runCode() {
  if (!pyodide) {
    setStatus('런타임이 아직 준비되지 않았습니다.');
    return;
  }

  const userCode = codeEditor.value;
  if (!userCode.trim()) {
    setStatus('실행할 코드를 입력하세요.');
    return;
  }

  runBtn.disabled = true;
  setStatus('코드 실행 중...');

  try {
    output.textContent = '';

    pyodide.setStdout({
      batched: (text) => appendOutput(text + '\n')
    });

    pyodide.setStderr({
      batched: (text) => appendOutput('[에러] ' + text + '\n')
    });

    await pyodide.runPythonAsync(userCode);
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

setCurrentFileName('main.py');
renderLineNumbers();
updateCursorInfo();
initPyodideRuntime();
