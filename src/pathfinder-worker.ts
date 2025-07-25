// Web Worker用のpathfinder実装

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

// 優先度付きキューの実装
class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];
  
  enqueue(element: T, priority: number): void {
    const queueElement = { element, priority };
    let added = false;
    
    // 優先度順に挿入
    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority < this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }
    
    if (!added) {
      this.items.push(queueElement);
    }
  }
  
  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  get length(): number {
    return this.items.length;
  }
}

interface BestAttempt {
  text: string;
  path: string[];
  distance: number;
}

interface WorkerMessage {
  type: 'search' | 'cancel';
  start?: string;
  target?: string;
  maxDepth?: number;
  hints?: Hint[];
}

interface WorkerResult {
  type: 'result' | 'progress' | 'cancelled';
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

// グローバル変数で中断フラグを管理
let cancelled = false;

// 文字の出現頻度を計算
function getCharFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

// レーベンシュタイン距離（編集距離）を計算
function levenshteinDistance(str1: string, str2: string): number {
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

// Jaro距離を計算
function jaroDistance(str1: string, str2: string): number {
  const s1 = str1.length;
  const s2 = str2.length;
  
  if (s1 === 0 && s2 === 0) return 1;
  if (s1 === 0 || s2 === 0) return 0;
  
  const matchWindow = Math.max(s1, s2) / 2 - 1;
  const matchWindowInt = Math.max(0, Math.floor(matchWindow));
  
  const s1Matches = new Array(s1).fill(false);
  const s2Matches = new Array(s2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < s1; i++) {
    const start = Math.max(0, i - matchWindowInt);
    const end = Math.min(i + matchWindowInt + 1, s2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || str1[i] !== str2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  let k = 0;
  for (let i = 0; i < s1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (matches / s1 + matches / s2 + (matches - transpositions / 2) / matches) / 3;
}

// Jaro-Winkler距離を計算
function jaroWinklerDistance(str1: string, str2: string, p: number = 0.1): number {
  const jaro = jaroDistance(str1, str2);
  
  if (jaro < 0.7) return jaro;
  
  let prefix = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) {
      prefix++;
    } else {
      break;
    }
  }
  
  return jaro + prefix * p * (1 - jaro);
}

// ヒューリスティック関数
function heuristic(current: string, target: string): number {
  const editDistance = levenshteinDistance(current, target);
  // const jaroWinkler = jaroWinklerDistance(current, target);
  const lengthDiff = Math.abs(current.length - target.length);
  
  const currentFreq = getCharFrequency(current);
  const targetFreq = getCharFrequency(target);
  
  let freqDiff = 0;
  const allChars = new Set([...Object.keys(currentFreq), ...Object.keys(targetFreq)]);
  
  for (const char of allChars) {
    const currentCount = currentFreq[char] || 0;
    const targetCount = targetFreq[char] || 0;
    freqDiff += Math.abs(currentCount - targetCount);
  }
  
  const score = editDistance * 2.0 + 
  //              (1 - jaroWinkler) * 10.0 + 
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
        if (hint.operation.replacement) {
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

// 距離優先探索による経路探索（ジェネレータ版）
async function findPathDFS(start: string, target: string, hints: Hint[], maxDepth: number = 20): Promise<WorkerResult> {
  if (start === target) {
    return { type: 'result', found: true, path: [], steps: [start] };
  }
  
  const allStates = new Map<string, { text: string; path: string[]; distance: number }>();
  let foundPath: { path: string[]; steps: string[] } | null = null;
  let totalChecked = 0;
  
  // ジェネレータ関数を使用して探索を実装
  function* dfsGenerator(): Generator<DFSState | null, void, unknown> {
    const queue = new PriorityQueue<DFSState>();
    const initialState: DFSState = {
      text: start,
      path: [],
      visited: new Set([start])
    };
    queue.enqueue(initialState, 0);
    
    while (!queue.isEmpty() && !foundPath) {
      const state = queue.dequeue();
      if (!state) continue;
      
      // 中断チェックのためにnullを返す
      if (totalChecked % 10 === 0) {
        yield null;
      }
      
      if (state.path.length > maxDepth) {
        continue;
      }
      
      totalChecked++;
      
      const distance = heuristic(state.text, target);
      const existingState = allStates.get(state.text);
      if (!existingState || existingState.path.length > state.path.length) {
        allStates.set(state.text, {
          text: state.text,
          path: [...state.path],
          distance
        });
      }
      
      if (state.text === target) {
        const steps = reconstructPath(start, state.path, hints);
        foundPath = { path: [...state.path], steps };
        return; // 完全一致を見つけたらジェネレータを終了
      }
      
      // ヒントを適用して新しい状態を生成
      for (const hint of hints) {
        // 枝刈り: ヒントの対象文字が現在のテキストに含まれていなければスキップ
        if (!state.text.includes(hint.operation.target)) {
          continue;
        }
        
        const result = decode(state.text, hints, [hint.name]);
        
        if (result.success && result.result && !state.visited.has(result.result)) {
          const newVisited = new Set(state.visited);
          newVisited.add(result.result);
          
          const newState: DFSState = {
            text: result.result,
            path: [...state.path, hint.name],
            visited: newVisited
          };
          
          // 新しい状態の距離を計算して優先度付きキューに追加
          const priority = heuristic(result.result, target);
          queue.enqueue(newState, priority);
        }
      }
      
      yield state;
    }
  }
  
  function reconstructPath(startText: string, path: string[], hints: Hint[]): string[] {
    const steps = [startText];
    let tempText = startText;
    for (const hintName of path) {
      const result = decode(tempText, hints, [hintName]);
      if (result.success && result.result) {
        tempText = result.result;
        steps.push(tempText);
      }
    }
    return steps;
  }
  
  // ジェネレータを実行
  const generator = dfsGenerator();
  let lastProgressUpdate = Date.now();
  
  while (true) {
    if (cancelled) {
      return { type: 'cancelled' };
    }
    
    const { done } = generator.next();
    if (done) break;
    
    // 完全一致が見つかったらすぐに返す
    const currentFoundPath = foundPath;
    if (currentFoundPath !== null) {
      return {
        type: 'result',
        found: true,
        path: currentFoundPath.path,
        steps: currentFoundPath.steps
      };
    }
    
    // 進捗を報告（100ms毎）
    const now = Date.now();
    if (now - lastProgressUpdate > 100) {
      // 現在の最良結果を取得
      const allStatesList = Array.from(allStates.values());
      let currentBest;
      if (allStatesList.length > 0) {
        allStatesList.sort((a, b) => a.distance - b.distance);
        const best = allStatesList[0];
        currentBest = {
          text: best.text,
          distance: best.distance,
          path: best.path
        };
      }
      
      self.postMessage({
        type: 'progress',
        progress: totalChecked,
        currentBest
      } as WorkerResult);
      lastProgressUpdate = now;
      
      // 非同期的に制御を譲る
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  if (cancelled) {
    return { type: 'cancelled' };
  }
  
  const finalFoundPath = foundPath;
  if (finalFoundPath !== null) {
    return {
      type: 'result',
      found: true,
      path: finalFoundPath.path,
      steps: finalFoundPath.steps
    };
  }
  
  const allStatesList = Array.from(allStates.values());
  allStatesList.sort((a, b) => a.distance - b.distance);
  
  const bestAttempts: BestAttempt[] = allStatesList
    .slice(0, 30)
    .map(state => ({
      text: state.text,
      path: state.path,
      distance: state.distance
    }));
  
  return { type: 'result', found: false, bestAttempts };
}

// Worker のメッセージハンドラ
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  if (message.type === 'cancel') {
    cancelled = true;
    return;
  }
  
  if (message.type === 'search') {
    cancelled = false;
    const { start, target, maxDepth, hints } = message;
    
    if (!start || !target || !hints) {
      self.postMessage({ type: 'result', found: false, error: '必要なパラメータが不足しています' });
      return;
    }
    
    const result = await findPathDFS(start, target, hints, maxDepth);
    self.postMessage(result);
  }
});