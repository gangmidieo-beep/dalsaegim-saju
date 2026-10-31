// 달빛 상담 — 규칙형 답변의 '질문 의도' 읽기(R5 N11·C1).
// 원칙: ① 가장 최근 질문을 먼저 본다 ② "직장 말고·아니고" 같은 부정 표현에 걸린 주제는 뺀다
// ③ "세 가지·짧게·점수 없이" 같은 형식 요청을 지킨다 ④ 무엇을 묻는지 모르면 짧게 되묻는다.
import type { Dim } from '@dalsaegim/content';

export type Topic = { id: string; cat: 'love' | 'work' | 'money' | 'family' | 'growth' | 'health' | 'etc'; dim: Dim; label: string; field?: 'love' | 'work' | 'wealth' | 'health' };

// 앞에 있을수록 먼저 고른다(구체적인 주제 → 넓은 주제)
const TOPICS: (Topic & { re: RegExp })[] = [
  { id: 'study', cat: 'growth', dim: 'document', label: '시험·학업', re: /시험|공부|수능|내신|입시|자격증|합격|공무원|고시|토익|토플|모의고사|과제|성적|학업|필기|실기|면허|기출|수험|재수|편입/ },
  { id: 'promo', cat: 'work', dim: 'work', label: '승진·인정', field: 'work', re: /승진|진급|인사\s?평가|고과|보직|직급|평가 시즌|임원/ },
  { id: 'pet', cat: 'family', dim: 'family', label: '반려동물', re: /강아지|고양이|반려|댕댕|냥이|멍멍|펫|애완/ },
  { id: 'love', cat: 'love', dim: 'love', label: '연애·관계', field: 'love', re: /연애|남친|여친|남자\s?친구|여자\s?친구|썸|짝사랑|이별|헤어|재회|결혼|연인|고백|소개팅|사랑|궁합|그 사람|그사람/ },
  { id: 'money', cat: 'money', dim: 'wealth', label: '돈·재물', field: 'wealth', re: /돈|재물|투자|주식|코인|적금|대출|월급|이사|전세|월세|부동산|빚|지출|저축|매출/ },
  { id: 'work', cat: 'work', dim: 'work', label: '직장·일', field: 'work', re: /회사|직장|이직|퇴사|상사|동료|취업|면접|일이|업무|창업|부업|사업|커리어|출근/ },
  { id: 'family', cat: 'family', dim: 'family', label: '가족', re: /엄마|아빠|부모|가족|남편|아내|아이|자녀|시댁|친정|형제|언니|오빠|동생|어머니|아버지/ },
  { id: 'growth', cat: 'growth', dim: 'growth', label: '나 자신', field: 'health', re: /지쳐|힘들|우울|불안|번아웃|자존감|진로|방향|습관|건강|잠|무기력/ },
];
const byId = (id: string) => TOPICS.find((t) => t.id === id);

/** "상품 뭐 있어?", "가격이 얼마예요?", "나한테 맞는 풀이 추천해 줘" — 달새김 상품·가격·추천을 묻는 말 */
export const PRODUCT_ASK = /상품|가격|얼마(예요|에요|야|인가|죠|니)|요금|유료|무료로|이용권|결제|구매|살\s?수|판매|풀이\s?(종류|목록|뭐|가\s?있|는\s?뭐)|어떤\s?(풀이|서비스|운세)|서비스\s?(종류|목록|뭐)|메뉴|(풀이|운세).{0,8}추천|추천.{0,8}(풀이|상품|운세)/;
export const isProductAsk = (text: string) => PRODUCT_ASK.test(text);
const pub = (t: Topic & { re?: RegExp }): Topic => ({ id: t.id, cat: t.cat, dim: t.dim, label: t.label, field: t.field });

/** "직장 상담이 아니라", "직장 말고", "일 얘기는 빼고" → 그 부분을 지운 문장과, 지운 낱말 */
export function stripNegated(text: string) {
  const neg: string[] = [];
  const re = /([가-힣A-Za-z]{1,8})(?:\s*(?:상담|얘기|이야기|운|쪽|문제|고민|질문|답|답변))?(?:이|가|은|는|을|를)?\s*(?:아니(?:라|고|며|에요|예요|야|다|구요|라고)?|말고|빼고|말구|제외하고)/g;
  const rest = text.replace(re, (_m, w: string) => { neg.push(w); return ' '; });
  return { rest, neg };
}
const negatedTopics = (neg: string[]) => new Set(TOPICS.filter((t) => neg.some((w) => t.re.test(w))).map((t) => t.id));

/** 최근 질문의 주제. 없으면 이전 대화 주제 → 화면에서 고른 주제(id 또는 '시험·합격' 같은 이름). 그래도 없으면 null */
export function detectTopic(text: string, ...fallbacks: (string | null | undefined)[]): { topic: Topic | null; negated: Set<string>; fromText: boolean } {
  const { rest, neg } = stripNegated(text);
  const negated = negatedTopics(neg);
  const hit = TOPICS.find((t) => !negated.has(t.id) && t.re.test(rest));
  if (hit) return { topic: pub(hit), negated, fromText: true };
  for (const f of fallbacks) {
    if (!f) continue;
    const t = byId(f) ?? TOPICS.find((x) => x.re.test(f));
    if (t && !negated.has(t.id)) return { topic: pub(t), negated, fromText: false };
  }
  return { topic: null, negated, fromText: false };
}

/** 형식 요청 — 개수·짧게·점수/시기 빼기·행동 요청 */
export function detectFormat(text: string) {
  const KN: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
  const m = text.match(/(한|두|세|네|다섯|[1-5])\s*(?:가지|개|줄)/);
  const count = m ? KN[m[1]] : null;
  const short = /짧게|간단히|간단하게|한\s?줄|요점만|핵심만/.test(text);
  const noNumbers = /(점수|숫자|지수|퍼센트|%)[^.?!]{0,6}(없이|빼고|말고|필요\s?없)/.test(text) || /점수|숫자/.test(text) && /빼|없이|말고/.test(text);
  const noTiming = /(시기|날짜|몇\s?월|달)[^.?!]{0,6}(없이|빼고|말고|필요\s?없)/.test(text) || /시기/.test(text) && /빼|없이|말고/.test(text);
  const action = count != null || /할\s?일|방법|어떻게|뭘\s?해|뭐부터|계획|루틴|실천|행동/.test(text);
  return { count, short, noNumbers, noTiming, action };
}

// 주제별 '오늘 할 수 있는 행동' — 단정·보장 없이, 바로 할 수 있는 크기로
export const ACTIONS: Record<string, string[]> = {
  study: ['취약한 단원 하나를 먼저 고르세요', '타이머를 25분에 맞추고 그 단원만 집중해서 공부하세요', '틀린 문제 세 개를 골라 왜 틀렸는지 한 줄씩 적어 보세요', '잠들기 전 10분 동안 오늘 본 내용을 소리 내어 다시 말해 보세요', '내일 공부할 범위를 지금 한 줄로 정해 두세요'],
  promo: ['최근에 해낸 일 세 가지를 한 줄씩 정리해 두세요', '면담에서 맡고 싶은 역할을 한 문장으로 준비하세요', '함께 일한 동료에게 짧은 감사 인사를 전해 보세요', '이번 주 마감 하나를 하루 일찍 끝내 보세요', '내가 성장한 점을 윗사람이 알 수 있게 기록으로 남기세요'],
  pet: ['오늘 산책이나 놀이 시간을 10분만 더 함께해 보세요', '처음 만난 날을 떠올리며 사진 한 장과 한 줄 기록을 남겨 보세요', '물·밥·잠자리를 한 번 더 살펴보세요', '평소와 다른 모습이 보이면 혼자 판단하지 말고 동물병원에 물어보세요', '오늘 고마웠던 순간 하나를 기록해 두세요'],
  love: ['그 사람에게 하고 싶은 말을 한 문장으로 먼저 적어 보세요', '답을 재촉하지 말고 가벼운 안부 한마디로 시작하세요', '내가 이 관계에서 원하는 것 하나를 분명히 해 두세요', '오늘은 나를 위한 시간 30분을 꼭 챙기세요', '대화가 편했던 순간을 떠올리며 그때의 말투로 다가가 보세요'],
  money: ['이번 달 고정지출을 한 번 적어 보세요', '미뤄 둔 작은 지출 하나를 오늘 정리하세요', '큰 결정은 하루 미루고 숫자를 한 번 더 확인하세요', '수입이 들어오면 먼저 떼어 둘 금액을 정해 두세요', '돈 이야기를 나눌 사람과 약속을 문서로 남기세요'],
  work: ['오늘 꼭 끝낼 일 하나만 먼저 정하세요', '미뤄 둔 연락 하나를 오전에 처리하세요', '퇴근 전 10분 동안 내일 할 일을 세 줄로 적어 두세요', '도움이 필요한 부분을 한 사람에게 구체적으로 부탁해 보세요', '지금 고민을 장점·걱정 두 칸으로 나눠 적어 보세요'],
  family: ['안부 메시지 한 통을 먼저 보내 보세요', '서운했던 일 하나를 비난 없이 한 문장으로 적어 보세요', '함께 밥 먹을 시간을 하나 정해 보세요', '내가 할 수 있는 몫과 없는 몫을 나눠 보세요', '고마웠던 일 하나를 말로 전해 보세요'],
  growth: ['오늘은 잠을 30분 더 확보해 보세요', '마음에 걸리는 일을 종이에 다 적고 하나만 고르세요', '10분 걷기로 몸부터 움직여 보세요', '나에게 한 칭찬 한 줄을 기록해 두세요', '오늘 할 일을 세 개로만 줄여 보세요'],
};
// 주제별 마무리 질문(사랑 질문이 시험 상담에 붙지 않게)
export const CLOSE: Record<string, string> = {
  study: '지금 가장 자신 없는 과목이나 단원은 무엇인가요?',
  promo: '이번에 가장 인정받고 싶은 일은 무엇인가요?',
  pet: '아이와 함께한 시간 중 가장 기억에 남는 장면은 무엇인가요?',
  love: '지금 그 사람에게 가장 듣고 싶은 말은 무엇인가요?',
  money: '지금 가장 먼저 정리하고 싶은 돈 문제는 무엇인가요?',
  work: '이번 주 안에 할 수 있는 작은 행동 하나는 무엇일까요?',
  family: '요즘 가장 마음이 쓰이는 가족은 누구인가요?',
  growth: '오늘 나를 가장 지치게 한 일은 무엇이었나요?',
};
export const CLARIFY = '어떤 쪽 고민인지 한 번만 알려 주실래요? 연애·일·돈·시험·가족·반려동물 중에서 골라 주시면 거기에 맞춰 이야기할게요.';
