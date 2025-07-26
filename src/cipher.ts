import { CipherResult } from './types';
import { getHint } from './hints';

export function encode(answer: string, hintNames: string[]): CipherResult {
  if (hintNames.length === 0) {
    return {
      success: false,
      error: 'ヒントを選択してください'
    };
  }

  let result = answer;

  // 複数のヒントを逆順に適用（エンコードは逆順で処理）
  for (let i = hintNames.length - 1; i >= 0; i--) {
    const hintName = hintNames[i];
    const hint = getHint(hintName);
    
    if (!hint) {
      return {
        success: false,
        error: `ヒント「${hintName}」が見つかりません`
      };
    }

    switch (hint.operation.type) {
      case 'remove':
        // 逆操作: 文字を追加する（1~3箇所にランダムに）
        const chars = result.split('');
        const insertCount = Math.floor(Math.random() * 3) + 1; // 1~3個
        const positions = new Set<number>();
        
        // ランダムな位置を選択（重複なし）
        while (positions.size < insertCount) {
          // 文字の間の位置（0 ~ chars.length）を選択
          const pos = Math.floor(Math.random() * (chars.length + 1));
          positions.add(pos);
        }
        
        // 逆順でソートして後ろから挿入
        const sortedPositions = Array.from(positions).sort((a, b) => b - a);
        sortedPositions.forEach(pos => {
          chars.splice(pos, 0, hint.operation.target);
        });
        
        result = chars.join('');
        break;
        
      case 'replace':
        // 逆操作: replacementをtargetに置き換える
        if (hint.operation.replacement) {
          result = result.split(hint.operation.replacement).join(hint.operation.target);
        }
        break;
    }
  }

  return {
    success: true,
    result
  };
}