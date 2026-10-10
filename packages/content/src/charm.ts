// 나만의 황금 달빛 부적 — 소망 유형 5가지(문양·이름·소망 문구·축원). 금전적 성과·수익을 보장하는 표현은 쓰지 않는다.
export type CharmType = 'business' | 'wealth' | 'estate' | 'work' | 'goal';
export const CHARMS: { id: CharmType; label: string; name: string; symbol: string; wishes: string[]; bless: string }[] = [
  { id: 'business', label: '사업운', name: '황금 사업번창부', symbol: '상승과 번창의 금빛 날개',
    wishes: ['지금까지 쌓아온 노력과 정성이 풍요로운 결실로 이어지기를', '하는 일마다 좋은 사람과 좋은 기회가 함께하기를', '새로 시작하는 일이 단단히 뿌리내리기를'],
    bless: '달빛이 당신의 길을 환히 비추기를 기원합니다' },
  { id: 'wealth', label: '재물운', name: '황금 재물풍요부', symbol: '풍요와 순환의 황금 원',
    wishes: ['들어온 복이 머물고, 머문 복이 다시 순환하기를', '필요한 때에 필요한 만큼 넉넉하기를', '알뜰히 모은 정성이 든든한 힘이 되기를'],
    bless: '둥근 달처럼 넉넉한 날들이 이어지기를 기원합니다' },
  { id: 'estate', label: '부동산운', name: '황금 안택부', symbol: '안정과 터전의 산과 대지',
    wishes: ['마음 편히 쉴 수 있는 나만의 보금자리를 만나기를', '머무는 곳마다 평안과 웃음이 깃들기를', '좋은 때에 좋은 터와 인연이 닿기를'],
    bless: '달빛 아래 편안한 터전이 함께하기를 기원합니다' },
  { id: 'work', label: '직장운', name: '황금 승진성취부', symbol: '성장과 성취의 월계 문양',
    wishes: ['쌓아 온 실력과 노력이 정당하게 인정받기를', '함께 일하는 사람들과 좋은 흐름을 만들기를', '한 계단 더 높은 곳에서 나다운 꽃을 피우기를'],
    bless: '빛나는 걸음마다 좋은 결실이 따르기를 기원합니다' },
  { id: 'goal', label: '성취운', name: '황금 합격성취부', symbol: '목표를 비추는 별빛',
    wishes: ['간절히 준비한 시험에서 실력을 모두 펼치기를', '세운 목표를 끝까지 이루어 내기를', '흔들리는 날에도 나를 믿는 마음이 단단하기를'],
    bless: '별빛이 당신의 목표를 끝까지 비추기를 기원합니다' },
];
export const charmOf = (id?: string | null) => CHARMS.find((c) => c.id === id) ?? CHARMS[0];

// 부적과 함께 적는 '실제 목표 한 줄' 예시와, 소망과 이어지는 운세(재물·사업·부동산·직장·미래)
export const CHARM_GOAL_HINT: Record<CharmType, string> = {
  business: '예) 올해 신규 거래처 3곳 확보', wealth: '예) 연말까지 비상금 통장 채우기', estate: '예) 내년 봄, 마음에 드는 집으로 이사',
  work: '예) 올해 안에 맡은 프로젝트 잘 마무리', goal: '예) 11월 자격증 시험 합격',
};
export const CHARM_LINK: Record<CharmType, { to: string; label: string }> = {
  business: { to: '/money/business', label: '나의 사업운 흐름 보기' }, wealth: { to: '/money/wealth', label: '나의 재물운 흐름 보기' },
  estate: { to: '/money/estate', label: '나의 부동산운 흐름 보기' }, work: { to: '/path?cat=work', label: '직장·이직 고민의 길 보기' },
  goal: { to: '/path?cat=future', label: '미래·학업 고민의 길 보기' },
};
export const CHARM_STATUS: Record<'start' | 'doing' | 'done', string> = { start: '막 새겼어요', doing: '진행 중이에요', done: '이루었어요' };
