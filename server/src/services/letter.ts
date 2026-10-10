// 달빛 편지 — 고른 상담사의 말투로 150~250자 맞춤 편지. AI 키가 있으면 AI가 쓰고, 없으면 문구 은행으로 같은 형식을 만든다.
// 원칙: 이름을 부르며 시작, 감정·고민에 맞는 공감·위로·응원, 미래 단정·불안 조성 금지.
import { calcSaju } from '@dalsaegim/engine';
import { composeLetter, monthFortune, personaOf, sajuMap, LETTER_FEELINGS, LETTER_TOPICS, type LetterRecall } from '@dalsaegim/content';
import { callClaude, costKrwOf, parseJson } from './reading/generate.ts';
import { friendLive } from './friend.ts';

type ProfileRow = { id: string; name: string; gender: string; birthYear: number; birthMonth: number; birthDay: number; calendar: string; leap: boolean; birthHour: number | null };
const BANNED = /반드시|무조건|100%|사망|죽(는|을|음)|헤어지게 됩니다|절대 안/;

export async function writeLetter(o: { profile: ProfileRow; persona: string; feeling: string; topic?: string | null; input?: string | null; recall?: LetterRecall | null; now?: Date; http?: typeof fetch }) {
  const pe = personaOf(o.persona);
  const s = calcSaju({ year: o.profile.birthYear, month: o.profile.birthMonth, day: o.profile.birthDay, hour: o.profile.birthHour, calendar: o.profile.calendar as 'solar' | 'lunar', leapMonth: o.profile.leap, gender: o.profile.gender as 'M' | 'F', timeUnknown: o.profile.birthHour == null });
  const map = sajuMap(s, o.profile.id);
  // 이번 달 사주 흐름(엔진 계산) 첫 문장 — 편지가 사주와 이어지게
  const flow = monthFortune(s, o.now ?? new Date(), o.profile.id).line.split(/(?<=요\.)\s/)[0];
  const base = composeLetter({ name: o.profile.name, persona: pe.id, feeling: o.feeling, topic: o.topic, input: o.input, trait: map.dayMaster.title, flow, recall: o.recall, seed: `${o.profile.id}:${o.feeling}:${o.topic}:${Date.now() >> 16}` });
  if (!friendLive()) return { ...base, ai: false, tokensIn: 0, tokensOut: 0, costKrw: 0 };
  const f = LETTER_FEELINGS.find((x) => x.id === o.feeling)?.label ?? '희망';
  const t = LETTER_TOPICS.find((x) => x.id === o.topic)?.label ?? '';
  const system = `너는 사주 서비스 "달새김사주"의 상담사 "${pe.name}"(${pe.title})이다. 말투: ${pe.tone}
고객에게 짧은 손편지를 쓴다. 150~250자, 3~5문장. 첫 문장에 고객 이름(○○님)을 자연스럽게 부른다.
선택한 감정과 고민에 맞는 공감·위로·응원을 담는다. 기계적·형식적인 문장, 미래를 단정하는 말, 불안을 키우는 말은 쓰지 않는다.
사주 성향·이번 달 흐름은 자연스러우면 한 번만 녹인다.
"지난 고민"이 주어지면 첫머리에 그때를 기억해 묻는다(예: "○○님, 지난번에는 이직을 앞두고 고민이 많으셨지요. 그때와 비교해 지금은 마음이 조금 편안해지셨나요?"). 지난 고민의 결과를 짐작하거나 단정하지 않는다.
출력은 JSON 하나만: {"title": string(20자 이내), "body": string}`;
  const user = `고객 이름: ${o.profile.name}\n지금 감정: ${f}\n고민: ${t}${o.input ? ` / 직접 쓴 한 줄: ${o.input.slice(0, 100)}` : ''}\n사주 성향: ${map.dayMaster.title} — ${map.dayMaster.line}\n이번 달 사주 흐름: ${flow}${o.recall ? `\n지난 ${o.recall.kind === 'wish' ? '소망' : '고민'}(${o.recall.when}): ${o.recall.what}` : ''}`;
  const c = await callClaude(system, [{ role: 'user', content: user }], o.http ?? fetch, { model: process.env.FRIEND_MODEL || process.env.ANTHROPIC_MODEL, maxTokens: 600 });
  try {
    const j = parseJson(c.text);
    const body = String(j.body ?? '').trim();
    if (body.length >= 80 && body.length <= 400 && body.includes(o.profile.name) && !BANNED.test(body)) {
      return { ...base, title: String(j.title ?? base.title).slice(0, 30), body, ai: true, tokensIn: c.tokensIn, tokensOut: c.tokensOut, costKrw: costKrwOf(c.tokensIn, c.tokensOut) };
    }
  } catch { /* 형식이 어긋나면 문구 은행 편지로 */ }
  return { ...base, ai: false, tokensIn: c.tokensIn, tokensOut: c.tokensOut, costKrw: costKrwOf(c.tokensIn, c.tokensOut) };
}
