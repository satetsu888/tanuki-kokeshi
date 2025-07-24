import { getAllHints } from './hints';
import { decode, encode } from './cipher';

type Mode = 'decode' | 'encode';

let currentMode: Mode = 'decode';

const inputText = document.getElementById('input-text') as HTMLInputElement;
const hintSelect = document.getElementById('hint-select') as HTMLSelectElement;
const hintDescription = document.getElementById('hint-description') as HTMLSpanElement;
const executeBtn = document.getElementById('execute-btn') as HTMLButtonElement;
const resultSection = document.getElementById('result-section') as HTMLDivElement;
const resultContent = document.getElementById('result-content') as HTMLDivElement;
const modeRadios = document.querySelectorAll('input[name="mode"]') as NodeListOf<HTMLInputElement>;
const decodeLabel = document.querySelector('.decode-label') as HTMLSpanElement;
const encodeLabel = document.querySelector('.encode-label') as HTMLSpanElement;

// ヒントをセレクトボックスに追加
function populateHints(): void {
  const hints = getAllHints();
  
  hints.forEach(hint => {
    const option = document.createElement('option');
    option.value = hint.name;
    option.textContent = hint.name;
    hintSelect.appendChild(option);
  });
}

// ヒントの説明を更新
function updateHintDescription(): void {
  const selectedHint = hintSelect.value;
  const hints = getAllHints();
  const hint = hints.find(h => h.name === selectedHint);
  
  if (hint) {
    hintDescription.textContent = `（${hint.description}）`;
  } else {
    hintDescription.textContent = '';
  }
}

// モードの切り替え
function switchMode(mode: Mode): void {
  currentMode = mode;
  
  if (mode === 'decode') {
    decodeLabel.style.display = 'inline';
    encodeLabel.style.display = 'none';
    inputText.placeholder = '問題を入力してください';
  } else {
    decodeLabel.style.display = 'none';
    encodeLabel.style.display = 'inline';
    inputText.placeholder = '答えを入力してください';
  }
  
  // 結果をクリア
  resultSection.style.display = 'none';
  resultContent.textContent = '';
}

// 実行処理
function execute(): void {
  const text = inputText.value.trim();
  const hintName = hintSelect.value;
  
  if (!text) {
    alert('テキストを入力してください');
    return;
  }
  
  if (!hintName) {
    alert('ヒントを選択してください');
    return;
  }
  
  const result = currentMode === 'decode' 
    ? decode(text, hintName)
    : encode(text, hintName);
  
  if (result.success && result.result) {
    resultContent.textContent = result.result;
    resultSection.style.display = 'block';
  } else if (result.error) {
    alert(result.error);
  }
}

// イベントリスナーの設定
function setupEventListeners(): void {
  // モード切り替え
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      switchMode(target.value as Mode);
    });
  });
  
  // ヒント選択
  hintSelect.addEventListener('change', updateHintDescription);
  
  // 実行ボタン
  executeBtn.addEventListener('click', execute);
  
  // Enterキーでも実行
  inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      execute();
    }
  });
}

// 初期化
function init(): void {
  populateHints();
  setupEventListeners();
  switchMode('decode');
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}