// 결혼운 · 직업운 — 엔진 계산(배우자 자리·십성 무리·앞으로 12달 흐름)으로 장별 문단을 만든다. AI 가 켜져 있으면 이 사실을 바탕으로 문장을 다듬는다.
// 단정 금지: 결혼 시기·배우자를 확정하지 않고 "기운이 가까워지는 시기"로 말한다.
import { kstParts, type SajuResult } from '@dalsaegim/engine';
import { pick } from './core';
import { sajuMap } from './map';
import { nextMonths } from './path';

type M = { year: number; month: number; score: number };
/** 앞으로 12달 가운데 고른 달 — 올해와 내년이 섞이면 "2027년 3월"처럼 해를 붙인다 */
export function monthsLabel(xs: M[], now = new Date()) {
  const y0 = kstParts(now).year;
  const sorted = [...xs].sort((a, b) => a.year - b.year || a.month - b.month);
  return sorted.map((x) => (x.year === y0 ? `${x.month}월` : `${x.year}년 ${x.month}월`)).join(', ');
}
const topN = (xs: M[], n: number) => [...xs].sort((a, b) => b.score - a.score).slice(0, n);
const lowN = (xs: M[], n: number) => [...xs].sort((a, b) => a.score - b.score).slice(0, n);
const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length));
const blend = (...rows: M[][]): M[] => rows[0].map((r, i) => ({ year: r.year, month: r.month, score: avg(rows.map((x) => x[i].score)) }));
const rowOf = (saju: SajuResult, label: string) => (saju.tenGods as any).rows?.find((r: any) => r.pillar === label);
const cnt = (saju: SajuResult, ...k: string[]) => k.reduce((s, x) => s + ((saju.tenGods.counts as Record<string, number>)[x] ?? 0), 0);

/* ---------- 결혼운 ---------- */
// 일지(배우자 자리)의 십성 — 결혼 생활에서 드러나는 결
const SPOUSE: Record<string, { mate: string; life: string; keep: string }> = {
  비견: { mate: '친구처럼 대등하게 마주 보는 사람', life: '서로의 영역을 존중할 때 가장 편안한 결혼이에요. 함께하되 각자의 시간도 지켜 주는 부부가 잘 맞아요.', keep: '의견이 부딪힐 때 이기려 하기보다 "둘 다 맞을 수 있다"를 먼저 말해 보세요.' },
  겁재: { mate: '에너지가 크고 추진력 있는 사람', life: '함께 목표를 세우면 큰 힘을 내는 부부예요. 다만 돈과 결정의 주도권을 미리 나눠 두면 다툼이 줄어요.', keep: '큰돈이 드는 결정은 하루 묵혀 두고 다시 이야기하는 규칙을 만들어 보세요.' },
  식신: { mate: '다정하고 생활의 즐거움을 아는 사람', life: '맛있는 것, 소소한 여행처럼 일상의 기쁨을 나눌수록 깊어지는 결혼이에요.', keep: '바쁠수록 함께 먹는 한 끼를 지켜 보세요. 대화가 저절로 이어져요.' },
  상관: { mate: '표현이 풍부하고 감각이 좋은 사람', life: '말과 감정이 잘 통하면 누구보다 즐거운 부부예요. 다만 날 선 말 한마디가 오래 남을 수 있어요.', keep: '서운할 때는 "너는"보다 "나는 이렇게 느꼈어"로 시작해 보세요.' },
  편재: { mate: '활동적이고 현실 감각이 뛰어난 사람', life: '함께 넓은 세상을 경험하며 커 가는 결혼이에요. 생활 반경이 넓을수록 활기가 돌아요.', keep: '함께 모으는 돈의 목표를 하나 정해 두면 마음이 한 방향으로 모여요.' },
  정재: { mate: '성실하고 살림을 알뜰하게 꾸리는 사람', life: '차곡차곡 쌓아 가는 안정감이 큰 결혼이에요. 약속을 지키는 것이 사랑의 표현이 되는 부부예요.', keep: '고마움을 말로 꺼내 보세요. 당연해진 성실함에 한마디 인사가 큰 힘이 돼요.' },
  편관: { mate: '카리스마 있고 나를 든든히 지켜 주는 사람', life: '어려울 때 더 단단해지는 결혼이에요. 서로에게 기대하는 기준이 높아 가끔 긴장이 생길 수 있어요.', keep: '상대에게 바라는 것을 한 번에 하나씩, 부드럽게 부탁해 보세요.' },
  정관: { mate: '바르고 책임감 있는 사람', life: '서로를 믿고 기대는 안정적인 결혼이에요. 원칙을 함께 세우면 오래 흔들리지 않아요.', keep: '규칙만큼 쉼도 중요해요. 한 달에 한 번은 계획 없는 날을 만들어 보세요.' },
  편인: { mate: '생각이 깊고 나만의 세계가 있는 사람', life: '말없이도 마음이 통하는 순간이 많은 결혼이에요. 혼자만의 시간을 인정해 줄수록 더 가까워져요.', keep: '대화가 줄었다고 느껴지면 함께 같은 책·영화를 보고 이야기를 나눠 보세요.' },
  정인: { mate: '나를 아껴 주고 품어 주는 사람', life: '정서적으로 깊이 기대고 돌보는 결혼이에요. 가족과의 관계도 따뜻하게 이어 가는 부부예요.', keep: '받는 만큼 돌려주는 작은 표현을 잊지 마세요. 서로를 보살피는 마음이 오래가요.' },
};
// 부족한 기운을 채워 주는 상대의 결
const MATE_EL: Record<string, string> = { 목: '따뜻하게 이끌어 주고 성장을 응원하는', 화: '밝고 표현이 솔직한', 토: '듬직하고 약속을 잘 지키는', 금: '단정하고 기준이 분명한', 수: '깊이 들어 주고 마음을 잘 읽는' };

export function marriageReport(saju: SajuResult, name: string, profileId: string, now = new Date()) {
  const map = sajuMap(saju, profileId, now);
  const female = saju.gender === 'F';
  const day = rowOf(saju, '일주');
  const sp = SPOUSE[day?.branch?.sipsin as string] ?? SPOUSE.정인;
  const star = female ? cnt(saju, '정관', '편관') : cnt(saju, '정재', '편재');
  const starName = female ? '관성' : '재성';
  const starLine = star === 0
    ? `사주에 배우자를 뜻하는 ${starName}이 드러나 있지 않아요. 인연이 늦게 오는 게 아니라, 스스로 마음을 확인한 뒤에 깊어지는 타입이라는 뜻이에요. 서두르지 않을 때 오히려 좋은 사람을 알아봐요.`
    : star >= 3
      ? `사주에 배우자를 뜻하는 ${starName}이 ${star}개나 보여요. 인연의 기회가 많은 만큼, 마음이 편한 사람을 고르는 눈이 결혼의 열쇠예요.`
      : `사주에 배우자를 뜻하는 ${starName}이 ${star}개 자리하고 있어요. 인연이 자연스럽게 들어오는 구조라, 만남보다 '맞춰 가는 과정'이 더 중요해요.`;
  const love = nextMonths(saju, 'love', profileId, now), partner = nextMonths(saju, 'partner', profileId, now);
  const family = nextMonths(saju, 'family', profileId, now), doc = nextMonths(saju, 'document', profileId, now);
  const wed = blend(partner, family, doc), meet = blend(love, partner);
  const good = topN(wed, 3), care = lowN(wed, 2), meetTop = topN(meet, 2);
  const familyArea = map.areas.find((a) => a.id === 'family')!;
  const p = map.period.now;
  const sections: string[][] = [
    [`${name} 님의 결혼 자리(일지)에는 '${day?.branch?.sipsin ?? '정인'}'의 기운이 앉아 있어요. ${sp.life}`, starLine, map.dayMaster.love],
    [`${name} 님에게 잘 맞는 배우자는 ${sp.mate}이에요.`, `오행으로 보면 ${name} 님은 '${map.need}' 기운을 채워 줄 때 가장 편안해져요. 그래서 ${MATE_EL[map.need] ?? '마음을 잘 알아주는'} 사람 곁에서 오래 웃을 수 있어요.`, `반대로 ${map.strongest} 기운이 강한 사람과는 처음엔 끌려도 생활 속에서 부딪히기 쉬워요. 끌림과 편안함을 나눠서 살펴보세요.`],
    [`앞으로 열두 달 가운데 결혼과 약속의 기운이 가까워지는 달은 ${monthsLabel(good, now)}이에요. 상견례·프러포즈·중요한 대화처럼 마음을 정하는 일은 이 시기에 두면 자연스러워요.`, `새로운 인연이 들어오기 쉬운 달은 ${monthsLabel(meetTop, now)}이에요. 소개나 오래 알던 사람과의 만남에서 시작되기 쉬워요.`, `${monthsLabel(care, now)}에는 결정의 기운이 잠시 낮아져요. 이때는 결론을 서두르기보다 서로의 생각을 충분히 들어 보세요.`],
    [`결혼 생활의 균형은 '${map.need}' 기운에서 와요. ${map.elementAdvice}`, `가족과 집안의 기운은 ${familyArea.level === 'strong' ? '든든한 편' : familyArea.level === 'normal' ? '잔잔한 편' : '스스로 가꿔 가는 편'}이에요. ${familyArea.line}`, sp.keep],
    [p ? `지금은 ${p.fromYear}~${p.toYear}년 '${p.theme}'의 큰 흐름 안에 있어요. 이 시기의 결혼은 ${p.theme.includes('관계') || p.theme.includes('사람') ? '사람과 관계를 넓히는 방향' : '내 삶의 기반을 함께 다지는 방향'}으로 이어지기 쉬워요.` : `${name} 님의 결혼은 두 사람이 함께 쌓는 시간만큼 깊어져요.`, `결혼을 앞두고 있다면 돈·집·가족 행사·일의 계획 네 가지를 미리 나눠 이야기해 보세요. 사주보다 강한 건 두 사람이 함께 정한 약속이에요.`, pick([`좋은 달(${monthsLabel(good, now)})을 달력에 표시해 두고, 그때마다 두 사람의 다음 계획을 하나씩 정해 보세요.`, `${monthsLabel(good, now)}에는 미뤄 둔 이야기를 꺼내 보세요. 마음이 닿기 쉬운 때예요.`], `${profileId}:mar:end`)],
  ];
  return {
    sections,
    metrics: [{ label: '배우자 인연의 기운', score: avg(partner.slice(0, 6).map((x) => x.score)) }, { label: '가정의 안정', score: avg(family.slice(0, 6).map((x) => x.score)) }, { label: '약속·결정의 기운', score: avg(doc.slice(0, 6).map((x) => x.score)) }],
    good: monthsLabel(good, now), careful: monthsLabel(care, now), meet: monthsLabel(meetTop, now), flow: wed,
    facts: [`배우자 자리(일지) ${day?.branch?.char ?? ''}(${day?.branch?.sipsin ?? ''}) / 배우자 별(${starName}) ${star}개 / 채우면 좋은 기운 ${map.need}`, `결혼·약속 기운 좋은 달 ${monthsLabel(good, now)} / 인연 들어오는 달 ${monthsLabel(meetTop, now)} / 신중한 달 ${monthsLabel(care, now)}`],
    action: sp.keep,
  };
}

/* ---------- 직업운 ---------- */
const WORK: Record<string, { fit: string; jobs: string; env: string; win: string }> = {
  비겁: { fit: '스스로 판단하고 움직일 때 힘이 나는 독립형', jobs: '내 이름을 걸고 하는 일, 팀을 이끄는 자리, 프리랜서·창업, 스포츠·현장 리더', env: '결정권이 있는 자리, 성과가 내 몫으로 돌아오는 구조', win: '혼자 다 하려 하기보다 믿을 만한 동료 한 명을 곁에 두면 성과가 두 배가 돼요.' },
  식상: { fit: '아이디어와 표현으로 가치를 만드는 창작형', jobs: '기획·콘텐츠·디자인·마케팅, 가르치는 일, 서비스·요리처럼 손끝 감각이 필요한 일', env: '새로운 것을 시도해도 되는 분위기, 결과물이 눈에 보이는 일', win: '떠오른 생각을 바로 기록하고, 작게라도 결과물로 보여 주는 습관이 인정으로 이어져요.' },
  재성: { fit: '현실 감각으로 결과를 만드는 실속형', jobs: '영업·유통·재무·투자 관련 일, 사업 운영, 숫자와 성과가 분명한 일', env: '성과에 따라 보상이 따라오는 구조, 사람과 돈이 움직이는 현장', win: '숫자로 말하는 습관을 들이세요. 내가 만든 성과를 기록해 두면 이직·연봉 협상의 힘이 돼요.' },
  관성: { fit: '체계 안에서 책임을 다하며 올라가는 조직형', jobs: '공공기관·대기업·전문직, 관리·운영·법무·인사처럼 원칙이 중요한 일', env: '역할과 평가가 분명한 조직, 오래 쌓은 신뢰가 직급으로 이어지는 곳', win: '맡은 일의 기준을 먼저 세우고 지키는 모습이 가장 큰 무기예요. 윗사람과의 소통 창구를 하나 만들어 두세요.' },
  인성: { fit: '배우고 깊이 파고들어 전문성을 쌓는 연구형', jobs: '연구·교육·상담·의료·자격증 기반 전문직, 글과 지식을 다루는 일', env: '배움을 이어 갈 수 있는 곳, 차분하게 몰입할 수 있는 환경', win: '자격·학위·포트폴리오처럼 남는 것을 하나씩 쌓으세요. 그 기록이 다음 자리를 열어 줘요.' },
};
export function careerReport(saju: SajuResult, name: string, profileId: string, now = new Date()) {
  const map = sajuMap(saju, profileId, now);
  const top = [...map.gods].sort((a, b) => b.n - a.n);
  const main = top[0], second = top[1];
  const w = WORK[main.group] ?? WORK.식상, w2 = WORK[second.group] ?? WORK.인성;
  const work = nextMonths(saju, 'work', profileId, now), growth = nextMonths(saju, 'growth', profileId, now), expand = nextMonths(saju, 'expand', profileId, now);
  const move = blend(work, expand), study = blend(growth, work);
  const good = topN(move, 3), care = lowN(move, 2), studyTop = topN(study, 2);
  const workArea = map.areas.find((a) => a.id === 'work')!;
  const q1 = move.slice(0, 4), q2 = move.slice(4, 8), q3 = move.slice(8, 12);
  const best = (xs: M[]) => topN(xs, 1)[0];
  const sections: string[][] = [
    [`${name} 님의 사주에서 가장 크게 드러나는 일의 기운은 '${main.group}(${main.mean})'이에요. ${w.fit}에 가까워요.`, map.dayMaster.work, `두 번째로 힘을 보태는 기운은 '${second.group}(${second.mean})'이라, ${w2.fit}의 면모도 함께 가지고 있어요.`],
    [`잘 맞는 일은 ${w.jobs}이에요.`, `일하는 환경은 ${w.env}에서 오래 즐겁게 일할 수 있어요.`, `일과 직장의 기운은 ${workArea.level === 'strong' ? '또렷하게 강한 편' : workArea.level === 'normal' ? '안정적인 편' : '스스로 길을 만들어 가는 편'}이에요. ${workArea.line}`],
    [`앞으로 열두 달 가운데 이직·취업·새 자리의 기운이 열리는 달은 ${monthsLabel(good, now)}이에요. 지원서·면접·연봉 협상처럼 움직이는 일은 이 시기에 두면 좋아요.`, `배우고 준비하기 좋은 달은 ${monthsLabel(studyTop, now)}이에요. 자격증·포트폴리오·공부는 이때 시작해 두면 다음 기회로 이어져요.`, `${monthsLabel(care, now)}에는 일의 기운이 잠시 낮아져요. 이때 충동적으로 그만두기보다 다음 자리를 알아보며 준비하는 편이 좋아요.`],
    [w.win, `채우면 좋은 기운은 '${map.need}'이에요. ${map.elementAdvice}`, `${name} 님의 강점 키워드는 ${map.dayMaster.keywords.join('·')}이에요. 이 세 단어를 자기소개와 면접 답변에 그대로 써 보세요.`],
    [`앞으로 1년을 세 구간으로 나누면 — ${monthsLabel([best(q1)], now)} 무렵 첫 기회, ${monthsLabel([best(q2)], now)} 무렵 도약, ${monthsLabel([best(q3)], now)} 무렵 정리와 다음 준비의 흐름이에요.`, map.period.now ? `지금은 ${map.period.now.fromYear}~${map.period.now.toYear}년 '${map.period.now.theme}'의 큰 흐름 안에 있어요. 지금 쌓는 경력이 이 10년의 바탕이 돼요.` : `지금 쌓는 경험 하나하나가 다음 10년의 바탕이 돼요.`, `사주는 방향을 비춰 주는 참고예요. 실제 결정은 조건과 정보를 함께 보고 내려 주세요.`],
  ];
  return {
    sections,
    metrics: [{ label: '일의 기운', score: avg(work.slice(0, 6).map((x) => x.score)) }, { label: '성장·배움', score: avg(growth.slice(0, 6).map((x) => x.score)) }, { label: '도약의 기운', score: avg(expand.slice(0, 6).map((x) => x.score)) }],
    good: monthsLabel(good, now), careful: monthsLabel(care, now), study: monthsLabel(studyTop, now), flow: move,
    steps: [{ label: `${monthsLabel([best(q1)], now)} 무렵`, text: '첫 기회 — 지원·제안에 먼저 손 들기' }, { label: `${monthsLabel([best(q2)], now)} 무렵`, text: '도약 — 협상·새 역할 맡기' }, { label: `${monthsLabel([best(q3)], now)} 무렵`, text: '정리 — 경력 기록과 다음 준비' }],
    facts: [`일의 기운 1위 ${main.group}(${main.n}개) · 2위 ${second.group}(${second.n}개) / 맞는 일 ${w.jobs}`, `이직·취업 좋은 달 ${monthsLabel(good, now)} / 준비하기 좋은 달 ${monthsLabel(studyTop, now)} / 신중한 달 ${monthsLabel(care, now)}`],
    action: w.win,
  };
}
