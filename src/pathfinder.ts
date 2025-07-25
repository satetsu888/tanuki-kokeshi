import { getAllHints } from './hints';
import { decode } from './cipher';

interface SearchState {
  text: string;
  path: string[];
  cost: number;
}

interface BestAttempt {
  text: string;
  path: string[];
  distance: number;
}

interface SearchResult {
  found: boolean;
  path?: string[];
  steps?: string[];
  bestAttempts?: BestAttempt[];
}

interface DFSState {
  text: string;
  path: string[];
  visited: Set<string>;
}

// 優先度付きキュー（簡易実装）
class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// ヒューリスティック関数：文字列の類似度を計算
function heuristic(current: string, target: string): number {
  // レーベンシュタイン距離（編集距離）
  const editDistance = levenshteinDistance(current, target);
  
  // Jaro-Winkler距離（0～1の値、1が完全一致）
  const jaroWinkler = jaroWinklerDistance(current, target);
  
  // 文字列長の差
  const lengthDiff = Math.abs(current.length - target.length);
  
  // 文字の出現頻度の差を計算
  const currentFreq = getCharFrequency(current);
  const targetFreq = getCharFrequency(target);
  
  let freqDiff = 0;
  const allChars = new Set([...Object.keys(currentFreq), ...Object.keys(targetFreq)]);
  
  for (const char of allChars) {
    const currentCount = currentFreq[char] || 0;
    const targetCount = targetFreq[char] || 0;
    freqDiff += Math.abs(currentCount - targetCount);
  }
  
  // ハイブリッドヒューリスティック値を計算
  // 編集距離を主要な指標とし、他の指標で調整
  const score = editDistance * 2.0 +                    // 編集距離（重み2.0）
                (1 - jaroWinkler) * 10.0 +              // Jaro-Winkler（重み10.0）
                lengthDiff * 0.5 +                      // 長さの差（重み0.5）
                freqDiff * 0.3;                         // 文字頻度差（重み0.3）
  
  return score;
}

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
  
  // 空文字列の場合
  if (m === 0) return n;
  if (n === 0) return m;
  
  // DPテーブルを作成
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // 初期化
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // 動的計画法で最小編集距離を計算
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 削除
          dp[i][j - 1] + 1,     // 挿入
          dp[i - 1][j - 1] + 1  // 置換
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
  
  // マッチングウィンドウの計算
  const matchWindow = Math.max(s1, s2) / 2 - 1;
  const matchWindowInt = Math.max(0, Math.floor(matchWindow));
  
  const s1Matches = new Array(s1).fill(false);
  const s2Matches = new Array(s2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // マッチング文字を探す
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
  
  // 転置をカウント
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
  
  // 共通接頭辞の長さを計算（最大4文字）
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

// A*アルゴリズムによる経路探索
export function findPath(start: string, target: string, maxDepth: number = 1000): SearchResult {
  if (start === target) {
    return { found: true, path: [], steps: [start] };
  }
  
  const hints = getAllHints();
  const visited = new Map<string, { text: string; path: string[]; distance: number }>();
  const queue = new PriorityQueue<SearchState>();
  
  // 初期状態
  queue.enqueue(
    { text: start, path: [], cost: 0 },
    heuristic(start, target)
  );
  
  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    if (!current) break;
    
    // 深さ制限
    if (current.path.length > maxDepth) {
      continue;
    }
    
    // 訪問済みチェック（同じテキストでもより短い経路なら更新）
    const existingState = visited.get(current.text);
    if (existingState && existingState.path.length <= current.path.length) {
      continue;
    }
    
    // 現在の状態を記録
    const distance = heuristic(current.text, target);
    visited.set(current.text, {
      text: current.text,
      path: current.path,
      distance
    });
    
    // ゴール判定
    if (current.text === target) {
      // 経路を再構築して中間ステップを生成
      const steps = [start];
      let tempText = start;
      for (const hintName of current.path) {
        const result = decode(tempText, [hintName]);
        if (result.success && result.result) {
          tempText = result.result;
          steps.push(tempText);
        }
      }
      
      return {
        found: true,
        path: current.path,
        steps
      };
    }
    
    // 各ヒントを適用して新しい状態を生成
    for (const hint of hints) {
      const result = decode(current.text, [hint.name]);
      
      if (result.success && result.result && result.result !== current.text) {
        const newPath = [...current.path, hint.name];
        const newCost = current.cost + 1;
        const priority = newCost + heuristic(result.result, target);
        
        queue.enqueue(
          {
            text: result.result,
            path: newPath,
            cost: newCost
          },
          priority
        );
      }
    }
  }
  
  // 経路が見つからなかった場合、最も近い状態のベスト30を返す
  const allStates = Array.from(visited.values());
  allStates.sort((a, b) => a.distance - b.distance);
  
  const bestAttempts: BestAttempt[] = allStates
    .slice(0, 30)
    .map(state => ({
      text: state.text,
      path: state.path,
      distance: state.distance
    }));
  
  return { found: false, bestAttempts };
}

// 深さ優先探索による経路探索
// A*とは異なり、一時的に目標から遠ざかる経路も探索可能
// より多様な経路を発見できるが、最適解の保証はない
export function findPathDFS(start: string, target: string, maxDepth: number = 20): SearchResult {
  if (start === target) {
    return { found: true, path: [], steps: [start] };
  }
  
  const hints = getAllHints();
  const allStates = new Map<string, { text: string; path: string[]; distance: number }>();
  const foundPaths: { path: string[]; steps: string[] }[] = [];
  
  // DFSの実装
  function dfs(state: DFSState, depth: number): void {
    if (depth > maxDepth) {
      return;
    }
    
    // 現在の状態を記録
    const distance = heuristic(state.text, target);
    const existingState = allStates.get(state.text);
    if (!existingState || existingState.path.length > state.path.length) {
      allStates.set(state.text, {
        text: state.text,
        path: [...state.path],
        distance
      });
    }
    
    // ゴール判定
    if (state.text === target) {
      const steps = reconstructPath(start, state.path);
      foundPaths.push({ path: [...state.path], steps });
      return;
    }
    
    // 各ヒントを適用して探索を続ける
    for (const hint of hints) {
      const result = decode(state.text, [hint.name]);
      
      if (result.success && result.result && !state.visited.has(result.result)) {
        const newVisited = new Set(state.visited);
        newVisited.add(result.result);
        
        const newState: DFSState = {
          text: result.result,
          path: [...state.path, hint.name],
          visited: newVisited
        };
        
        dfs(newState, depth + 1);
      }
    }
  }
  
  // 経路を再構築
  function reconstructPath(startText: string, path: string[]): string[] {
    const steps = [startText];
    let tempText = startText;
    for (const hintName of path) {
      const result = decode(tempText, [hintName]);
      if (result.success && result.result) {
        tempText = result.result;
        steps.push(tempText);
      }
    }
    return steps;
  }
  
  // 初期状態から探索開始
  const initialState: DFSState = {
    text: start,
    path: [],
    visited: new Set([start])
  };
  
  dfs(initialState, 0);
  
  // 最短経路を選択
  if (foundPaths.length > 0) {
    foundPaths.sort((a, b) => a.path.length - b.path.length);
    return {
      found: true,
      path: foundPaths[0].path,
      steps: foundPaths[0].steps
    };
  }
  
  // 経路が見つからなかった場合、最も近い状態のベスト30を返す
  const allStatesList = Array.from(allStates.values());
  allStatesList.sort((a, b) => a.distance - b.distance);
  
  const bestAttempts: BestAttempt[] = allStatesList
    .slice(0, 30)
    .map(state => ({
      text: state.text,
      path: state.path,
      distance: state.distance
    }));
  
  return { found: false, bestAttempts };
}

// 複数のヒントの組み合わせで変換可能かチェック
export function canTransform(start: string, target: string, maxDepth: number = 1000): boolean {
  const result = findPath(start, target, maxDepth);
  return result.found;
}