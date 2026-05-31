import type { Card } from './types';

export const library: Card[] = [
  {
    id: 'ember-scout',
    name: '火花の斥候',
    kind: 'unit',
    element: 'ember',
    cost: 1,
    power: 2,
    shield: 1,
    text: '召喚時、相手の最前列に1点。',
    trigger: 'onSummon',
  },
  {
    id: 'tide-adept',
    name: '潮読みの術士',
    kind: 'unit',
    element: 'tide',
    cost: 2,
    power: 2,
    shield: 3,
    text: '攻撃時、自分の山札から1枚引く。',
    trigger: 'onAttack',
  },
  {
    id: 'terra-warden',
    name: '樹殻の守護者',
    kind: 'unit',
    element: 'terra',
    cost: 2,
    power: 1,
    shield: 5,
    text: '高い耐久でシールドを守る。',
  },
  {
    id: 'volt-runner',
    name: '閃走の機士',
    kind: 'unit',
    element: 'volt',
    cost: 3,
    power: 4,
    shield: 2,
    text: '召喚したターンから攻撃できる。',
  },
  {
    id: 'void-dragon',
    name: '黒星の竜',
    kind: 'unit',
    element: 'void',
    cost: 5,
    power: 6,
    shield: 5,
    text: '進化元がいるレーンに出すとコスト-2。',
    evolution: 'any',
  },
  {
    id: 'ember-burst',
    name: '紅蓮の一撃',
    kind: 'spell',
    element: 'ember',
    cost: 2,
    power: 3,
    shield: 0,
    text: '選んだ敵ユニットに3点。いなければ相手に1点。',
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
    power: 2,
    shield: 0,
    text: '次に自分が攻撃された時、攻撃ユニットに2点。',
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
