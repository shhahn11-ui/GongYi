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
const terminalPanel = document.querySelector('.terminal-panel');

let terminalPromptEl;
let terminalInputEl;
let terminalSubmitBtn;
let pendingInputResolve = null;

const sampleCode = `#include <stdio.h>

int main() {
  int a = 0;
  int b = 0;

  printf("두 정수를 입력하세요 (예: 3 5): ");
  scanf("%d %d", &a, &b);

  printf("첫 번째: %d\n", a);
  printf("두 번째: %d\n", b);
  printf("합: %d\n", a + b);
  printf("곱: %d\n", a * b);
  return 0;
}`;

let currentFileName = 'main.c';

function setStatus(message) {
  statusEl.textContent = message;
}

function appendOutput(text) {
  output.textContent += text;
  output.scrollTop = output.scrollHeight;
}

function setupTerminalInput() {
  if (!terminalPanel) return;

  terminalPanel.classList.add('has-input');

  const inputWrap = document.createElement('div');
  inputWrap.className = 'terminal-input';

  terminalPromptEl = document.createElement('label');
  terminalPromptEl.textContent = '입력 대기';
  terminalPromptEl.setAttribute('for', 'terminalInput');

  terminalInputEl = document.createElement('input');
  terminalInputEl.id = 'terminalInput';
  terminalInputEl.type = 'text';
  terminalInputEl.placeholder = 'scanf 입력을 여기에 입력하세요';
  terminalInputEl.autocomplete = 'off';
  terminalInputEl.disabled = true;

  terminalSubmitBtn = document.createElement('button');
  terminalSubmitBtn.type = 'button';
  terminalSubmitBtn.textContent = '입력';
  terminalSubmitBtn.disabled = true;

  inputWrap.append(terminalPromptEl, terminalInputEl, terminalSubmitBtn);
  terminalPanel.appendChild(inputWrap);

  const submitHandler = () => {
    if (!pendingInputResolve) return;
    const value = terminalInputEl.value;
    const resolver = pendingInputResolve;
    pendingInputResolve = null;
    terminalInputEl.value = '';
    terminalInputEl.disabled = true;
    terminalSubmitBtn.disabled = true;
    appendOutput(`> ${value}\n`);
    resolver(value);
  };

  terminalSubmitBtn.addEventListener('click', submitHandler);
  terminalInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitHandler();
    }
  });
}

function requestTerminalInput(promptLabel) {
  if (!terminalInputEl) {
    const fallback = window.prompt(promptLabel || '입력', '');
    if (fallback === null) {
      throw new Error('입력이 취소되었습니다.');
    }
    return Promise.resolve(fallback);
  }

  return new Promise((resolve) => {
    pendingInputResolve = resolve;
    terminalPromptEl.textContent = promptLabel || '입력';
    terminalInputEl.value = '';
    terminalInputEl.disabled = false;
    terminalSubmitBtn.disabled = false;
    terminalInputEl.focus();
  });
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
  currentFileName = name || 'main.c';
  tabName.textContent = currentFileName;
  fileTree.innerHTML = `<li class="active">${currentFileName}</li>`;
}

function downloadCodeFile() {
  const code = codeEditor.value;
  const blob = new Blob([code], { type: 'text/x-c;charset=utf-8' });
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
  setCurrentFileName(file.name || 'main.c');
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
}

function createNewFile() {
  const inputName = prompt('새 파일 이름을 입력하세요 (.c)', 'main.c');
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const fileName = trimmed ? (trimmed.endsWith('.c') ? trimmed : `${trimmed}.c`) : 'main.c';

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
  setStatus('C 코드 실행 중...');
  output.textContent = '';

  try {
    const runResult = await runMiniC(userCode);
    if (runResult.output.trim()) {
      appendOutput(runResult.output);
    } else {
      appendOutput('(출력 없음)\n');
    }

    if (runResult.warning) {
      appendOutput('[안내] ' + runResult.warning + '\n');
    }

    setStatus('실행 완료.');
  } catch (error) {
    appendOutput('[실행 예외] ' + error.message + '\n');
    setStatus('실행 중 오류가 발생했습니다.');
  } finally {
    runBtn.disabled = false;
  }
}

function evaluateExpression(expression, vars) {
  const safeExpr = expression
    .replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (name) => {
      if (Object.prototype.hasOwnProperty.call(vars, name)) {
        return String(vars[name]);
      }
      if (name === 'true' || name === 'false') {
        return name;
      }
      return '0';
    });

  if (!/^[0-9+\-*/%().\s<>!=&|]+$/.test(safeExpr)) {
    throw new Error(`지원하지 않는 표현식: ${expression}`);
  }

  return Function(`"use strict"; return (${safeExpr});`)();
}

function splitArgs(raw) {
  const args = [];
  let buf = '';
  let inString = false;
  let escaped = false;

  for (const ch of raw) {
    if (escaped) {
      buf += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      buf += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      buf += ch;
      continue;
    }
    if (ch === ',' && !inString) {
      args.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }

  if (buf.trim()) {
    args.push(buf.trim());
  }
  return args;
}

function formatPrintf(format, values) {
  let idx = 0;
  const converted = format.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  return converted.replace(/%[dfsc]/g, (token) => {
    const value = values[idx++];
    if (token === '%d') return String(Math.trunc(Number(value) || 0));
    if (token === '%f') return String(Number(value) || 0);
    if (token === '%c') return String(value ?? '')[0] || '';
    return String(value ?? '');
  });
}

function getScanfSpecifiers(format) {
  return format.match(/%[dfcs]/g) || [];
}

async function readScanfInputs(specifiers) {
  const inputs = [];

  for (let i = 0; i < specifiers.length; i += 1) {
    const spec = specifiers[i];
    const raw = await requestTerminalInput(`[scanf] ${spec} 입력 (${i + 1}/${specifiers.length})`);

    if (spec === '%d') {
      const val = parseInt(raw, 10);
      inputs.push(Number.isFinite(val) ? val : 0);
      continue;
    }

    if (spec === '%f') {
      const val = parseFloat(raw);
      inputs.push(Number.isFinite(val) ? val : 0);
      continue;
    }

    if (spec === '%c') {
      inputs.push(String(raw)[0] || '');
      continue;
    }

    inputs.push(raw);
  }

  return inputs;
}

async function runMiniC(source) {
  const vars = {};
  const lines = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter(Boolean)
    .filter((line) => !['{', '}'].includes(line))
    .filter((line) => !line.startsWith('#include'))
    .filter((line) => !line.startsWith('int main'));

  let outputText = '';

  for (const line of lines) {
    if (line.startsWith('printf')) {
      const match = line.match(/^printf\((.*)\);?$/);
      if (!match) throw new Error(`printf 구문 오류: ${line}`);
      const args = splitArgs(match[1]);
      if (!args.length) throw new Error('printf 인자가 없습니다.');

      const formatLiteral = args[0];
      if (!/^"[\s\S]*"$/.test(formatLiteral)) {
        throw new Error('printf 첫 번째 인자는 문자열이어야 합니다.');
      }

      const format = formatLiteral.slice(1, -1);
      const values = args.slice(1).map((expr) => evaluateExpression(expr, vars));
      outputText += formatPrintf(format, values);
      continue;
    }

    if (line.startsWith('scanf')) {
      const match = line.match(/^scanf\((.*)\);?$/);
      if (!match) throw new Error(`scanf 구문 오류: ${line}`);
      const args = splitArgs(match[1]);
      if (args.length < 2) throw new Error('scanf 인자가 부족합니다.');

      const formatLiteral = args[0];
      if (!/^"[\s\S]*"$/.test(formatLiteral)) {
        throw new Error('scanf 첫 번째 인자는 문자열이어야 합니다.');
      }

      const format = formatLiteral.slice(1, -1);
      const specifiers = getScanfSpecifiers(format);

      if (specifiers.length !== args.length - 1) {
        throw new Error('scanf 인자 수와 서식 지정자가 일치하지 않습니다.');
      }

      const inputs = await readScanfInputs(specifiers);

      args.slice(1).forEach((arg, idx) => {
        const target = arg.replace(/^&/, '').trim();
        if (!target) {
          throw new Error('scanf 대상 변수가 없습니다.');
        }
        vars[target] = inputs[idx];
      });

      continue;
    }

    const decl = line.match(/^(int|float|double|char)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(=\s*(.*))?;$/);
    if (decl) {
      const name = decl[2];
      const expr = decl[4];
      vars[name] = expr ? evaluateExpression(expr, vars) : 0;
      continue;
    }

    const assign = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*);$/);
    if (assign) {
      const name = assign[1];
      const expr = assign[2];
      vars[name] = evaluateExpression(expr, vars);
      continue;
    }

    if (/^return\s+/.test(line)) {
      continue;
    }
  }

  return {
    output: outputText,
    warning: '현재 브라우저용 C 미니 실행기입니다. printf/scanf/변수/대입/산술 위주로 지원합니다.'
  };
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

setCurrentFileName('main.c');
renderLineNumbers();
updateCursorInfo();
setupTerminalInput();
setStatus('준비 완료. (로컬 C 미니 실행기) 코드를 실행해보세요.');
