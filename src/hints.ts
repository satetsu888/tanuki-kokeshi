import { Hint } from './types';
import { removeHintsData } from './removeHints';

export const hints: Record<string, Hint> = {
  'はみがき': {
    name: 'はみがき',
    reading: 'はみがき',
    operation: {
      type: 'replace',
      target: 'はみ',
      replacement: 'き'
    },
    description: '「はみ」を「き」に置き換える'
  },
  
  // ◯が△シリーズ
  'うがい': {
    name: 'うがい',
    reading: 'うがい',
    operation: {
      type: 'replace',
      target: 'う',
      replacement: 'い'
    },
    description: '「う」が「い」'
  },
  'えがお': {
    name: 'えがお',
    reading: 'えがお',
    operation: {
      type: 'replace',
      target: 'え',
      replacement: 'お'
    },
    description: '「え」が「お」'
  },
  'おんがく': {
    name: 'おんがく',
    reading: 'おんがく',
    operation: {
      type: 'replace',
      target: 'おん',
      replacement: 'く'
    },
    description: '「おん」が「く」'
  },
  'かがみ': {
    name: 'かがみ',
    reading: 'かがみ',
    operation: {
      type: 'replace',
      target: 'か',
      replacement: 'み'
    },
    description: '「か」が「み」'
  },
  'きがえ': {
    name: 'きがえ',
    reading: 'きがえ',
    operation: {
      type: 'replace',
      target: 'き',
      replacement: 'え'
    },
    description: '「き」が「え」'
  },
  'てがみ': {
    name: 'てがみ',
    reading: 'てがみ',
    operation: {
      type: 'replace',
      target: 'て',
      replacement: 'み'
    },
    description: '「て」が「み」'
  },
  'えてがみ': {
    name: 'えてがみ',
    reading: 'えてがみ',
    operation: {
      type: 'replace',
      target: 'えて',
      replacement: 'み'
    },
    description: '「えて」が「み」'
  },
  'はがき': {
    name: 'はがき',
    reading: 'はがき',
    operation: {
      type: 'replace',
      target: 'は',
      replacement: 'き'
    },
    description: '「は」が「き」'
  },
  'えはがき': {
    name: 'えはがき',
    reading: 'えはがき',
    operation: {
      type: 'replace',
      target: 'えは',
      replacement: 'き'
    },
    description: '「えは」が「き」'
  },
  'おりがみ': {
    name: 'おりがみ',
    reading: 'おりがみ',
    operation: {
      type: 'replace',
      target: 'おり',
      replacement: 'み'
    },
    description: '「おり」が「み」'
  },
  'ふがし': {
    name: 'ふがし',
    reading: 'ふがし',
    operation: {
      type: 'replace',
      target: 'ふ',
      replacement: 'し'
    },
    description: '「ふ」が「し」'
  },
  'じゃがいも': {
    name: 'じゃがいも',
    reading: 'じゃがいも',
    operation: {
      type: 'replace',
      target: 'じゃ',
      replacement: 'いも'
    },
    description: '「じゃ」が「いも」'
  },
  'はんがく': {
    name: 'はんがく',
    reading: 'はんがく',
    operation: {
      type: 'replace',
      target: 'はん',
      replacement: 'く'
    },
    description: '「はん」が「く」'
  }
};


// 文字列除去ヒントデータから動的にヒントを生成
function generateRemoveHints(): Record<string, Hint> {
  const generatedHints: Record<string, Hint> = {};
  
  for (const [removeChar, reading, name, operation] of removeHintsData) {
    const hint: Hint = {
      name: name,
      reading: reading,
      operation: {
        type: "remove",
        target: removeChar,
      },
      description: `「${removeChar}」を${operation}`,
    };

    generatedHints[name] = hint;
  }
  
  return generatedHints;
}

// 既存のヒント（置換操作）と除去ヒントを結合
const allHints = {
  ...hints,
  ...generateRemoveHints()
};

export function getHint(hintName: string): Hint | undefined {
  return allHints[hintName];
}

export function getAllHints(): Hint[] {
  return Object.values(allHints);
}