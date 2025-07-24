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
  }
};

export function getHint(hintName: string): Hint | undefined {
  return hints[hintName];
}

export function getAllHints(): Hint[] {
  return Object.values(hints);
}