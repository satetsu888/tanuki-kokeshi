import { getAllHints } from './hints';
import { decode, encode } from './cipher';

type Mode = 'decode' | 'encode' | 'pathfind';

interface BestAttempt {
  text: string;
  path: string[];
  distance: number;
}

interface WorkerResult {
  type: 'result' | 'progress' | 'cancelled' | 'initialized';
  found?: boolean;
  path?: string[];
  steps?: string[];
  bestAttempts?: BestAttempt[];
  progress?: number;
  progressPercentage?: number;
  estimatedTotal?: number;
  depthProgress?: number;
  maxDepthReached?: number;
  currentBest?: {
    text: string;
    distance: number;
    path: string[];
  };
}

let currentMode: Mode = 'decode';
let selectedHints: string[] = [];
let pathfinderWorker: Worker | null = null;

const inputText = document.getElementById('input-text') as HTMLInputElement;
const startText = document.getElementById('start-text') as HTMLInputElement;
const targetText = document.getElementById('target-text') as HTMLInputElement;
const hintCheckboxesContainer = document.getElementById('hint-checkboxes') as HTMLDivElement;
const selectedHintsContainer = document.getElementById('selected-hints') as HTMLDivElement;
const executeBtn = document.getElementById('execute-btn') as HTMLButtonElement;
const resultSection = document.getElementById('result-section') as HTMLDivElement;
const resultContent = document.getElementById('result-content') as HTMLDivElement;
const loadingSection = document.getElementById('loading-section') as HTMLDivElement;
const loadingProgress = document.getElementById('loading-progress') as HTMLParagraphElement;
const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;
const progressPercentage = document.getElementById('progress-percentage') as HTMLSpanElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const modeRadios = document.querySelectorAll('input[name="mode"]') as NodeListOf<HTMLInputElement>;
const decodeLabel = document.querySelector('.decode-label') as HTMLSpanElement;
const encodeLabel = document.querySelector('.encode-label') as HTMLSpanElement;
const decodeEncodeModeElements = document.querySelectorAll('.decode-encode-mode') as NodeListOf<HTMLElement>;
const pathfindModeElements = document.querySelectorAll('.pathfind-mode') as NodeListOf<HTMLElement>;

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
  
  // UI要素の表示/非表示を切り替え
  if (mode === 'pathfind') {
    decodeEncodeModeElements.forEach(el => el.style.display = 'none');
    pathfindModeElements.forEach(el => el.style.display = 'block');
    executeBtn.textContent = '経路を探す';
  } else {
    decodeEncodeModeElements.forEach(el => el.style.display = 'block');
    pathfindModeElements.forEach(el => el.style.display = 'none');
    executeBtn.textContent = '実行';
    
    if (mode === 'decode') {
      decodeLabel.style.display = 'inline';
      encodeLabel.style.display = 'none';
      inputText.placeholder = '問題を入力してください';
    } else {
      decodeLabel.style.display = 'none';
      encodeLabel.style.display = 'inline';
      inputText.placeholder = '答えを入力してください';
    }
  }
  
  // 結果とローディングをクリア
  resultSection.style.display = 'none';
  loadingSection.style.display = 'none';
  resultContent.textContent = '';
}

// 実行処理
function execute(): void {
  if (currentMode === 'pathfind') {
    executePathfind();
  } else {
    executeDecodeEncode();
  }
}

// デコード/エンコード実行
function executeDecodeEncode(): void {
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

// 経路探索実行
function executePathfind(): void {
  const start = startText.value.trim();
  const target = targetText.value.trim();
  
  if (!start || !target) {
    alert('開始文章と目標文章を両方入力してください');
    return;
  }
  
  // ローディング表示を開始
  loadingSection.style.display = 'block';
  resultSection.style.display = 'none';
  executeBtn.disabled = true;
  loadingProgress.textContent = '';
  
  // Reset progress bar
  progressBarFill.style.width = '0%';
  progressPercentage.textContent = '0%';
  
  // Web Worker を作成
  if (pathfinderWorker) {
    pathfinderWorker.terminate();
  }
  
  pathfinderWorker = new Worker(new URL('./pathfinder-worker-engine.ts', import.meta.url), { type: 'module' });
  
  // Initialize WASM in the worker
  pathfinderWorker.postMessage({ type: 'init' });
  
  // Worker からのメッセージを処理
  pathfinderWorker.onmessage = (event) => {
    const result: WorkerResult = event.data;
    
    if (result.type === 'initialized') {
      // WASM initialization complete, now start the search
      console.log('WASM initialized, starting search with:', { start, target });
      pathfinderWorker.postMessage({
        type: 'search',
        start: start,
        target: target,
        maxDepth: 20,
        hints: getAllHints()
      });
      return;
    }
    
    if (result.type === 'progress' && result.progress) {
      let progressText = `検索済み: ${result.progress.toLocaleString()} 状態`;
      if (result.estimatedTotal) {
        progressText += ` / 推定総数: ${result.estimatedTotal.toLocaleString()}`;
      }
      if (result.maxDepthReached !== undefined) {
        progressText += `\n探索深度: ${result.maxDepthReached} / 最大: 20`;
      }
      if (result.currentBest) {
        progressText += `\n現在の最短距離: ${result.currentBest.distance.toFixed(2)}`;
        progressText += `\n最良結果: ${result.currentBest.text}`;
      }
      loadingProgress.innerHTML = progressText.replace(/\n/g, '<br>');
      
      // Update progress bar - use the better of the two progress metrics
      if (result.progressPercentage !== undefined || result.depthProgress !== undefined) {
        // Use whichever progress is higher to give a more accurate view
        const stateProgress = result.progressPercentage || 0;
        const depthProgress = result.depthProgress || 0;
        const percentage = Math.min(100, Math.max(0, Math.max(stateProgress, depthProgress)));
        progressBarFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage.toFixed(1)}%`;
      }
      
      return;
    }
    
    if (result.type === 'cancelled') {
      loadingSection.style.display = 'none';
      executeBtn.disabled = false;
      alert('探索が中断されました');
      return;
    }
    
    // ローディング表示を終了
    loadingSection.style.display = 'none';
    executeBtn.disabled = false;
  
    if (result.found && result.path && result.steps) {
      let html = '<div class="pathfind-result">';
      html += `<h3>発見した経路（${result.path.length}ステップ）</h3>`;
      
      // ヒントの順序を表示
      html += '<div class="hint-sequence">';
      html += '<strong>使用するヒント：</strong> ';
      html += result.path.map(hint => `<span class="hint-badge">${hint}</span>`).join(' → ');
      html += '</div>';
      
      // 変換過程を表示
      html += '<div class="transformation-steps">';
      html += '<strong>変換過程：</strong>';
      html += '<ol>';
      for (let i = 0; i < result.steps.length; i++) {
        html += `<li>${result.steps[i]}`;
        if (i < result.path.length) {
          html += ` <span class="step-hint">（${result.path[i]}を適用）</span>`;
        }
        html += '</li>';
      }
      html += '</ol>';
      html += '</div>';
      
      html += '</div>';
      
      resultContent.innerHTML = html;
      resultSection.style.display = 'block';
    } else {
      let html = '<div class="no-path-result">';
      html += '<div class="no-path">完全な経路は見つかりませんでした。</div>';
      
      // ベスト30が存在する場合は表示
      if (result.bestAttempts && result.bestAttempts.length > 0) {
        html += '<div class="best-attempts">';
        html += '<h3>目標に最も近い状態（ベスト30）</h3>';
        html += '<p class="best-attempts-description">以下は探索中に見つかった、目標文章に最も近い状態です：</p>';
        
        html += '<ol class="best-attempts-list">';
        for (const attempt of result.bestAttempts) {
          html += '<li class="best-attempt-item">';
          html += `<div class="attempt-text">${attempt.text}</div>`;
          html += `<div class="attempt-info">`;
          html += `<span class="attempt-distance">距離: ${attempt.distance.toFixed(2)}</span>`;
          html += `<span class="attempt-steps">ステップ数: ${attempt.path.length}</span>`;
          html += `</div>`;
          
          if (attempt.path.length > 0) {
            html += `<div class="attempt-path">`;
            html += `使用したヒント: ${attempt.path.map(h => `<span class="hint-badge-small">${h}</span>`).join(' → ')}`;
            html += `</div>`;
          }
          
          html += '</li>';
        }
        html += '</ol>';
        html += '</div>';
      }
      
      html += '</div>';
      
      resultContent.innerHTML = html;
      resultSection.style.display = 'block';
    }
  };
  
  // エラーハンドリング
  pathfinderWorker.onerror = (error) => {
    loadingSection.style.display = 'none';
    executeBtn.disabled = false;
    alert('経路探索中にエラーが発生しました');
    console.error(error);
  };
  
  // Search message is now sent after WASM initialization in the onmessage handler
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
  
  // 中断ボタン
  cancelBtn.addEventListener('click', () => {
    if (pathfinderWorker) {
      pathfinderWorker.postMessage({ type: 'cancel' });
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