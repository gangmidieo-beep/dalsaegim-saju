// 달빛 상담 이용권 판매 조건 — 상세·주문·마이·약관·환불정책이 모두 이 한 곳의 값을 쓴다(R5 N1·N7·D2).
// 값은 brand.config.json(friend_pass: questions·days·price / friend: freePerDay·refundDays / legal: 공고·시행일)
import brand from '../../../brand.config.json';

const P = brand.products.find((p) => p.id === 'friend_pass') as { price: number; questions?: number; days?: number; title: string };
export const PASS = {
  title: P.title,
  price: P.price,
  q: P.questions ?? 10,
  days: P.days ?? 90,
  free: brand.friend.freePerDay,
  refundDays: (brand.friend as { refundDays?: number }).refundDays ?? 7,
};
/** 질문 1회 값(환불 계산용) — 9,900원 / 10회 = 990원 */
export const PER_Q = Math.floor(PASS.price / PASS.q);
const n = (x: number) => x.toLocaleString('ko-KR');

/** 이용권 사용 조건 — 상세·주문·약관에 같은 문장으로 */
export const PASS_TERMS = [
  `구매한 질문 ${PASS.q}회를 ${PASS.days}일 동안 사용할 수 있어요.`,
  `매일 무료 상담 ${PASS.free}회를 먼저 쓰고, 그다음 질문부터 이용권에서 1회씩 차감돼요.`,
  '답변이 정상으로 도착했을 때만 차감돼요. 오류·시간 초과로 답을 받지 못하면 차감되지 않아요.',
  `${PASS.days}일이 지나면 남은 질문은 사라지고, 자동 결제되지 않아요.`,
  '상담사 6명 누구와 이야기해도 같은 이용권을 써요.',
];
/** 이용권 환불 기준 */
export const PASS_REFUND = [
  `결제 후 ${PASS.refundDays}일 안에 이용권 질문을 한 번도 쓰지 않았다면 청약철회로 전액(${n(PASS.price)}원) 환불해 드려요.`,
  `그 밖에는 유효기간(${PASS.days}일) 안에서 남은 질문 수 × ${n(PER_Q)}원을 환불해 드려요.`,
  '무료 상담 횟수는 환불 계산에 들어가지 않아요.',
];

const dot = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${y}년 ${m}월 ${d}일`; };
const L = (brand as { legal?: { noticeDate: string; effectiveDate: string } }).legal ?? { noticeDate: '2026-10-23', effectiveDate: '2026-10-23' };
export const LEGAL_DATES = `공고일 ${dot(L.noticeDate)} · 시행일 ${dot(L.effectiveDate)}`;
