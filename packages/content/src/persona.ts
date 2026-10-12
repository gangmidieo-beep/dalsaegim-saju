// AI 사주친구 상담사(페르소나) — 고객이 고르는 말투·성향. 같은 사주 계산 위에서 말하는 방식만 달라진다.
import P from '../data/personas.json' with { type: 'json' };

export type Persona = { id: string; name: string; title: string; tag?: string; who: string; quote: string; greet: string; tone: string; empathy: string[]; close: string; img: string; love?: boolean; gender: 'F' | 'M'; sign: string };
export const PERSONAS = P.list as Persona[];
export const DEFAULT_PERSONA = P.default;
// 예전 상담사 id(이전 대화·편지에 저장된 값)는 새 상담사로 이어 준다
const ALIAS = (P as { alias?: Record<string, string> }).alias ?? {};
export const personaOf = (id?: string | null) => {
  const key = id ? (ALIAS[id] ?? id) : id;
  return PERSONAS.find((p) => p.id === key) ?? PERSONAS.find((p) => p.id === P.default)!;
};
/** 상담 주제 24가지 */
export const FRIEND_TOPICS = (P as { topics?: string[] }).topics ?? [];
