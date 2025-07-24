import { getAllHints } from './hints';
import { decode, encode } from './cipher';

type Mode = 'decode' | 'encode';

let currentMode: Mode = 'decode';
let selectedHints: string[] = [];

const inputText = document.getElementById('input-text') as HTMLInputElement;
const hintCheckboxesContainer = document.getElementById('hint-checkboxes') as HTMLDivElement;
const selectedHintsContainer = document.getElementById('selected-hints') as HTMLDivElement;
const executeBtn = document.getElementById('execute-btn') as HTMLButtonElement;
const resultSection = document.getElementById('result-section') as HTMLDivElement;
const resultContent = document.getElementById('result-content') as HTMLDivElement;
const modeRadios = document.querySelectorAll('input[name="mode"]') as NodeListOf<HTMLInputElement>;
const decodeLabel = document.querySelector('.decode-label') as HTMLSpanElement;
const encodeLabel = document.querySelector('.encode-label') as HTMLSpanElement;

// ヒントチェックボックスを作成
function populateHints(): void {
  const hints = getAllHints();
  
  hints.forEach(hint => {
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'hint-checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `hint-${hint.name}`;
    checkbox.value = hint.name;
    checkbox.addEventListener('change', updateSelectedHints);
    
    const label = document.createElement('label');
    label.htmlFor = `hint-${hint.name}`;
    label.innerHTML = `${hint.name}<span class="hint-description">（${hint.description}）</span>`;
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    hintCheckboxesContainer.appendChild(checkboxContainer);
  });
}

// 選択されたヒントを更新
function updateSelectedHints(): void {
  selectedHints = [];
  const checkboxes = hintCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked');
  
  checkboxes.forEach(checkbox => {
    selectedHints.push((checkbox as HTMLInputElement).value);
  });
  
  displaySelectedHints();
}

// 選択されたヒントを表示
function displaySelectedHints(): void {
  selectedHintsContainer.innerHTML = '';
  
  if (selectedHints.length > 0) {
    const label = document.createElement('div');
    label.className = 'selected-hints-label';
    label.textContent = '選択中のヒント：';
    selectedHintsContainer.appendChild(label);
    
    selectedHints.forEach(hintName => {
      const hintItem = document.createElement('span');
      hintItem.className = 'selected-hint-item';
      hintItem.textContent = hintName;
      selectedHintsContainer.appendChild(hintItem);
    });
  } else {
    selectedHintsContainer.textContent = 'ヒントが選択されていません';
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
  
  if (!text) {
    alert('テキストを入力してください');
    return;
  }
  
  if (selectedHints.length === 0) {
    alert('ヒントを選択してください');
    return;
  }
  
  const result = currentMode === 'decode' 
    ? decode(text, selectedHints)
    : encode(text, selectedHints);
  
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
  displaySelectedHints();
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}