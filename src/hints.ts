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
  'こけし': {
    name: 'こけし',
    reading: 'こけし',
    operation: {
      type: 'remove',
      target: 'こ'
    },
    description: '「こ」を消す'
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