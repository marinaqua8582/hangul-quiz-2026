import { RankDefinition } from '../types/index.ts';

export const RANK_DEFINITIONS: RankDefinition[] = [
  {
    id: 'king',
    title: '한글 대왕',
    minScore: 95,
    maxScore: 100,
    imageFileName: 'king.png',
    comment: '과인이 인정하노라!\n그대야말로 오늘의 진정한 한글 대왕이로다.',
    roleDescription: '왕의 익선관과 붉은 곤룡포를 입고 한글을 널리 펴는 성군의 지혜',
    badgeAccent: 'from-amber-600 to-rose-700',
    sealColor: '#991b1b', // crimson royal seal
  },
  {
    id: 'jangwon',
    title: '한글 장원',
    minScore: 85,
    maxScore: 90,
    imageFileName: 'jangwon.png',
    comment: '훌륭하도다!\n한글 과거시험이 있었다면 장원급제했을 것이로다.',
    roleDescription: '어사화를 꽂고 임금의 교지를 높이 든 과거 시험 수석 합격자',
    badgeAccent: 'from-amber-500 to-emerald-700',
    sealColor: '#047857', // jade seal
  },
  {
    id: 'general',
    title: '한글 장군',
    minScore: 70,
    maxScore: 80,
    imageFileName: 'general.png',
    comment: '제법 실력이 있구나!\n당당한 한글 장군으로 인정하노라.',
    roleDescription: '기품 있는 투구와 갑주를 두르고 우리말을 수호하는 늠름한 장수',
    badgeAccent: 'from-blue-600 to-indigo-800',
    sealColor: '#1e3a8a', // navy seal
  },
  {
    id: 'scholar',
    title: '한글 선비',
    minScore: 50,
    maxScore: 65,
    imageFileName: 'scholar.png',
    comment: '글 읽고 글 쓰는 멋이 있구나!\n조금 더 정진하면 더 높은 자리에 오를 수 있다.',
    roleDescription: '갓과 도포를 단정히 여미고 붓을 들어 학문을 닦는 청렴한 선비',
    badgeAccent: 'from-teal-600 to-cyan-800',
    sealColor: '#0f766e', // teal seal
  },
  {
    id: 'student',
    title: '한글 학동',
    minScore: 0,
    maxScore: 45,
    imageFileName: 'student.png',
    comment: '배움의 첫걸음을 내디뎠구나!\n오늘 알게 된 한글과 우리말을 하나씩 익혀 보자.',
    roleDescription: '서당에서 또박또박 훈민정음을 소리 내어 읽으며 꿈을 키우는 학동',
    badgeAccent: 'from-amber-600 to-orange-700',
    sealColor: '#c2410c', // terracotta seal
  },
];

export function getRankByScore(score: number): RankDefinition {
  const found = RANK_DEFINITIONS.find((r) => score >= r.minScore && score <= r.maxScore);
  return found || RANK_DEFINITIONS[RANK_DEFINITIONS.length - 1];
}

export function getRankByTitle(title: string): RankDefinition {
  const found = RANK_DEFINITIONS.find((r) => r.title === title);
  return found || RANK_DEFINITIONS[RANK_DEFINITIONS.length - 1];
}
