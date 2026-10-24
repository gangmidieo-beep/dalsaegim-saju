// 달빛 상담(상담사 6명) — 사주를 쉽게 설명하고 지금 상황과 연결해 주는 안내자(일반 심리상담 챗봇이 아님).
// 답할 때 참고: 사주지도 요약 · 오늘/이번 달 흐름 · 고민 분야의 앞으로 흐름 · (동의 시) 최근 기록 5개.
// 매 답변과 함께 "달새김 기억" 요약 초안을 만든다 → 화면에서 [저장][수정][남기지 않기].
// AI 키가 없으면(또는 FRIEND_AI 가 live 가 아니면) 계산 결과로 짧은 답을 만든다(흐름 확인·시연용).
import { calcSaju, type SajuResult } from '@dalsaegim/engine';
import { sajuMap, todayFortune, monthFortune, nextMonths, toRanges, pick, personaOf, type Dim } from '@dalsaegim/content';
import { callClaude, parseJson } from './reading/generate.ts';
import { aiCapReached, aiProvider } from './ai.ts';
import { ACTIONS, CLARIFY, CLOSE, detectFormat, detectTopic } from './friendRules.ts';

export type ChatMsg = { role: 'user' | 'friend'; text: string; at: string };
export type MemoryDraft = { category: string; title: string; summary: string; sajuNote: string };
type ProfileRow = { id: string; name: string; gender: string; birthYear: number; birthMonth: number; birthDay: number; calendar: string; leap: boolean; birthHour: number | null };

export const friendLive = () => (process.env.FRIEND_AI ?? process.env.READING_AI) === 'live' && aiProvider() != null && !aiCapReached();

// 주제 읽기는 friendRules.ts(최근 질문 우선 · 부정 표현 제외 · 형식 요청)
export function topicOf(text: string, fallback?: string | null) {
  const t = detectTopic(text, fallback).topic;
  return t ?? { id: 'growth', cat: 'growth' as const, dim: 'growth' as Dim, label: '나 자신', field: 'health' as const };
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
  persona?: string | null; http?: typeof fetch; now?: Date; tier?: 'free' | 'pass'; noAI?: boolean;
}) {
  const now = o.now ?? new Date();
  const pe = personaOf(o.persona);
  const lastTopic = [...o.history].reverse().find((m) => m.role === 'user');
  const det = detectTopic(o.text, o.topicHint, lastTopic ? detectTopic(lastTopic.text).topic?.id : null, o.memories[0]?.category);
  const fmt = detectFormat(o.text);
  const topic = det.topic ?? { id: 'growth', cat: 'growth' as const, dim: 'growth' as Dim, label: '나 자신', field: 'health' as const };
  const b = sajuBrief(o.profile, topic.dim, now);
  const draft: MemoryDraft = {
    category: topic.cat,
    title: o.text.replace(/\s+/g, ' ').slice(0, 40),
    summary: `${topic.label} 고민을 달빛 상담사와 나눔.${fmt.noTiming || topic.id === 'pet' ? '' : ` 사주 흐름상 ${b.good}에 기운이 살아나고, ${b.careful}에는 쉬어 가면 좋은 시기.`}`,
    sajuNote: `${topic.label} · 좋은 시기 ${b.good} / 신중한 시기 ${b.careful}`,
  };
  if (!friendLive() || o.noAI) {
    // 무엇을 묻는지 알 수 없으면(첫마디가 짧고 주제가 없을 때) 짧게 되묻는다
    if (!det.topic && (o.history.length === 0 || det.negated.size > 0) && o.text.replace(/\s/g, '').length < 25) {
      return { reply: `${pick(pe.empathy, `${o.text}:e`)} ${CLARIFY}`, draft: { ...draft, category: 'etc', summary: '상담 주제를 묻는 중' }, topic: 'etc', tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
    }
    // 연애가 아닌 주제에는 '그 장면·그 사람' 같은 연애용 공감 문장을 쓰지 않는다
    const emp = topic.id === 'love' ? pe.empathy : pe.empathy.filter((x) => !/장면|그 사람/.test(x));
    const empathy = pick(emp.length ? emp : pe.empathy, `${o.text}:e`);
    const areaId = ({ money: 'money', work: 'work', promo: 'work', family: 'family', pet: 'family', love: 'love' } as Record<string, string>)[topic.id] ?? 'growth';
    const area = b.map.areas.find((a) => a.id === areaId);
    const FB: Record<string, string> = { good: '잘 풀렸다고', same: '비슷하다고', changed: '달라졌다고' };
    const last = o.memories[0];
    const recall = last && o.history.length === 0 && !fmt.short && !fmt.count ? `지난 ${last.happenedOn.replace(/-/g, '.')}에 남긴 '${last.title}' 기록${last.feedback ? `(결과는 ${FB[last.feedback] ?? '남겨 주셨다고'} 하셨죠)` : ''}도 함께 떠올리며 볼게요.\n\n` : '';
    const FIELD: Record<string, string> = { love: '연애', work: '직장', wealth: '재물', health: '컨디션' };
    const fieldScore = !fmt.noNumbers && topic.field && det.fromText ? ` 오늘 ${FIELD[topic.field]} 지수는 ${b.today.fields[topic.field].score}점이에요.` : '';
    const timing = fmt.noTiming ? '' : topic.id === 'study' ? `공부와 시험은 사주에서 문서의 기운으로 보는데, ${b.good}에 집중력이 살아나기 쉬워요.` : topic.id === 'pet' ? '' : `앞으로 ${topic.label} 흐름은 ${b.good}에 기운이 살아나고, ${b.careful}에는 한 템포 쉬어 가면 좋아요.`;
    const acts = ACTIONS[topic.id] ?? ACTIONS.growth;
    let reply: string;
    if (fmt.action || topic.id === 'study' || topic.id === 'pet') {
      const n = Math.min(fmt.count ?? 3, acts.length);
      const list = acts.slice(0, n).map((x, i) => `${'①②③④⑤'[i]} ${x}`).join('\n');
      const lead = topic.id === 'study' ? '오늘은 이렇게 해 보세요.' : topic.id === 'pet' ? '오늘 아이와 이렇게 보내 보세요.' : '지금 할 수 있는 것부터 정리해 볼게요.';
      reply = fmt.short ? `${lead}\n${list}` : `${empathy} ${lead}\n${list}${timing ? `\n\n${timing}` : ''}${fieldScore ? `\n${fieldScore.trim()}` : ''}\n\n${CLOSE[topic.id] ?? pe.close}`;
    } else if (fmt.short) {
      reply = `${empathy} ${timing || (area?.line ?? b.map.dayMaster.line)}`;
    } else {
      reply = `${empathy} ${recall}${o.profile.name} 님 사주에서 보면, ${area?.line ?? b.map.dayMaster.line}${timing ? `\n\n${timing}` : ''}${fieldScore}\n\n${topic.id === 'love' ? pe.close : CLOSE[topic.id] ?? pe.close}`;
    }
    return { reply, draft, topic: topic.id, tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
  }
  const system = `너는 사주 서비스 "달새김사주"의 달빛 상담 AI 상담사 "${pe.name}"(${pe.title})이다. 말투: ${pe.tone} 3~6문장(최대 400자)으로 답한다.
역할: 사주 결과를 쉽게 설명하고 사용자의 실제 상황과 연결해 주는 안내자. 일반 심리상담·의료·법률·투자 자문을 하지 않는다.
원칙: 사주는 결정을 대신하지 않는 참고 정보다. 단정·공포 표현 금지. 종목·매수·매도 금지. 자해·위기 신호가 보이면 공감하고 전문 상담(자살예방 상담전화 109)을 안내한다.
가장 최근 질문의 의도를 가장 먼저 따른다: 이전 주제에 고정하지 말고, \"아니다·말고\" 같은 부정 표현과 \"세 가지·짧게·점수 없이\" 같은 형식 요청을 그대로 지킨다. 무엇을 묻는지 모호하면 짧게 되묻는다. 시험·합격·승진은 결과를 보장하지 않는다. 반려동물의 수명·질병은 단정하지 않고 동물병원 상담을 권한다.\n아래 사주 정보의 숫자·시기와 어긋나지 않게 말하되, 질문과 관계없는 점수·시기는 꺼내지 않는다. 마지막에 대화를 이어 갈 질문을 하나 한다.
출력은 JSON 하나만: {"reply": string, "memory": {"category": "love|work|money|family|growth|health|etc", "title": string(25자 이내, 고민 한 줄), "summary": string(60자 이내, 상담 요약)}}`;
  const ctx = `[사주 정보]\n${b.lines.join('\n')}${o.memories.length ? `\n[최근 기록]\n${o.memories.map((m) => `- ${m.happenedOn} ${m.category} ${m.title}${m.feedback ? ` (결과: ${m.feedback})` : ''}`).join('\n')}` : ''}`;
  const msgs: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: ctx }, { role: 'assistant', content: '{"reply":"알겠어요. 사주 정보를 참고해서 이야기할게요.","memory":null}' }];
  for (const m of o.history.slice(-12)) msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.role === 'user' ? m.text : JSON.stringify({ reply: m.text }) });
  msgs.push({ role: 'user', content: o.text });
  // 무료 상담은 가벼운 모델(FRIEND_MODEL_FREE), 이용권 질문은 고급 모델(FRIEND_MODEL) — 비용 보고 10/21
  const c = await callClaude(system, msgs, o.http ?? fetch, { kind: o.tier === 'free' ? 'friendFree' : 'friend', maxTokens: 900 });
  let reply = c.text.trim();
  try {
    const j = parseJson(c.text);
    reply = String(j.reply ?? reply);
    if (j.memory?.title) Object.assign(draft, { category: String(j.memory.category ?? draft.category), title: String(j.memory.title).slice(0, 40), summary: String(j.memory.summary ?? j.memory.title).slice(0, 120) });
  } catch { /* JSON 이 아니면 본문 그대로 */ }
  return { reply, draft, topic: topic.id, tokensIn: c.tokensIn, tokensOut: c.tokensOut, costKrw: c.costKrw, ai: true };
}
