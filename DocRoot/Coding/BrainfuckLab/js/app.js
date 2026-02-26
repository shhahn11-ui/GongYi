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

const sampleCode = '++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.';

let currentFileName = 'main.bf';

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
  currentFileName = name || 'main.bf';
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
  setCurrentFileName(file.name || 'main.bf');
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
}

function createNewFile() {
  const inputName = prompt('새 파일 이름을 입력하세요 (.bf)', 'main.bf');
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const fileName = trimmed ? (trimmed.endsWith('.bf') ? trimmed : `${trimmed}.bf`) : 'main.bf';
  setCurrentFileName(fileName);
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${fileName} 새 파일을 만들었습니다.`);
}

function buildBracketMap(program) {
  const stack = [];
  const map = new Map();

  for (let index = 0; index < program.length; index += 1) {
    const token = program[index];
    if (token === '[') {
      stack.push(index);
    } else if (token === ']') {
      const open = stack.pop();
      if (open === undefined) {
        throw new Error('] 짝이 맞지 않습니다.');
      }
      map.set(open, index);
      map.set(index, open);
    }
  }

  if (stack.length > 0) {
    throw new Error('[ 짝이 맞지 않습니다.');
  }

  return map;
}

function runBrainfuck(source) {
  const program = source.replace(/[^<>+\-.,\[\]]/g, '');
  const bracketMap = buildBracketMap(program);

  const memory = new Uint8Array(30000);
  let pointer = 0;
  let instruction = 0;
  let output = '';
  let step = 0;
  const maxStep = 1000000;

  while (instruction < program.length) {
    step += 1;
    if (step > maxStep) {
      throw new Error('실행 제한을 초과했습니다.');
    }

    const token = program[instruction];
    switch (token) {
      case '>':
        pointer += 1;
        if (pointer >= memory.length) {
          throw new Error('메모리 포인터가 범위를 초과했습니다.');
        }
        break;
      case '<':
        pointer -= 1;
        if (pointer < 0) {
          throw new Error('메모리 포인터가 0보다 작아졌습니다.');
        }
        break;
      case '+':
        memory[pointer] = (memory[pointer] + 1) & 255;
        break;
      case '-':
        memory[pointer] = (memory[pointer] - 1 + 256) & 255;
        break;
      case '.':
        output += String.fromCharCode(memory[pointer]);
        break;
      case ',': {
        const input = prompt('한 글자 입력', '') ?? '';
        memory[pointer] = input.length > 0 ? input.charCodeAt(0) & 255 : 0;
        break;
      }
      case '[':
        if (memory[pointer] === 0) {
          instruction = bracketMap.get(instruction);
        }
        break;
      case ']':
        if (memory[pointer] !== 0) {
          instruction = bracketMap.get(instruction);
        }
        break;
      default:
        break;
    }

    instruction += 1;
  }

  return output;
}

runBtn.addEventListener('click', () => {
  const source = codeEditor.value;
  if (!source.trim()) {
    output.textContent = '[안내] 코드를 입력하세요.';
    setStatus('실행할 코드를 입력하세요.');
    return;
  }

  try {
    const result = runBrainfuck(source);
    output.textContent = result || '[완료] 출력 없음';
    setStatus('실행 완료.');
  } catch (error) {
    output.textContent = '[오류] ' + error.message;
    setStatus('실행 중 오류가 발생했습니다.');
  }
});

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
    runBtn.click();
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

setCurrentFileName('main.bf');
if (!codeEditor.value.trim()) {
  codeEditor.value = sampleCode;
}
renderLineNumbers();
updateCursorInfo();
setStatus('준비 완료. Brainfuck 코드를 실행해보세요.');
