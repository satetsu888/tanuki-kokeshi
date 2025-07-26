import { Hint } from './types';
import { removeHintsData } from './removeHints';
import { replaceHintsData } from './replaceHints';

// 文字列除去ヒントデータから動的にヒントを生成
function generateRemoveHints(): Record<string, Hint> {
  const generatedHints: Record<string, Hint> = {};
  
  for (const [removeChar, reading, name, operation, group] of removeHintsData) {
    const hint: Hint = {
      name: name,
      reading: reading,
      operation: {
        type: "remove",
        target: removeChar,
      },
      description: `「${removeChar}」を${operation}`,
      group: group,
    };

    generatedHints[name] = hint;
  }
  
  return generatedHints;
}

// 文字列置換ヒントデータから動的にヒントを生成
function generateReplaceHints(): Record<string, Hint> {
  const generatedHints: Record<string, Hint> = {};
  
  for (const [target, replacement, reading, name, description, group] of replaceHintsData) {
    const hint: Hint = {
      name: name,
      reading: reading,
      operation: {
        type: "replace",
        target: target,
        replacement: replacement,
      },
      description: description,
      group: group,
    };

    generatedHints[name] = hint;
  }
  
  return generatedHints;
}

// 全てのヒントを結合（除去ヒントと置換ヒント）
const allHints = {
  ...generateRemoveHints(),
  ...generateReplaceHints()
};

export function getHint(hintName: string): Hint | undefined {
  return allHints[hintName];
}

export function getAllHints(): Hint[] {
  return Object.values(allHints);
}