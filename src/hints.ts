import { Hint } from './types';

export const hints: Record<string, Hint> = {
  'たぬき': {
    name: 'たぬき',
    reading: 'たぬき',
    operation: {
      type: 'remove',
      target: 'た'
    },
    description: '「た」を抜く'
  },
  'おはなし': {
    name: 'おはなし',
    reading: 'おはなし',
    operation: {
      type: 'remove',
      target: 'お'
    },
    description: '「お」は無し'
  },
  'とりい': {
    name: 'とりい',
    reading: 'とりい',
    operation: {
      type: 'remove',
      target: 'い'
    },
    description: '取り「い」'
  },
  'まぬけ': {
    name: 'まぬけ',
    reading: 'まぬけ',
    operation: {
      type: 'remove',
      target: 'ま'
    },
    description: '「ま」抜け'
  },
  'けしごむ': {
    name: 'けしごむ',
    reading: 'けしごむ',
    operation: {
      type: 'remove',
      target: 'ごむ'
    },
    description: '消し「ごむ」'
  },
  'けしいん': {
    name: 'けしいん',
    reading: 'けしいん',
    operation: {
      type: 'remove',
      target: 'いん'
    },
    description: '消し「いん」'
  },
  'けしき': {
    name: 'けしき',
    reading: 'けしき',
    operation: {
      type: 'remove',
      target: 'き'
    },
    description: '消し「き」'
  },
  'けむし': {
    name: 'けむし',
    reading: 'けむし',
    operation: {
      type: 'remove',
      target: 'け'
    },
    description: '「け」無視'
  },
  'けぬき': {
    name: 'けぬき',
    reading: 'けぬき',
    operation: {
      type: 'remove',
      target: 'け'
    },
    description: '「け」抜き'
  },
  'むしかご': {
    name: 'むしかご',
    reading: 'むしかご',
    operation: {
      type: 'remove',
      target: 'かご'
    },
    description: '無視「かご」'
  },
  'むしあみ': {
    name: 'むしあみ',
    reading: 'むしあみ',
    operation: {
      type: 'remove',
      target: 'あみ'
    },
    description: '無視「あみ」'
  },
  'むしめがね': {
    name: 'むしめがね',
    reading: 'むしめがね',
    operation: {
      type: 'remove',
      target: 'めがね'
    },
    description: '無視「めがね」'
  },
  'むしば': {
    name: 'むしば',
    reading: 'むしば',
    operation: {
      type: 'remove',
      target: 'ば'
    },
    description: '無視「ば」'
  },
  'こけし': {
    name: 'こけし',
    reading: 'こけし',
    operation: {
      type: 'remove',
      target: 'こ'
    },
    description: '「こ」消し'
  },
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

export function getHint(hintName: string): Hint | undefined {
  return hints[hintName];
}

export function getAllHints(): Hint[] {
  return Object.values(hints);
}