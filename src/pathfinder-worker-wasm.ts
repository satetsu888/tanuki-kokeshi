// Web Worker用のpathfinder実装（WASM最適化版）

import init, { PathfinderOptimizer, PriorityQueue as WasmPriorityQueue } from './wasm-pathfinder/tanuki_pathfinder.js';

// 必要な型定義
interface HintOperation {
  type: 'remove' | 'replace';
  target: string;
  replacement?: string;
}

interface Hint {
  name: string;
  reading: string;
  operation: HintOperation;
  description: string;
}

interface CipherResult {
  success: boolean;
  result?: string;
  error?: string;
}

interface DFSState {
  text: string;
  path: string[];
  visited: Set<string>;
}

// Serializable version of DFSState for JSON
interface SerializableDFSState {
  text: string;
  path: string[];
  visited: string[];
}

interface BestAttempt {
  text: string;
  path: string[];
  distance: number;
}

interface WorkerMessage {
  type: 'search' | 'cancel' | 'init';
  start?: string;
  target?: string;
  maxDepth?: number;
  hints?: Hint[];
}

interface WorkerResult {
  type: 'result' | 'progress' | 'cancelled' | 'initialized';
  found?: boolean;
  path?: string[];
  steps?: string[];
  bestAttempts?: BestAttempt[];
  progress?: number;
  currentBest?: {
    text: string;
    distance: number;
    path: string[];
  };
}

// グローバル変数
let cancelled = false;
let wasmOptimizer: PathfinderOptimizer | null = null;
let wasmInitialized = false;

// WASMの初期化
async function initializeWasm() {
  if (wasmInitialized) return;
  
  await init();
  wasmOptimizer = new PathfinderOptimizer(1000); // 最大文字列長1000
  wasmInitialized = true;
}

// レーベンシュタイン距離（フォールバック用）
function levenshteinDistanceFallback(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}

// 文字の出現頻度を計算（フォールバック用）
function getCharFrequencyFallback(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

// ヒューリスティック関数（WASM最適化版）
function heuristic(current: string, target: string): number {
  let editDistance: number;
  let freqDiff: number;
  
  if (wasmOptimizer) {
    editDistance = wasmOptimizer.levenshtein_distance(current, target);
    freqDiff = wasmOptimizer.char_frequency_distance(current, target);
  } else {
    editDistance = levenshteinDistanceFallback(current, target);
    
    const currentFreq = getCharFrequencyFallback(current);
    const targetFreq = getCharFrequencyFallback(target);
    
    freqDiff = 0;
    const allChars = new Set([...Object.keys(currentFreq), ...Object.keys(targetFreq)]);
    
    for (const char of allChars) {
      const currentCount = currentFreq[char] || 0;
      const targetCount = targetFreq[char] || 0;
      freqDiff += Math.abs(currentCount - targetCount);
    }
  }
  
  const lengthDiff = Math.abs(current.length - target.length);
  
  const score = editDistance * 2.0 + 
                lengthDiff * 0.5 + 
                freqDiff * 0.3;
  
  return score;
}

// デコード関数（簡易版）
function decode(text: string, hints: Hint[], hintNames: string[]): CipherResult {
  if (hintNames.length === 0) {
    return {
      success: false,
      error: 'ヒントを選択してください'
    };
  }

  let result = text;

  for (const hintName of hintNames) {
    const hint = hints.find(h => h.name === hintName);
    
    if (!hint) {
      return {
        success: false,
        error: `ヒント「${hintName}」が見つかりません`
      };
    }

    switch (hint.operation.type) {
      case 'remove':
        result = result.split(hint.operation.target).join('');
        break;
      case 'replace':
        if (hint.operation.replacement !== undefined) {
          result = result.split(hint.operation.target).join(hint.operation.replacement);
        }
        break;
    }
  }

  return {
    success: true,
    result
  };
}

// DFSベースの経路探索（優先度付きキュー使用）
async function findPathDFS(
  start: string,
  target: string,
  hints: Hint[],
  maxDepth: number = 10
): Promise<WorkerResult> {
  // Check if start and target are the same
  if (start === target) {
    console.log('Start and target are identical:', start);
    return { type: 'result', found: true, path: [], steps: [start], bestAttempts: [] };
  }
  
  const queue = wasmOptimizer ? new WasmPriorityQueue() : null;
  const fallbackQueue: { element: DFSState; priority: number }[] = [];
  
  const initialState: DFSState = {
    text: start,
    path: [],
    visited: new Set([start])
  };
  
  if (queue) {
    const serializable: SerializableDFSState = {
      text: initialState.text,
      path: initialState.path,
      visited: Array.from(initialState.visited)
    };
    queue.push(0, JSON.stringify(serializable));
  } else {
    fallbackQueue.push({ element: initialState, priority: 0 });
  }
  
  const bestAttempts: BestAttempt[] = [];
  let iterationCount = 0;
  let totalChecked = 0;
  let lastProgressUpdate = Date.now();
  let bestDistance = levenshteinDistanceFallback(start, target);
  
  let bestAttempt: BestAttempt = {
    text: start,
    path: [],
    distance: bestDistance
  };
  
  const updateBestAttempts = (text: string, path: string[], distance: number) => {
    const existingIndex = bestAttempts.findIndex(a => a.text === text);
    
    if (existingIndex >= 0) {
      if (path.length < bestAttempts[existingIndex].path.length) {
        bestAttempts[existingIndex] = { text, path, distance };
      }
    } else {
      bestAttempts.push({ text, path, distance });
      bestAttempts.sort((a, b) => a.distance - b.distance);
      if (bestAttempts.length > 30) {
        bestAttempts.pop();
      }
    }
  };
  
  while (queue ? !queue.is_empty() : fallbackQueue.length > 0) {
    if (cancelled) {
      return {
        type: 'cancelled',
        bestAttempts
      };
    }
    
    let current: DFSState;
    
    if (queue) {
      const stateJson = queue.pop();
      if (!stateJson) break;
      const serialized: SerializableDFSState = JSON.parse(stateJson);
      current = {
        text: serialized.text,
        path: serialized.path,
        visited: new Set(serialized.visited)
      };
    } else {
      fallbackQueue.sort((a, b) => a.priority - b.priority);
      const item = fallbackQueue.shift();
      if (!item) break;
      current = item.element;
    }
    
    if (current.text === target) {
      return {
        type: 'result',
        found: true,
        path: current.path,
        steps: [start, ...current.path.map((hintName, index) => {
          const pathSoFar = current.path.slice(0, index + 1);
          const result = decode(start, hints, pathSoFar);
          return result.result || '';
        })],
        bestAttempts
      };
    }
    
    const currentDistance = wasmOptimizer 
      ? wasmOptimizer.levenshtein_distance(current.text, target)
      : levenshteinDistanceFallback(current.text, target);
    
    // Always update best attempts, not just when distance improves
    updateBestAttempts(current.text, current.path, currentDistance);
    
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      bestAttempt = {
        text: current.text,
        path: [...current.path],
        distance: currentDistance
      };
    }
    
    iterationCount++;
    totalChecked++;
    
    // Time-based progress updates (every 100ms)
    const now = Date.now();
    if (now - lastProgressUpdate > 100) {
      self.postMessage({
        type: 'progress',
        progress: totalChecked,
        currentBest: {
          text: bestAttempt.text,
          distance: bestAttempt.distance,
          path: bestAttempt.path
        }
      });
      lastProgressUpdate = now;
      
      // Async yield to allow cancel messages to be processed
      await new Promise(resolve => setTimeout(resolve, 0));
    } else if (iterationCount % 50 === 0) {
      // Also yield periodically even without progress update to check for cancellation
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    if (current.path.length >= maxDepth) {
      continue;
    }
    
    const neighbors: { text: string; hintName: string }[] = [];
    
    for (const hint of hints) {
      const result = decode(current.text, hints, [hint.name]);
      if (result.success && result.result && !current.visited.has(result.result)) {
        neighbors.push({
          text: result.result,
          hintName: hint.name
        });
      }
    }
    
    for (let i = 0; i < hints.length - 1; i++) {
      if (cancelled) break;
      for (let j = i + 1; j < hints.length; j++) {
        const result = decode(current.text, hints, [hints[i].name, hints[j].name]);
        if (result.success && result.result && !current.visited.has(result.result)) {
          neighbors.push({
            text: result.result,
            hintName: `${hints[i].name}→${hints[j].name}`
          });
        }
      }
    }
    
    for (const neighbor of neighbors) {
      if (cancelled) break;
      
      const newState: DFSState = {
        text: neighbor.text,
        path: [...current.path, neighbor.hintName],
        visited: new Set([...current.visited, neighbor.text])
      };
      
      const priority = heuristic(neighbor.text, target);
      
      if (queue) {
        const serializable: SerializableDFSState = {
          text: newState.text,
          path: newState.path,
          visited: Array.from(newState.visited)
        };
        queue.push(Math.floor(priority * 1000), JSON.stringify(serializable));
      } else {
        fallbackQueue.push({ element: newState, priority });
      }
    }
  }
  
  return {
    type: 'result',
    found: false,
    bestAttempts
  };
}

// メッセージハンドラ
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;
  
  if (type === 'init') {
    console.log('Initializing WASM...');
    try {
      await initializeWasm();
      console.log('WASM initialized successfully');
      self.postMessage({ type: 'initialized' });
    } catch (error) {
      console.error('Failed to initialize WASM:', error);
      self.postMessage({ type: 'initialized' });
    }
    return;
  }
  
  if (type === 'cancel') {
    cancelled = true;
    return;
  }
  
  if (type === 'search') {
    cancelled = false;
    const { start, target, maxDepth, hints } = event.data;
    
    console.log('Search request received:', { start, target, maxDepth, hintsCount: hints?.length });
    
    if (!start || !target || !hints) {
      console.error('Missing required search parameters');
      return;
    }
    
    const result = await findPathDFS(start, target, hints, maxDepth);
    console.log('Search result:', result);
    self.postMessage(result);
  }
});