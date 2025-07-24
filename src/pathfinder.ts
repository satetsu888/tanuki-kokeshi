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
  
  // 共通接頭辞の長さ
  let commonPrefix = 0;
  for (let i = 0; i < Math.min(current.length, target.length); i++) {
    if (current[i] === target[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }
  
  // ヒューリスティック値を計算（小さいほど良い）
  return lengthDiff * 2 + freqDiff - commonPrefix * 0.5;
}

// 文字の出現頻度を計算
function getCharFrequency(text: string): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

// A*アルゴリズムによる経路探索
export function findPath(start: string, target: string, maxDepth: number = 10): SearchResult {
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
  
  // 経路が見つからなかった場合、最も近い状態のベスト5を返す
  const allStates = Array.from(visited.values());
  allStates.sort((a, b) => a.distance - b.distance);
  
  const bestAttempts: BestAttempt[] = allStates
    .slice(0, 5)
    .map(state => ({
      text: state.text,
      path: state.path,
      distance: state.distance
    }));
  
  return { found: false, bestAttempts };
}

// 複数のヒントの組み合わせで変換可能かチェック
export function canTransform(start: string, target: string, maxDepth: number = 10): boolean {
  const result = findPath(start, target, maxDepth);
  return result.found;
}