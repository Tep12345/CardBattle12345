import type { Card } from './types';

export const library: Card[] = [
  {
    id: 'ember-scout',
    name: '火花の斥候',
    kind: 'unit',
    element: 'ember',
    cost: 1,
    power: 1200,
    shield: 800,
    text: '召喚時、相手の最前列に500ダメージ。',
    trigger: 'onSummon',
  },
  {
    id: 'tide-adept',
    name: '潮読みの術士',
    kind: 'unit',
    element: 'tide',
    cost: 2,
    power: 1500,
    shield: 1800,
    text: '攻撃時、自分の山札から1枚引く。',
    trigger: 'onAttack',
  },
  {
    id: 'terra-warden',
    name: '樹殻の守護者',
    kind: 'unit',
    element: 'terra',
    cost: 2,
    power: 800,
    shield: 3000,
    text: '高い耐久でシールドを守る。',
  },
  {
    id: 'volt-runner',
    name: '閃走の機士',
    kind: 'unit',
    element: 'volt',
    cost: 3,
    power: 2500,
    shield: 1200,
    text: '召喚したターンから攻撃できる。',
  },
  {
    id: 'void-dragon',
    name: '黒星の竜',
    kind: 'unit',
    element: 'void',
    cost: 5,
    power: 5000,
    shield: 5000,
    text: '進化元がいるレーンに出すとコスト-2。',
    evolution: 'any',
  },
  {
    id: 'ember-burst',
    name: '紅蓮の一撃',
    kind: 'spell',
    element: 'ember',
    cost: 2,
    power: 2000,
    shield: 0,
    text: '選んだ敵ユニットに2000ダメージ。いなければ相手HPに1000ダメージ。',
  },
  {
    id: 'tide-recall',
    name: '還流の印',
    kind: 'spell',
    element: 'tide',
    cost: 3,
    power: 0,
    shield: 0,
    text: 'カードを2枚引く。',
  },
  {
    id: 'terra-root',
    name: '大樹の契約',
    kind: 'spell',
    element: 'terra',
    cost: 1,
    power: 0,
    shield: 0,
    text: 'このターンのマナを2増やす。',
  },
  {
    id: 'mirror-trap',
    name: '反鏡の罠',
    kind: 'trap',
    element: 'void',
    cost: 2,
    power: 1500,
    shield: 0,
    text: '次に自分が攻撃された時、攻撃ユニットに1500ダメージ。',
  },
];

export function buildStarterDeck(): Card[] {
  const ids = [
    'ember-scout',
    'ember-scout',
    'tide-adept',
    'tide-adept',
    'terra-warden',
    'terra-warden',
    'volt-runner',
    'volt-runner',
    'void-dragon',
    'ember-burst',
    'ember-burst',
    'tide-recall',
    'terra-root',
    'terra-root',
    'mirror-trap',
    'mirror-trap',
  ];

  return ids.map((id, index) => ({
    ...library.find((card) => card.id === id)!,
    id: `${id}-${index}`,
  }));
}

export const elementLabel: Record<Card['element'], string> = {
  ember: '火',
  tide: '水',
  terra: '森',
  volt: '雷',
  void: '虚',
};

export const elementBeats: Record<Card['element'], Card['element']> = {
  ember: 'terra',
  terra: 'volt',
  volt: 'tide',
  tide: 'ember',
  void: 'void',
};
