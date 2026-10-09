// AI 사주친구 — 사주를 쉽게 설명하고 지금 상황과 연결해 주는 안내자(일반 심리상담 챗봇이 아님).
// 답할 때 참고: 사주지도 요약 · 오늘/이번 달 흐름 · 고민 분야의 앞으로 흐름 · (동의 시) 최근 기록 5개.
// 매 답변과 함께 "달새김 기억" 요약 초안을 만든다 → 화면에서 [저장][수정][남기지 않기].
// AI 키가 없으면(또는 FRIEND_AI 가 live 가 아니면) 계산 결과로 짧은 답을 만든다(흐름 확인·시연용).
import { calcSaju, type SajuResult } from '@dalsaegim/engine';
import { sajuMap, todayFortune, monthFortune, nextMonths, toRanges, pick, personaOf, type Dim } from '@dalsaegim/content';
import { callClaude, costKrwOf, parseJson } from './reading/generate.ts';

export type ChatMsg = { role: 'user' | 'friend'; text: string; at: string };
export type MemoryDraft = { category: string; title: string; summary: string; sajuNote: string };
type ProfileRow = { id: string; name: string; gender: string; birthYear: number; birthMonth: number; birthDay: number; calendar: string; leap: boolean; birthHour: number | null };

export const friendLive = () => (process.env.FRIEND_AI ?? process.env.READING_AI) === 'live' && !!process.env.ANTHROPIC_API_KEY && !!(process.env.FRIEND_MODEL || process.env.ANTHROPIC_MODEL);

const TOPICS: [string, RegExp, Dim, string][] = [
  ['love', /연애|남친|여친|남자친구|여자친구|썸|짝사랑|이별|헤어|재회|결혼|연인|고백|소개팅|사랑/, 'love', '연애·관계'],
  ['work', /회사|직장|이직|퇴사|상사|동료|취업|면접|시험|승진|일이|업무|창업|부업|사업/, 'work', '직장·일'],
  ['money', /돈|재물|투자|주식|코인|적금|대출|월급|집|이사|전세|월세|부동산|빚|지출/, 'wealth', '돈·재물'],
  ['family', /엄마|아빠|부모|가족|남편|아내|아이|자녀|시댁|친정|형제|언니|오빠|동생/, 'family', '가족'],
  ['growth', /지쳐|힘들|우울|불안|번아웃|자존감|진로|방향|습관|건강|잠/, 'growth', '나 자신'],
];
export function topicOf(text: string, fallback?: string | null) {
  const t = TOPICS.find(([, re]) => re.test(text));
  if (t) return { id: t[0], dim: t[2], label: t[3] };
  const f = TOPICS.find(([id]) => id === fallback);
  return f ? { id: f[0], dim: f[2], label: f[3] } : { id: 'growth', dim: 'growth' as Dim, label: '나 자신' };
}
const sajuOfRow = (p: ProfileRow): SajuResult => calcSaju({ year: p.birthYear, month: p.birthMonth, day: p.birthDay, hour: p.birthHour, calendar: p.calendar as 'solar' | 'lunar', leapMonth: p.leap, gender: p.gender as 'M' | 'F', timeUnknown: p.birthHour == null });

export function sajuBrief(p: ProfileRow, dim: Dim, now = new Date()) {
  const s = sajuOfRow(p);
  const map = sajuMap(s, p.id, now);
  const t = todayFortune(s, now, p.id);
  const m = monthFortune(s, now, p.id);
  const nm = nextMonths(s, dim, p.id, now);
  const good = [...nm].sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.month);
  const careful = [...nm].sort((a, b) => a.score - b.score).slice(0, 2).map((x) => x.month);
  return {
    map, today: t, month: m, good: toRanges(good), careful: toRanges(careful),
    lines: [
      `${p.name} 님(${p.gender === 'F' ? '여' : '남'}, ${p.birthYear}년생) — 일간 ${map.dayMaster.char}(${map.dayMaster.hanja}) ${map.dayMaster.title}. ${map.dayMaster.line}`,
      `오행: ${map.elements.map((e) => `${e.el} ${e.pct}%`).join(' · ')}, 채우면 좋은 기운 ${map.need}`,
      ...map.areas.map((a) => `${a.label}: ${a.line}`),
      `오늘 ${t.total}점(${t.headline}), 이번 달 ${m.total}점(${m.line})`,
      `이 고민 분야의 앞으로 12달: 좋은 달 ${toRanges(good)}, 신중한 달 ${toRanges(careful)}`,
    ],
  };
}

export async function friendReply(o: {
  profile: ProfileRow; history: ChatMsg[]; text: string; topicHint?: string | null; memories: { happenedOn: string; category: string; title: string; feedback: string | null }[];
  persona?: string | null; http?: typeof fetch; now?: Date;
}) {
  const now = o.now ?? new Date();
  const pe = personaOf(o.persona);
  const topic = topicOf(o.text, o.topicHint);
  const b = sajuBrief(o.profile, topic.dim, now);
  const draft: MemoryDraft = {
    category: topic.id,
    title: o.text.replace(/\s+/g, ' ').slice(0, 40),
    summary: `${topic.label} 고민을 AI 사주친구와 나눔. 사주 흐름상 ${b.good}에 기운이 살아나고, ${b.careful}에는 쉬어 가면 좋은 시기.`,
    sajuNote: `좋은 시기 ${b.good} / 신중한 시기 ${b.careful}`,
  };
  if (!friendLive()) {
    const empathy = pick(pe.empathy, `${o.text}:e`);
    const area = b.map.areas.find((a) => a.id === (topic.id === 'money' ? 'money' : topic.id === 'work' ? 'work' : topic.id === 'family' ? 'family' : topic.id === 'love' ? 'love' : 'growth'));
    const FB: Record<string, string> = { good: '잘 풀렸다고', same: '비슷하다고', changed: '달라졌다고' };
    const last = o.memories[0];
    const recall = last && o.history.length === 0 ? `지난 ${last.happenedOn.replace(/-/g, '.')}에 남긴 '${last.title}' 기록${last.feedback ? `(결과는 ${FB[last.feedback] ?? '남겨 주셨다고'} 하셨죠)` : ''}도 함께 떠올리며 볼게요.\n\n` : '';
    const fieldScore = topic.id === 'love' ? `오늘 연애 지수는 ${b.today.fields.love.score}점이에요.` : topic.id === 'work' ? `오늘 직장 지수는 ${b.today.fields.work.score}점이에요.` : topic.id === 'money' ? `오늘 재물 지수는 ${b.today.fields.wealth.score}점이에요.` : `오늘 컨디션 지수는 ${b.today.fields.health.score}점이에요.`;
    const reply = `${empathy} ${recall}${o.profile.name} 님 사주에서 보면, ${area?.line ?? b.map.dayMaster.line}\n\n앞으로 ${topic.label} 흐름은 ${b.good}에 기운이 살아나고, ${b.careful}에는 한 템포 쉬어 가면 좋아요. ${fieldScore}\n\n${pe.close}`;
    return { reply, draft, topic: topic.id, tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
  }
  const system = `너는 사주 서비스 "달새김사주"의 AI 사주친구 상담사 "${pe.name}"(${pe.title})이다. 말투: ${pe.tone} 3~6문장(최대 400자)으로 답한다.
역할: 사주 결과를 쉽게 설명하고 사용자의 실제 상황과 연결해 주는 안내자. 일반 심리상담·의료·법률·투자 자문을 하지 않는다.
원칙: 사주는 결정을 대신하지 않는 참고 정보다. 단정·공포 표현 금지. 종목·매수·매도 금지. 자해·위기 신호가 보이면 공감하고 전문 상담(자살예방 상담전화 109)을 안내한다.
아래 사주 정보의 숫자·시기와 어긋나지 않게 말한다. 마지막에 대화를 이어 갈 질문을 하나 한다.
출력은 JSON 하나만: {"reply": string, "memory": {"category": "love|work|money|family|growth|health|etc", "title": string(25자 이내, 고민 한 줄), "summary": string(60자 이내, 상담 요약)}}`;
  const ctx = `[사주 정보]\n${b.lines.join('\n')}${o.memories.length ? `\n[최근 기록]\n${o.memories.map((m) => `- ${m.happenedOn} ${m.category} ${m.title}${m.feedback ? ` (결과: ${m.feedback})` : ''}`).join('\n')}` : ''}`;
  const msgs: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: ctx }, { role: 'assistant', content: '{"reply":"알겠어요. 사주 정보를 참고해서 이야기할게요.","memory":null}' }];
  for (const m of o.history.slice(-12)) msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.role === 'user' ? m.text : JSON.stringify({ reply: m.text }) });
  msgs.push({ role: 'user', content: o.text });
  const c = await callClaude(system, msgs, o.http ?? fetch, { model: process.env.FRIEND_MODEL || process.env.ANTHROPIC_MODEL, maxTokens: 900 });
  let reply = c.text.trim();
  try {
    const j = parseJson(c.text);
    reply = String(j.reply ?? reply);
    if (j.memory?.title) Object.assign(draft, { category: String(j.memory.category ?? draft.category), title: String(j.memory.title).slice(0, 40), summary: String(j.memory.summary ?? j.memory.title).slice(0, 120) });
  } catch { /* JSON 이 아니면 본문 그대로 */ }
  return { reply, draft, topic: topic.id, tokensIn: c.tokensIn, tokensOut: c.tokensOut, costKrw: costKrwOf(c.tokensIn, c.tokensOut), ai: true };
}
