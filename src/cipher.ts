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
        // 逆操作: 文字を追加する（適切な位置に）
        const chars = result.split('');
        const insertPositions: number[] = [];
        
        // ランダムな位置に挿入（ここでは均等に分散）
        const insertCount = Math.floor(chars.length / 2) + 1;
        for (let j = 0; j < insertCount; j++) {
          const pos = Math.floor(j * chars.length / insertCount);
          insertPositions.push(pos);
        }
        
        // 逆順でソートして後ろから挿入
        insertPositions.sort((a, b) => b - a);
        insertPositions.forEach(pos => {
          chars.splice(pos + 1, 0, hint.operation.target);
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