import { getAllHints } from './hints';
import { encode } from './cipher';
import { Hint, HintGroup } from './types';

type Mode = 'encode' | 'pathfind';

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

let currentMode: Mode = 'encode';
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
const encodeModeElements = document.querySelectorAll('.encode-mode') as NodeListOf<HTMLElement>;
const pathfindModeElements = document.querySelectorAll('.pathfind-mode') as NodeListOf<HTMLElement>;

// グループ名の定義
const groupNames: Record<HintGroup, string> = {
  'A': 'なぞときでよく出てくる単語',
  'B': '日常的に使われるよく知られた単語',
  'C': '普段はあまり使わない単語',
  'D': '少し一般的な日本語と呼ぶには無理がある単語'
};

// ヒントチェックボックスを作成
function populateHints(): void {
  const hints = getAllHints();
  
  // グループごとにヒントを分類
  const hintsByGroup: Record<HintGroup, Hint[]> = {
    'A': [],
    'B': [],
    'C': [],
    'D': []
  };
  
  hints.forEach(hint => {
    hintsByGroup[hint.group].push(hint);
  });
  
  // 各グループのUIを作成
  (['A', 'B', 'C', 'D'] as HintGroup[]).forEach(group => {
    if (hintsByGroup[group].length === 0) return;
    
    const groupContainer = document.createElement('div');
    groupContainer.className = `hint-group group-${group} collapsed`;
    groupContainer.dataset.group = group;
    
    // グループヘッダー
    const groupHeader = document.createElement('div');
    groupHeader.className = 'hint-group-header';
    
    const groupCheckbox = document.createElement('input');
    groupCheckbox.type = 'checkbox';
    groupCheckbox.className = 'hint-group-checkbox';
    groupCheckbox.id = `group-${group}`;
    // グループAはデフォルトでチェック
    if (group === 'A') {
      groupCheckbox.checked = true;
    }
    groupCheckbox.addEventListener('click', (e) => handleGroupCheckbox(group, e));
    
    const groupTitle = document.createElement('div');
    groupTitle.className = 'hint-group-title';
    groupTitle.textContent = groupNames[group];
    
    const groupToggle = document.createElement('div');
    groupToggle.className = 'hint-group-toggle';
    groupToggle.textContent = '▼';
    
    groupHeader.appendChild(groupCheckbox);
    groupHeader.appendChild(groupTitle);
    groupHeader.appendChild(groupToggle);
    
    // クリックで展開/折りたたみ
    groupHeader.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') {
        groupContainer.classList.toggle('collapsed');
      }
    });
    
    // グループ内のヒント
    const groupItems = document.createElement('div');
    groupItems.className = 'hint-group-items';
    
    hintsByGroup[group].forEach(hint => {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'hint-checkbox';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `hint-${hint.name}`;
      checkbox.value = hint.name;
      // グループAのヒントはデフォルトでチェック
      if (group === 'A') {
        checkbox.checked = true;
      }
      checkbox.addEventListener('change', () => {
        updateSelectedHints();
        updateGroupCheckboxState(group);
      });
      
      const label = document.createElement('label');
      label.htmlFor = `hint-${hint.name}`;
      label.innerHTML = `${hint.name}<span class="hint-description">（${hint.description}）</span>`;
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      groupItems.appendChild(checkboxContainer);
    });
    
    groupContainer.appendChild(groupHeader);
    groupContainer.appendChild(groupItems);
    hintCheckboxesContainer.appendChild(groupContainer);
  });
  
  // グループAのヒントを初期選択状態に
  updateSelectedHints();
}

// グループチェックボックスのハンドラ
function handleGroupCheckbox(group: HintGroup, event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const groupContainer = document.querySelector(`.hint-group[data-group="${group}"]`);
  if (!groupContainer) return;
  
  const hintCheckboxes = groupContainer.querySelectorAll('.hint-group-items input[type="checkbox"]');
  
  let newState: boolean;
  
  // チェックボックスがクリックされた後の状態を考慮
  if (checkbox.classList.contains('partial')) {
    // 部分選択状態からクリック → 全て選択
    newState = true;
    checkbox.checked = true;
  } else {
    // 通常のチェックボックスの動作に従う
    newState = checkbox.checked;
  }
  
  // partialクラスを削除
  checkbox.classList.remove('partial');
  
  // 各ヒントのチェックボックスを更新
  hintCheckboxes.forEach(hintCheckbox => {
    (hintCheckbox as HTMLInputElement).checked = newState;
  });
  
  updateSelectedHints();
}

// グループチェックボックスの状態を更新
function updateGroupCheckboxState(group: HintGroup): void {
  const groupContainer = document.querySelector(`.hint-group[data-group="${group}"]`);
  if (!groupContainer) return;
  
  const groupCheckbox = groupContainer.querySelector('.hint-group-checkbox') as HTMLInputElement;
  const hintCheckboxes = groupContainer.querySelectorAll('.hint-group-items input[type="checkbox"]');
  
  const total = hintCheckboxes.length;
  const checked = Array.from(hintCheckboxes).filter(cb => (cb as HTMLInputElement).checked).length;
  
  groupCheckbox.classList.remove('partial');
  
  if (checked === 0) {
    groupCheckbox.checked = false;
  } else if (checked === total) {
    groupCheckbox.checked = true;
  } else {
    groupCheckbox.checked = false;
    groupCheckbox.classList.add('partial');
  }
}

// 選択されたヒントを更新
function updateSelectedHints(): void {
  selectedHints = [];
  const checkboxes = hintCheckboxesContainer.querySelectorAll('.hint-group-items input[type="checkbox"]:checked');
  
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
    encodeModeElements.forEach(el => el.style.display = 'none');
    pathfindModeElements.forEach(el => el.style.display = 'block');
    executeBtn.textContent = '経路を探す';
  } else {
    encodeModeElements.forEach(el => el.style.display = 'block');
    pathfindModeElements.forEach(el => el.style.display = 'none');
    executeBtn.textContent = '実行';
    inputText.placeholder = '答えを入力してください';
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

// エンコード実行
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
  
  const result = encode(text, selectedHints);
  
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
  pathfinderWorker!.postMessage({ type: 'init' });
  
  // Worker からのメッセージを処理
  pathfinderWorker.onmessage = (event) => {
    const result: WorkerResult = event.data;
    
    if (result.type === 'initialized') {
      // WASM initialization complete, now start the search
      console.log('WASM initialized, starting search with:', { start, target });
      pathfinderWorker!.postMessage({
        type: 'search',
        start: start,
        target: target,
        maxDepth: 30,
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
        progressText += `\n探索深度: ${result.maxDepthReached} / 最大: 30`;
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
      
      // Display TOP30 even when cancelled
      let html = '<div class="no-path-result">';
      html += '<div class="no-path">探索が中断されました。</div>';
      
      // ベスト30が存在する場合は表示
      if (result.bestAttempts && result.bestAttempts.length > 0) {
        html += '<div class="best-attempts">';
        html += '<h3>中断時点での最も近い状態（ベスト' + Math.min(result.bestAttempts.length, 30) + '）</h3>';
        html += '<p class="best-attempts-description">以下は探索中断時点で見つかった、目標文章に最も近い状態です：</p>';
        
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
  switchMode('encode');
  displaySelectedHints();
}

// DOMContentLoadedで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}