// AI 사주친구 상담사(페르소나) — 고객이 고르는 말투·성향. 같은 사주 계산 위에서 말하는 방식만 달라진다.
import P from '../data/personas.json' with { type: 'json' };

export type Persona = { id: string; name: string; title: string; who: string; quote: string; greet: string; tone: string; empathy: string[]; close: string; img: string; love?: boolean; gender: 'F' | 'M'; sign: string };
export const PERSONAS = P.list as Persona[];
export const DEFAULT_PERSONA = P.default;
export const personaOf = (id?: string | null) => PERSONAS.find((p) => p.id === id) ?? PERSONAS.find((p) => p.id === P.default)!;
