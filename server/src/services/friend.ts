// 달빛 상담(상담사 6명) — 사주를 쉽게 설명하고 지금 상황과 연결해 주는 안내자(일반 심리상담 챗봇이 아님).
// 답할 때 참고: 사주지도 요약 · 오늘/이번 달 흐름 · 고민 분야의 앞으로 흐름 · (동의 시) 최근 기록 5개.
// 매 답변과 함께 "달새김 기억" 요약 초안을 만든다 → 화면에서 [저장][수정][남기지 않기].
// AI 키가 없으면(또는 FRIEND_AI 가 live 가 아니면) 계산 결과로 짧은 답을 만든다(흐름 확인·시연용).
import { calcSaju, type SajuResult } from '@dalsaegim/engine';
import { sajuMap, todayFortune, monthFortune, nextMonths, toRanges, pick, personaOf, type Dim } from '@dalsaegim/content';
import { callClaude, parseJson } from './reading/generate.ts';
import { aiCapReached, aiProvider } from './ai.ts';
import { ACTIONS, CLARIFY, CLOSE, detectFormat, detectTopic, isPayTrouble, isProductAsk } from './friendRules.ts';
import brand from '../../../brand.config.json' with { type: 'json' };

export type ChatMsg = { role: 'user' | 'friend'; text: string; at: string; products?: RecProduct[] };
export type MemoryDraft = { category: string; title: string; summary: string; sajuNote: string };
// 상담사가 추천할 수 있는 달새김 상품(실제 상품표에서 읽어 온다 — 가격·이름을 지어내지 않게)
export type CatalogItem = { id: string; title: string; price: number; series: string | null; cardCopy: string | null; adult?: boolean };
export type RecProduct = { id: string; title: string; price: number; line: string };
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

// 고민 주제·질문 낱말에 맞는 상품 1~3개(목록에 있는 것만). 투자 상품은 '종목 권유'로 읽히지 않게 직접 물을 때만.
export function recommendProducts(cat: CatalogItem[], topicId: string | null, text: string): CatalogItem[] {
  const has = (id: string) => cat.find((p) => p.id === id && !p.adult);
  const wants: string[] = [];
  const t = text;
  if (/재회|헤어|다시\s?(만|연락|닿)/.test(t)) wants.push('reunion');
  if (/결혼|배우자|혼인/.test(t)) wants.push('marriage');
  if (/궁합/.test(t)) wants.push('gunghap');
  if (/썸|그\s?사람\s?(마음|속)|타로/.test(t)) wants.push('tarot_some');
  if (/사업|창업|동업/.test(t)) wants.push('money_business');
  if (/투자|주식|코인/.test(t)) wants.push('money_invest');
  if (/집|이사|전세|월세|부동산|매매/.test(t)) wants.push('money_estate');
  if (/신년|내년|2027|새해/.test(t)) wants.push('newyear_2027');
  if (/이직|취업|직업|커리어|면접/.test(t)) wants.push('career');
  if (/mbti|엠비티아이/i.test(t)) wants.push('mbti_deep');
  if (/이번\s?달|다음\s?달|월간|이\s?달/.test(t)) wants.push('month_detail');
  const byTopic: Record<string, string[]> = {
    love: ['love_flow', 'gunghap', 'reunion'], money: ['money_wealth', 'money_pack'], work: ['career', 'path_deep'], promo: ['career', 'path_deep'],
    study: ['path_deep', 'month_detail'], family: ['path_deep', 'lifetime'], growth: ['lifetime', 'mbti_deep'], pet: [],
  };
  const order = [...wants, ...(topicId ? byTopic[topicId] ?? [] : []), 'newyear_2027', 'lifetime', 'love_flow', 'money_wealth'];
  const out: CatalogItem[] = [];
  for (const id of order) { const p = has(id); if (p && !out.includes(p)) out.push(p); if (out.length === 3) break; }
  return out;
}
const lite = (p: CatalogItem): RecProduct => ({ id: p.id, title: p.title, price: p.price, line: (p.cardCopy ?? '').slice(0, 60) });
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

// 다른 사람을 위해 묻는지 — "진순숙 사장님에게 맞는 상품", "엄마한테 좋은 풀이" (11/1 대표님: 남의 이름을 말해도 내 이름으로 답하던 것)
const KIN = '엄마|아빠|어머니|아버지|어머님|아버님|남편|아내|와이프|신랑|딸|아들|언니|오빠|누나|형|동생|친구|남자\\s?친구|여자\\s?친구|남친|여친|애인|할머니|할아버지|시어머니|장모님|손님|고객|지인|동료|상사|부모님';
const TITLED = '[가-힣]{2,4}\\s?(?:사장님|대표님|선생님|원장님|고객님|님|씨)';
const OTHER_RE = [ // 그 사람을 위한 질문일 때만: '~에게·~한테·~께·~의 사주', 호칭 붙은 이름은 '~사장님이/께서'도
  new RegExp(`(?:^|[\\s,])(${TITLED}|${KIN})\\s?(?:에게|한테|께(?!서)|의\\s?(?=사주|운세|궁합|운|풀이))`, 'u'),
  new RegExp(`(?:^|[\\s,])(${TITLED})\\s?(?:이|가|은|는|께서)(?=[\\s,.?!]|$)`, 'u'),
];
export function otherPerson(text: string, myName: string): string | null {
  const m = OTHER_RE.map((r) => r.exec(text)).find(Boolean);
  if (!m) return null;
  const who = m[1].replace(/\s+/g, ' ').trim();
  const bare = who.replace(/\s?(사장님|대표님|선생님|원장님|고객님|님|씨)$/, '');
  if (bare === myName || bare === myName.slice(1)) return null; // 내 이름(또는 이름만)을 부른 것
  if (/^(상담사|서월|서연|연화|할매|사주박사|박사|청운|준호|달빛)/.test(bare)) return null; // 상담사를 부른 것
  return /(님|씨)$/.test(who) ? who : `${who}`;
}

export async function friendReply(o: {
  profile: ProfileRow; history: ChatMsg[]; text: string; topicHint?: string | null; memories: { happenedOn: string; category: string; title: string; feedback: string | null }[];
  persona?: string | null; http?: typeof fetch; now?: Date; tier?: 'free' | 'pass'; noAI?: boolean; catalog?: CatalogItem[];
  others?: ProfileRow[]; // 내가 저장해 둔 다른 사람 사주(이름이 질문에 나오면 그 사람 사주로 본다)
}) {
  const now = o.now ?? new Date();
  const pe = personaOf(o.persona);
  const lastTopic = [...o.history].reverse().find((m) => m.role === 'user');
  const det = detectTopic(o.text, o.topicHint, lastTopic ? detectTopic(lastTopic.text).topic?.id : null, o.memories[0]?.category);
  const fmt = detectFormat(o.text);
  const topic = det.topic ?? { id: 'growth', cat: 'growth' as const, dim: 'growth' as Dim, label: '나 자신', field: 'health' as const };
  // 질문 속 사람: 저장한 사주에 그 이름이 있으면 그 사람 사주로, 없으면 이름만 알고 본인 사주는 쓰지 않는다
  const saved = (o.others ?? []).find((p) => p.id !== o.profile.id && p.name && p.name.length >= 2 && o.text.includes(p.name));
  const subject = saved ?? o.profile;
  const otherName = saved ? null : otherPerson(o.text, o.profile.name);
  const callName = otherName ?? `${subject.name} 님`;
  const b = sajuBrief(subject, topic.dim, now);
  const draft: MemoryDraft = {
    category: topic.cat,
    title: o.text.replace(/\s+/g, ' ').slice(0, 40),
    summary: `${topic.label} 고민을 달빛 상담사와 나눔.${fmt.noTiming || topic.id === 'pet' ? '' : ` 사주 흐름상 ${b.good}에 기운이 살아나고, ${b.careful}에는 쉬어 가면 좋은 시기.`}`,
    sajuNote: `${topic.label} · 좋은 시기 ${b.good} / 신중한 시기 ${b.careful}`,
  };
  // 결제 문제는 상담사가 추측하지 않고 확인 방법·문의처를 바로 안내(AI 호출 없음)
  if (isPayTrouble(o.text)) {
    const b = (brand as any).business ?? {};
    const reply = `결제 때문에 많이 놀라셨죠. 결제는 제가 직접 확인할 수 없어서, 정확한 확인 방법을 먼저 알려 드릴게요.\n① 카드사·은행에서 온 '승인' 문자가 있는지 봐 주세요. 결제창만 열렸다 닫힌 건 돈이 나가지 않아요.\n② 승인 문자가 여러 번 왔다면 주문 시각과 금액을 ${b.kakao ? '아래 카카오톡 채널' : '고객센터'}${b.phone ? `(${b.phone})` : ''}로 알려 주세요. 확인한 뒤 중복된 결제는 취소해 드려요.\n③ 이미 결제된 풀이는 [보관함 → 구매한 운세]에서 다시 볼 수 있어요.\n확인되는 동안 마음이 쓰이는 다른 이야기가 있으면 편하게 들려주세요.`;
    return { reply, draft: null, products: [], topic: 'etc', tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
  }
  const catalog = (o.catalog ?? []).filter((p) => !p.adult);
  const productAsk = isProductAsk(o.text);
  if (!friendLive() || o.noAI) {
    // 상품·가격·추천을 물으면 실제 상품표에서 고민에 맞는 것을 소개한다(기록 초안은 만들지 않음)
    if (productAsk && catalog.length) {
      const recs = recommendProducts(catalog, det.topic?.id ?? o.topicHint ?? null, o.text);
      const list = recs.map((p) => `· ${p.title} — ${won(p.price)}`).join('\n'); // 설명은 아래 상품 카드에 붙으니 이름·가격만
      const first = recs[0];
      const reply = otherName
        ? `${otherName}께 권해 드리기 좋은 달새김 풀이를 골라 봤어요.\n${list}\n\n${first ? `처음이시라면 '${first.title}'부터 보시면 전체 흐름을 한눈에 볼 수 있어요. ` : ''}${otherName}의 생년월일을 [마이 → 사주 정보 추가]에 넣어 두시면 그분 사주로 더 꼭 맞게 골라 드릴게요. 어떤 고민이 있으신 분인가요?`
        : `${callName}께 맞을 만한 달새김 풀이를 골라 봤어요.\n${list}\n\n${first ? `${det.topic ? `${det.topic.label} 고민이라면 ` : ''}'${first.title}'부터 보시면 사주 흐름이 가장 선명하게 보일 거예요. ` : ''}지금 가장 궁금한 건 어떤 쪽이에요?`;
      return { reply, draft: null, products: recs.map(lite), topic: 'product', tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
    }
    // 무엇을 묻는지 알 수 없으면(첫마디가 짧고 주제가 없을 때) 짧게 되묻는다
    if (!det.topic && (o.history.length === 0 || det.negated.size > 0) && o.text.replace(/\s/g, '').length < 25) {
      return { reply: `${pick(pe.empathy, `${o.text}:e`)} ${CLARIFY}`, draft: { ...draft, category: 'etc', summary: '상담 주제를 묻는 중' }, products: [], topic: 'etc', tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
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
      reply = `${empathy} ${recall}${otherName ? `${otherName}의 생년월일을 알면 그분 사주로 볼 수 있어요. 우선 지금 이야기로 보면,` : `${callName} 사주에서 보면,`} ${area?.line ?? b.map.dayMaster.line}${timing ? `\n\n${timing}` : ''}${fieldScore}\n\n${topic.id === 'love' ? pe.close : CLOSE[topic.id] ?? pe.close}`;
    }
    return { reply, draft, products: [], topic: topic.id, tokensIn: 0, tokensOut: 0, costKrw: 0, ai: false };
  }
  const system = `너는 사주 서비스 "달새김사주"의 달빛 상담 AI 상담사 "${pe.name}"(${pe.title})이다. 말투: ${pe.tone} 3~6문장(최대 400자)으로 답한다.
역할: 사주 결과를 쉽게 설명하고 사용자의 실제 상황과 연결해 주는 안내자. 일반 심리상담·의료·법률·투자 자문을 하지 않는다.
원칙: 사주는 결정을 대신하지 않는 참고 정보다. 단정·공포 표현 금지. 종목·매수·매도 금지. 자해·위기 신호가 보이면 공감하고 전문 상담(자살예방 상담전화 109)을 안내한다.
가장 최근 질문의 의도를 가장 먼저 따른다: 이전 주제에 고정하지 말고, \"아니다·말고\" 같은 부정 표현과 \"세 가지·짧게·점수 없이\" 같은 형식 요청을 그대로 지킨다. 무엇을 묻는지 모호하면 짧게 되묻는다. 시험·합격·승진은 결과를 보장하지 않는다. 반려동물의 수명·질병은 단정하지 않고 동물병원 상담을 권한다.\n아래 사주 정보의 숫자·시기와 어긋나지 않게 말하되, 질문과 관계없는 점수·시기는 꺼내지 않는다. 마지막에 대화를 이어 갈 질문을 하나 한다.
달새김 상품: 아래 [달새김 상품] 목록이 지금 판매 중인 전부다. 상품·가격·추천을 물으면 "모른다"고 하지 말고 이 목록에서 고객 상황에 맞는 1~3개를 이름·가격·이유와 함께 권한다. 목록에 없는 상품·가격은 지어내지 않는다. 묻지 않았는데 상품을 들이밀지 않되, 고민과 꼭 맞는 풀이가 있으면 답 끝에 한 줄로 가볍게 권할 수 있다. 투자 풀이는 종목 권유가 아니라 흐름 참고 자료라고 말한다.
출력은 JSON 하나만: {"reply": string, "memory": {"category": "love|work|money|family|growth|health|etc", "title": string(25자 이내, 고민 한 줄), "summary": string(60자 이내, 상담 요약)} | null, "products": string[](권한 상품의 id 0~3개, 상품 이야기를 했을 때만)}
다른 사람을 위해 묻는 경우: [사주 정보]는 그 정보에 적힌 사람의 것이다. 질문 속 사람이 그 사람이 아니면 그 사주를 그 사람 것처럼 말하지 않고, 질문한 사람 이름으로 부르지도 않는다. 질문 속 호칭 그대로(예: 진순숙 사장님) 부르며 그분 상황에 맞는 상품을 권하고, 그분 생년월일을 [마이 → 사주 정보 추가]에 넣으면 그분 사주로 더 정확히 볼 수 있다고 한 줄 안내한다.
상품만 묻고 고민이 없는 말이면 memory 는 null 로 둔다. reply 에 **굵게** 같은 마크다운 기호는 쓰지 않는다(말풍선에 기호가 그대로 보인다).`;
  const ctx = `${otherName ? `[질문 속 사람] ${otherName} — 생년월일 모름. 아래 사주 정보는 질문한 ${o.profile.name} 님 본인 것이니 ${otherName}의 사주로 쓰지 말 것\n` : saved ? `[질문 속 사람] ${saved.name} 님 — 질문한 사람이 저장해 둔 사주. 아래 사주 정보가 ${saved.name} 님 것\n` : ''}[사주 정보]\n${b.lines.join('\n')}${catalog.length ? `\n[달새김 상품] id · 이름 · 가격 · 한 줄\n${catalog.map((p) => `- ${p.id} · ${p.title} · ${won(p.price)} · ${p.cardCopy ?? ''}`).join('\n')}` : ''}${o.memories.length ? `\n[최근 기록]\n${o.memories.map((m) => `- ${m.happenedOn} ${m.category} ${m.title}${m.feedback ? ` (결과: ${m.feedback})` : ''}`).join('\n')}` : ''}`;
  const msgs: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: ctx }, { role: 'assistant', content: '{"reply":"알겠어요. 사주 정보를 참고해서 이야기할게요.","memory":null}' }];
  for (const m of o.history.slice(-12)) msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.role === 'user' ? m.text : JSON.stringify({ reply: m.text }) });
  msgs.push({ role: 'user', content: o.text });
  // 무료 상담은 가벼운 모델(FRIEND_MODEL_FREE), 이용권 질문은 고급 모델(FRIEND_MODEL) — 비용 보고 10/21
  const c = await callClaude(system, msgs, o.http ?? fetch, { kind: o.tier === 'free' ? 'friendFree' : 'friend', maxTokens: 900 });
  let reply = c.text.trim();
  let products: RecProduct[] = [];
  let memoryNull = false;
  try {
    const j = parseJson(c.text);
    reply = String(j.reply ?? reply).replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,!?])/g, '$1$2'); // 마크다운 굵게·기울임 기호 제거
    if (j.memory?.title) Object.assign(draft, { category: String(j.memory.category ?? draft.category), title: String(j.memory.title).slice(0, 40), summary: String(j.memory.summary ?? j.memory.title).slice(0, 120) });
    else if (j.memory === null && productAsk) memoryNull = true;
    if (Array.isArray(j.products)) products = (j.products as unknown[]).map((id) => catalog.find((p) => p.id === String(id))).filter((p): p is CatalogItem => !!p).slice(0, 3).map(lite);
  } catch { /* JSON 이 아니면 본문 그대로 */ }
  // 상품을 물었는데 AI 가 상품 카드를 고르지 않았으면 규칙으로 골라 준다(화면에 상품 카드가 붙게)
  if (productAsk && !products.length && catalog.length) products = recommendProducts(catalog, det.topic?.id ?? o.topicHint ?? null, o.text).map(lite);
  const onlyProduct = productAsk && !det.fromText;
  return { reply, draft: memoryNull || onlyProduct ? null : draft, products, topic: onlyProduct ? 'product' : topic.id, tokensIn: c.tokensIn, tokensOut: c.tokensOut, costKrw: c.costKrw, ai: true };
}
