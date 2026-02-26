const codeEditor = document.getElementById('codeEditor');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const runBtn = document.getElementById('runBtn');
const cursorInfo = document.getElementById('cursorInfo');
const lineNumbers = document.getElementById('lineNumbers');
const tabName = document.getElementById('tabName');
const fileTree = document.getElementById('fileTree');
const sampleBtn = document.getElementById('sampleBtn');
const newFileBtn = document.getElementById('newFileBtn');
const openFileBtn = document.getElementById('openFileBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const clearCodeBtn = document.getElementById('clearCodeBtn');
const clearOutputBtn = document.getElementById('clearOutputBtn');
const fileInput = document.getElementById('fileInput');

const defaultProgram = `어떻게

엄.. .. ..
식어!
식ㅋ
식........ .........ㅋ

화이팅!

이 사람이름이냐ㅋㅋ`;

let currentFileName = 'main.umm';

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
  currentFileName = name || 'main.umm';
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
  setCurrentFileName(file.name || 'main.umm');
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${file.name} 파일을 불러왔습니다.`);
}

function createNewFile() {
  const inputName = prompt('새 파일 이름을 입력하세요 (.umm)', 'main.umm');
  if (inputName === null) {
    return;
  }

  const trimmed = inputName.trim();
  const fileName = trimmed ? (trimmed.endsWith('.umm') ? trimmed : `${trimmed}.umm`) : 'main.umm';
  setCurrentFileName(fileName);
  codeEditor.value = '';
  renderLineNumbers();
  updateCursorInfo();
  setStatus(`${fileName} 새 파일을 만들었습니다.`);
}

function getVariableValue(variables, index) {
  return variables.get(index) ?? 0;
}

function parsePlusMinusPart(part) {
  let value = 0;
  for (const character of part) {
    if (character === '.') {
      value += 1;
      continue;
    }
    if (character === ',') {
      value -= 1;
      continue;
    }
    return null;
  }
  return value;
}

function evaluateExpr(rawExpr, variables) {
  const expr = rawExpr.trim();
  if (!expr) {
    return 0;
  }

  const factors = expr.split(/\s+/).filter(Boolean);
  if (factors.length === 0) {
    return 0;
  }

  const factorValues = factors.map((factor) => {
    let sum = 0;
    let cursor = 0;

    while (cursor < factor.length) {
      const rest = factor.slice(cursor);
      const varMatch = rest.match(/^어+/);

      if (varMatch) {
        const index = varMatch[0].length;
        sum += getVariableValue(variables, index);
        cursor += varMatch[0].length;
        continue;
      }

      const numMatch = rest.match(/^[.,]+/);
      if (numMatch) {
        const partValue = parsePlusMinusPart(numMatch[0]);
        if (partValue === null) {
          throw new Error(`잘못된 수식 토큰: ${numMatch[0]}`);
        }
        sum += partValue;
        cursor += numMatch[0].length;
        continue;
      }

      throw new Error(`해석할 수 없는 수식: ${factor}`);
    }

    return sum;
  });

  return factorValues.reduce((acc, current) => acc * current, 1);
}

function appendOutput(buffer, text) {
  buffer.value += text;
}

function normalizeProgram(source) {
  return source.replace(/\r\n/g, '\n').replace(/~/g, '\n');
}

function extractBodyLines(source) {
  const normalized = normalizeProgram(source);
  const lines = normalized.split('\n').map((line) => line.trim());
  const start = lines.indexOf('어떻게');
  const end = lines.lastIndexOf('이 사람이름이냐ㅋㅋ');

  if (start === -1 || end === -1 || start >= end) {
    throw new Error('프로그램은 "어떻게"로 시작하고 "이 사람이름이냐ㅋㅋ"로 끝나야 합니다.');
  }

  return lines.slice(start + 1, end).filter((line) => line.length > 0);
}

function runProgram(source) {
  const lines = extractBodyLines(source);
  const variables = new Map();
  const outputBuffer = { value: '' };

  let pointer = 0;
  let returnValue = 0;
  let isEnded = false;
  let stepCount = 0;
  const maxSteps = 100000;

  function executeSingleCommand(line) {
    const inputMatch = line.match(/^(어*)엄식\?$/);
    if (inputMatch) {
      const variableIndex = inputMatch[1].length + 1;
      const userInput = prompt(`${variableIndex}번째 변수 입력값(정수)을 입력하세요`, '0');
      const parsed = Number.parseInt((userInput ?? '0').trim(), 10);
      if (Number.isNaN(parsed)) {
        throw new Error('입력은 정수여야 합니다.');
      }
      variables.set(variableIndex, parsed);
      return;
    }

    const assignMatch = line.match(/^(어*)엄(.*)$/);
    if (assignMatch) {
      const variableIndex = assignMatch[1].length + 1;
      const value = evaluateExpr(assignMatch[2], variables);
      variables.set(variableIndex, value);
      return;
    }

    const printNumberMatch = line.match(/^식(.*)!$/);
    if (printNumberMatch) {
      const value = evaluateExpr(printNumberMatch[1], variables);
      appendOutput(outputBuffer, String(value));
      return;
    }

    const printCharMatch = line.match(/^식(.*)ㅋ+$/);
    if (printCharMatch) {
      const expr = printCharMatch[1].trim();
      if (!expr) {
        appendOutput(outputBuffer, '\n');
        return;
      }

      const codePoint = evaluateExpr(expr, variables);
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        throw new Error(`유효하지 않은 문자 코드: ${codePoint}`);
      }
      appendOutput(outputBuffer, String.fromCodePoint(codePoint));
      return;
    }

    const ifMatch = line.match(/^동탄(.*?)\?(.*)$/);
    if (ifMatch) {
      const condition = evaluateExpr(ifMatch[1], variables);
      if (condition === 0) {
        const command = ifMatch[2].trim();
        if (command.startsWith('{') && command.endsWith('}')) {
          const innerCommand = command.slice(1, -1).trim();
          if (innerCommand) {
            executeSingleCommand(innerCommand);
          }
        } else if (command) {
          executeSingleCommand(command);
        }
      }
      return;
    }

    const gotoMatch = line.match(/^준(.*)$/);
    if (gotoMatch) {
      const targetLine = evaluateExpr(gotoMatch[1], variables);
      if (!Number.isInteger(targetLine) || targetLine < 1 || targetLine > lines.length) {
        throw new Error(`준 대상 줄 번호가 범위를 벗어났습니다: ${targetLine}`);
      }
      pointer = targetLine - 1;
      return;
    }

    const returnMatch = line.match(/^화이팅!(.*)$/);
    if (returnMatch) {
      returnValue = evaluateExpr(returnMatch[1], variables);
      isEnded = true;
      return;
    }

    throw new Error(`알 수 없는 명령: ${line}`);
  }

  while (pointer < lines.length && !isEnded) {
    stepCount += 1;
    if (stepCount > maxSteps) {
      throw new Error('실행 횟수 제한을 초과했습니다. (무한 루프 가능성)');
    }

    const currentLine = lines[pointer];
    const previousPointer = pointer;
    executeSingleCommand(currentLine);

    if (isEnded) {
      break;
    }

    if (pointer === previousPointer) {
      pointer += 1;
    }
  }

  return {
    output: outputBuffer.value,
    returnValue,
    ended: isEnded
  };
}

function runUmmLang() {
  const source = codeEditor.value;
  if (!source.trim()) {
    output.textContent = '[안내] 코드를 입력하세요.';
    setStatus('실행할 코드를 입력하세요.');
    return;
  }

  try {
    const result = runProgram(source);
    const endedLabel = result.ended ? `[종료코드: ${result.returnValue}]` : '[종료되지 않음]';
    output.textContent = `${result.output}\n${endedLabel}`.trimEnd();
    setStatus('실행 완료.');
  } catch (error) {
    output.textContent = `[오류] ${error.message}`;
    setStatus('실행 중 오류가 발생했습니다.');
  }
}

runBtn.addEventListener('click', runUmmLang);

sampleBtn.addEventListener('click', () => {
  codeEditor.value = defaultProgram;
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
    runUmmLang();
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

setCurrentFileName('main.umm');
if (!codeEditor.value.trim()) {
  codeEditor.value = defaultProgram;
}
renderLineNumbers();
updateCursorInfo();
setStatus('준비 완료. umm랭 코드를 실행해보세요.');
