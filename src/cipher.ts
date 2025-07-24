import { CipherResult } from './types';
import { getHint } from './hints';

export function decode(puzzle: string, hintName: string): CipherResult {
  const hint = getHint(hintName);
  
  if (!hint) {
    return {
      success: false,
      error: `ヒント「${hintName}」が見つかりません`
    };
  }

  let result = puzzle;

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

  return {
    success: true,
    result
  };
}

export function encode(answer: string, hintName: string): CipherResult {
  const hint = getHint(hintName);
  
  if (!hint) {
    return {
      success: false,
      error: `ヒント「${hintName}」が見つかりません`
    };
  }

  let result = answer;

  switch (hint.operation.type) {
    case 'remove':
      // 逆操作: 文字を追加する（適切な位置に）
      // この実装では、単純に各文字の後に追加する
      const chars = result.split('');
      const insertPositions: number[] = [];
      
      // ランダムな位置に挿入（ここでは均等に分散）
      const insertCount = Math.floor(chars.length / 2) + 1;
      for (let i = 0; i < insertCount; i++) {
        const pos = Math.floor(i * chars.length / insertCount);
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

  return {
    success: true,
    result
  };
}