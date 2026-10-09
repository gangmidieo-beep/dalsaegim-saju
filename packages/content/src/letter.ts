// 달빛 편지 — 오늘의 달빛 편지(모두에게) · AI 맞춤 편지(상담사·감정·고민). AI 키가 없을 때는 문구 은행으로 같은 형식의 편지를 만든다.
import { pick, hash } from './core';
import { personaOf } from './persona';
import L from '../data/letter.json' with { type: 'json' };

export const LETTER_FEELINGS = L.feelings as { id: string; label: string }[];
export const LETTER_TOPICS = L.topics as { id: string; label: string; line: string }[];
export const TODAY_LETTERS = L.today as { theme: string; title: string; body: string }[];
export const LETTER_KAKAO = L.kakao as string;
type Bank = Record<string, { open: string[]; body: string[]; close: string[] }>;

// 관리자가 오늘 날짜 편지를 안 올렸을 때 돌아가며 보여 줄 기본 편지
export const defaultTodayLetter = (ymd: string) => TODAY_LETTERS[hash(`today-letter:${ymd}`) % TODAY_LETTERS.length];

export function composeLetter(o: { name: string; persona?: string | null; feeling: string; topic?: string | null; input?: string | null; trait?: string | null; seed: string }) {
  const pe = personaOf(o.persona);
  const b = (L.bank as Bank)[o.feeling] ?? (L.bank as Bank).hope;
  const t = LETTER_TOPICS.find((x) => x.id === o.topic);
  const f = LETTER_FEELINGS.find((x) => x.id === o.feeling) ?? LETTER_FEELINGS[5];
  const fill = (s: string) => s.replaceAll('{name}', o.name);
  const said = o.input?.trim() ? `'${o.input.trim().slice(0, 30)}'라고 적어 준 마음, 잘 받았어요.` : t ? `${t.line} 많은 생각이 오갔겠지요.` : '';
  const trait = o.trait ? `사주로 보면 ${o.name}님은 '${o.trait}' 같은 사람이에요. 그 빛은 쉽게 꺼지지 않아요.` : '';
  const lines = [fill(pick(b.open, `${o.seed}:o`)), said, fill(pick(b.body, `${o.seed}:b`)), trait, fill(pick(b.close, `${o.seed}:c`))].filter(Boolean);
  return {
    title: `${f.label}의 밤, ${o.name}님께`,
    body: lines.join('\n'),
    to: `TO. ${o.name} 고객님`,
    from: `FROM. ${pe.sign}`,
  };
}
