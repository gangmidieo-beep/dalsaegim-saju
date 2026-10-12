// 나만의 황금 달빛 부적 — 대표님 리뉴얼 시안(v29)의 9가지 소망(+예전 안택부는 저장본 보기용).
// 문양(한자 인장)·색·소망 문구·축원. 금전적 성과·건강 효능을 보장하는 표현은 쓰지 않는다.
export type CharmType = 'goal' | 'business' | 'love' | 'health' | 'family' | 'wish' | 'wealth' | 'work' | 'calm' | 'estate';
type Charm = { id: CharmType; label: string; sub: string; name: string; mark: string; tint: string; base: string; symbol: string; wishes: string[]; bless: string; hidden?: boolean };
export const ALL_CHARMS: Charm[] = [
  { id: 'goal', label: '합격성취부', sub: '시험 · 취업', name: '황금 합격성취부', mark: '學', tint: '#f2c46b', base: 'goal', symbol: '목표를 비추는 별빛',
    wishes: ['간절히 준비한 시험에서 실력을 모두 펼치기를', '세운 목표를 끝까지 이루어 내기를', '흔들리는 날에도 나를 믿는 마음이 단단하기를'],
    bless: '별빛이 당신의 목표를 끝까지 비추기를 기원합니다' },
  { id: 'business', label: '사업번창부', sub: '사업 · 재물', name: '황금 사업번창부', mark: '商', tint: '#e8b45a', base: 'business', symbol: '상승과 번창의 금빛 날개',
    wishes: ['지금까지 쌓아온 노력과 정성이 풍요로운 결실로 이어지기를', '하는 일마다 좋은 사람과 좋은 기회가 함께하기를', '새로 시작하는 일이 단단히 뿌리내리기를'],
    bless: '달빛이 당신의 길을 환히 비추기를 기원합니다' },
  { id: 'love', label: '연애인연부', sub: '연애 · 인연', name: '황금 연애인연부', mark: '緣', tint: '#f29bb6', base: 'wealth', symbol: '두 마음을 잇는 붉은 달빛',
    wishes: ['서로를 아끼는 좋은 인연과 닿기를', '지금의 사랑이 더 깊고 편안해지기를', '내 마음을 솔직하게 전할 용기가 생기기를'],
    bless: '달빛이 두 사람의 마음을 다정히 잇기를 기원합니다' },
  { id: 'health', label: '건강수호부', sub: '본인 · 부모님', name: '황금 건강수호부', mark: '康', tint: '#8fd1a8', base: 'wealth', symbol: '몸과 마음을 감싸는 푸른 기운',
    wishes: ['사랑하는 가족이 늘 건강하고 평안하기를', '몸과 마음이 매일 조금씩 가벼워지기를', '쉬어야 할 때 잘 쉬고 다시 힘을 내기를'],
    bless: '맑은 달빛처럼 건강한 날들이 이어지기를 기원합니다' },
  { id: 'family', label: '가족평안부', sub: '가족 · 화목', name: '황금 가족평안부', mark: '家', tint: '#f0b27a', base: 'estate', symbol: '온기를 품은 집과 등불',
    wishes: ['우리 가족이 서로를 웃으며 아끼기를', '집에 들어서는 순간마다 평안이 깃들기를', '어려운 날에도 가족이 서로의 힘이 되기를'],
    bless: '달빛 아래 가족의 웃음이 오래 머물기를 기원합니다' },
  { id: 'wish', label: '소원성취부', sub: '일상 · 새로운 시작', name: '황금 소원성취부', mark: '願', tint: '#b9a2f0', base: 'goal', symbol: '새 길을 여는 첫 별',
    wishes: ['새로 시작하는 일이 좋은 흐름을 타기를', '마음속 오래된 소원이 한 걸음 가까워지기를', '오늘의 작은 결심이 내일의 변화가 되기를'],
    bless: '첫 별처럼 새로운 시작이 빛나기를 기원합니다' },
  { id: 'wealth', label: '재물복덕부', sub: '저축 · 풍요', name: '황금 재물복덕부', mark: '福', tint: '#f3d077', base: 'wealth', symbol: '풍요와 순환의 황금 원',
    wishes: ['들어온 복이 머물고, 머문 복이 다시 순환하기를', '필요한 때에 필요한 만큼 넉넉하기를', '알뜰히 모은 정성이 든든한 힘이 되기를'],
    bless: '둥근 달처럼 넉넉한 날들이 이어지기를 기원합니다' },
  { id: 'work', label: '취업성공부', sub: '진로 · 면접', name: '황금 취업성공부', mark: '成', tint: '#9cc4f2', base: 'work', symbol: '성장과 성취의 월계 문양',
    wishes: ['준비한 만큼 면접에서 나를 잘 보여 주기를', '나에게 꼭 맞는 일과 자리를 만나기를', '쌓아 온 실력과 노력이 정당하게 인정받기를'],
    bless: '빛나는 걸음마다 좋은 결실이 따르기를 기원합니다' },
  { id: 'calm', label: '마음안정부', sub: '위로 · 회복', name: '황금 마음안정부', mark: '安', tint: '#9fd8d4', base: 'wealth', symbol: '고요히 내려앉는 달빛 물결',
    wishes: ['불안한 마음이 조금씩 잔잔해지기를', '나를 다그치지 않고 다정하게 대하기를', '오늘 밤은 깊고 편안하게 잠들기를'],
    bless: '고요한 달빛이 마음을 다독이기를 기원합니다' },
  { id: 'estate', label: '안택부', sub: '집 · 이사', name: '황금 안택부', mark: '宅', tint: '#e8c27a', base: 'estate', symbol: '안정과 터전의 산과 대지', hidden: true,
    wishes: ['마음 편히 쉴 수 있는 나만의 보금자리를 만나기를', '머무는 곳마다 평안과 웃음이 깃들기를', '좋은 때에 좋은 터와 인연이 닿기를'],
    bless: '달빛 아래 편안한 터전이 함께하기를 기원합니다' },
];
/** 고를 수 있는 9가지(안택부는 예전 저장본 보기용으로만 남김) */
export const CHARMS = ALL_CHARMS.filter((c) => !c.hidden);
export const charmOf = (id?: string | null) => ALL_CHARMS.find((c) => c.id === id) ?? CHARMS[0];

// 부적과 함께 적는 '실제 목표 한 줄' 예시와, 소망과 이어지는 운세(재물·사업·부동산·직장·미래)
export const CHARM_GOAL_HINT: Record<CharmType, string> = {
  business: '예) 올해 신규 거래처 3곳 확보', wealth: '예) 연말까지 비상금 통장 채우기', estate: '예) 내년 봄, 마음에 드는 집으로 이사',
  work: '예) 상반기 안에 원하는 회사 최종 합격', goal: '예) 11월 자격증 시험 합격', love: '예) 이번 달, 마음을 먼저 표현해 보기',
  health: '예) 주 3번 30분 걷기', family: '예) 한 달에 한 번 가족 식사', wish: '예) 올해 안에 새 취미 시작하기', calm: '예) 잠들기 전 10분 휴대폰 내려놓기',
};
export const CHARM_LINK: Record<CharmType, { to: string; label: string }> = {
  business: { to: '/money/business', label: '나의 사업운 흐름 보기' }, wealth: { to: '/money/wealth', label: '나의 재물운 흐름 보기' },
  estate: { to: '/money/estate', label: '나의 부동산운 흐름 보기' }, work: { to: '/path?cat=work', label: '직장·이직 고민의 길 보기' },
  goal: { to: '/path?cat=future', label: '미래·학업 고민의 길 보기' }, love: { to: '/love', label: '나의 연애·재회 운세 보기' },
  health: { to: '/today?tab=health', label: '오늘의 건강운 보기' }, family: { to: '/path?cat=family', label: '가족·관계 고민의 길 보기' },
  wish: { to: '/product/newyear_2027', label: '2027 신년운세 보기' }, calm: { to: '/letter/new', label: '나에게 달빛 편지 받기' },
};
export const CHARM_STATUS: Record<'start' | 'doing' | 'done', string> = { start: '막 새겼어요', doing: '진행 중이에요', done: '이루었어요' };
