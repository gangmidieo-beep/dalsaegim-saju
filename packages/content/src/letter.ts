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

// recall: 고객이 동의해 남긴 지난 고민(기록·지난 편지) — "지난번에는 ~ 지금은 어떠세요?" 후속 편지
// flow: 이번 달 사주 흐름 한 문장(엔진 계산) — 편지가 사주와 이어지게
export type LetterRecall = { when: string; what: string; kind: 'memory' | 'letter' | 'wish' };
export function composeLetter(o: { name: string; persona?: string | null; feeling: string; topic?: string | null; input?: string | null; trait?: string | null; flow?: string | null; recall?: LetterRecall | null; seed: string }) {
  const pe = personaOf(o.persona);
  const b = (L.bank as Bank)[o.feeling] ?? (L.bank as Bank).hope;
  const t = LETTER_TOPICS.find((x) => x.id === o.topic);
  const f = LETTER_FEELINGS.find((x) => x.id === o.feeling) ?? LETTER_FEELINGS[5];
  const fill = (s: string) => s.replaceAll('{name}', o.name);
  const what = o.recall ? clip(o.recall.what.trim().replace(/\s*(에 대한 )?(고민(했어요|함|이에요|중)?|함)\.?$/, '').replace(/[.!?]$/, ''), 18) : '';
  const recall = o.recall
    ? o.recall.kind === 'wish'
      ? `${o.name}님, ${o.recall.when}에 '${what}' 소망을 새기셨지요. 그 소망은 지금 어디쯤 와 있나요?`
      : `${o.name}님, ${o.recall.when}에는 '${what}' 고민으로 마음이 무거우셨지요. 그때와 비교해 지금은 마음이 조금 편안해지셨나요?`
    : '';
  const said = o.input?.trim() ? `'${clip(o.input.trim(), 24)}'라고 적어 준 마음, 잘 받았어요.` : t ? `${t.line} 많은 생각이 오갔겠지요.` : '';
  const flow = o.flow ? `사주로 보면 ${o.flow.startsWith('이번 달') ? o.flow : `이번 달은 ${o.flow}`}` : o.trait ? `사주로 보면 ${o.name}님은 '${o.trait}' 같은 사람이에요. 그 빛은 쉽게 꺼지지 않아요.` : '';
  const open = recall || fill(pick(b.open, `${o.seed}:o`));
  const body = fill(pick(b.body, `${o.seed}:b`)), close = fill(pick(b.close, `${o.seed}:c`));
  // 150~250자: 넘치면 덜 중요한 문장부터 뺀다(사주 흐름 → 적어 준 말), 모자라면 사주 성향을 더한다
  let lines = [open, said, body, flow, close].filter(Boolean);
  const len = (a: string[]) => a.join('\n').length;
  if (len(lines) > 250 && flow) lines = lines.filter((x) => x !== flow);
  if (len(lines) > 250 && said) lines = lines.filter((x) => x !== said);
  if (len(lines) < 150 && o.trait && !lines.some((x) => x.includes(o.trait!))) lines.splice(lines.length - 1, 0, `${o.name}님 안에는 '${o.trait}' 같은 힘이 있어요.`);
  return {
    title: `${f.label}의 밤, ${o.name}님께`,
    body: lines.join('\n'),
    to: `TO. ${o.name} 고객님`,
    from: `FROM. ${pe.sign}`,
    recalled: !!o.recall,
  };
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trim() + '…' : s);
