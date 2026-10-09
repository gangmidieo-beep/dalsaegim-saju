import { describe, it, expect } from 'vitest';
import { calcSaju } from '@dalsaegim/engine';
import { todayFortune, monthFortune, FIELDS, moneyFlow, MONEY_KINDS, luckyNumbers, sajuMap, sajuMbti, mbtiFromQuiz, MBTI_TYPES, MBTI_QUIZ, PATHS, pathResult, recommendPaths, newYearPreview, toRanges, investStyle } from '../src/index';
import { composeLetter, defaultTodayLetter, LETTER_FEELINGS, LETTER_TOPICS, PERSONAS, CHARMS } from '../src/index';

const A = calcSaju({ year: 1995, month: 5, day: 15, hour: 14, calendar: 'solar', gender: 'F' });
const B = calcSaju({ year: 1990, month: 11, day: 2, calendar: 'solar', gender: 'M', timeUnknown: true });
const C = calcSaju({ year: 1988, month: 2, day: 9, hour: 3, calendar: 'lunar', gender: 'F' });
const D = new Date('2026-10-07T03:00:00Z');

describe('오늘의 운세', () => {
  it('같은 입력 = 같은 결과, 범위 55~96, 4분야 문장', () => {
    expect(todayFortune(A, D, 'p1')).toEqual(todayFortune(A, D, 'p1'));
    const totals = new Set<number>();
    for (const s of [A, B, C]) for (let i = 0; i < 90; i++) {
      const f = todayFortune(s, new Date(D.getTime() + i * 864e5), 'x');
      expect(f.total).toBeGreaterThanOrEqual(55); expect(f.total).toBeLessThanOrEqual(96);
      totals.add(f.total);
      for (const k of FIELDS) { expect(f.fields[k].summary.length).toBeGreaterThan(4); expect(f.fields[k].detail).toHaveLength(2); }
      expect(f.headline && f.brief && f.word && f.keyword).toBeTruthy();
    }
    expect(totals.size).toBeGreaterThan(15);
  });
  it('이번 달 미리보기', () => { const m = monthFortune(A, D, 'p1'); expect(m.month).toBe(10); expect(m.line.length).toBeGreaterThan(10); });
});

describe('돈의 흐름', () => {
  it('4종 모두 12달 흐름·좋은 달 3·신중한 달 3·키워드 4·팁 3', () => {
    for (const k of MONEY_KINDS) for (const s of [A, B, C]) {
      const r = moneyFlow(s, k, 2027, 'p1');
      expect(r.flow).toHaveLength(12);
      expect(r.good).toHaveLength(3); expect(r.careful).toHaveLength(3);
      expect(r.good.some((m) => r.careful.includes(m))).toBe(false);
      expect(r.keywords).toHaveLength(4); expect(r.tips).toHaveLength(3);
      expect(r.score).toBeGreaterThanOrEqual(55); expect(r.score).toBeLessThanOrEqual(96);
      expect(r.subs.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('투자운: 성향·만나는 시기·이번 달 문구, 시장 흐름 반영', () => {
    const market = [40, 45, 50, 60, 65, 70, 70, 62, 55, 50, 45, 40];
    const r = moneyFlow(A, 'invest', 2026, 'p1', { market, now: D });
    expect(r.invest!.style.style).toMatch(/안정형|균형형|신중형|도전형/);
    expect(r.invest!.meet.length).toBeGreaterThan(0);
    expect(r.invest!.curMonth).toBe(10);
    expect(r.invest!.thisMonth.length).toBeGreaterThan(10);
    expect(moneyFlow(A, 'invest', 2026, 'p1', { now: D }).invest!.market).toBeNull();
    expect(investStyle(B).carePct).toBeGreaterThan(30);
  });
  it('구간 표기', () => { expect(toRanges([3, 4, 5, 9])).toBe('3~5월, 9월'); });
  it('행운번호: 6개·1~45·중복 없음·같은 날 같은 번호·다른 회차는 다름', () => {
    const a = luckyNumbers(A, D, 'p1'); const b = luckyNumbers(A, D, 'p1'); const c = luckyNumbers(A, D, 'p1', 1);
    expect(a.numbers).toEqual(b.numbers); expect(a.numbers).not.toEqual(c.numbers);
    expect(new Set(a.numbers).size).toBe(6); expect(Math.min(...a.numbers)).toBeGreaterThanOrEqual(1); expect(Math.max(...a.numbers)).toBeLessThanOrEqual(45);
    expect(a.notice).toContain('보장하지');
  });
});

describe('사주지도·MBTI·고민의 길·신년', () => {
  it('사주지도: 일간·오행 합 100 근처·5영역', () => {
    const m = sajuMap(A, 'p1', D);
    expect(m.dayMaster.title.length).toBeGreaterThan(3);
    expect(m.elements.reduce((s, e) => s + e.pct, 0)).toBeGreaterThan(95);
    expect(m.areas).toHaveLength(5);
    expect(m.period.now?.theme.length).toBeGreaterThan(3);
  });
  it('MBTI 16종 × 사주 결과, 간단 테스트', () => {
    expect(MBTI_TYPES).toHaveLength(16);
    for (const t of MBTI_TYPES) { const r = sajuMbti(C, t, 'p1'); expect(r.match).toBeGreaterThanOrEqual(40); expect(r.title).toContain('×'); }
    expect(mbtiFromQuiz(MBTI_QUIZ.map(() => 'a'))).toBe('ESTJ');
    expect(mbtiFromQuiz(MBTI_QUIZ.map(() => 'b'))).toBe('INFP');
  });
  it('고민의 길: 모든 경로가 결과를 만든다', () => {
    for (const c of PATHS) for (const s of c.sub) for (const q of s.q) {
      const r = pathResult(B, c.id, s.id, q, 'p1', D);
      expect(r.good.length).toBeGreaterThan(2); expect(r.hints).toHaveLength(3); expect(r.memory.title).toContain(q);
    }
    expect(recommendPaths(A, 'p1', [], D)).toHaveLength(2);
  });
  it('신년 미리보기', () => { const n = newYearPreview(A, 2027, 'p1'); expect(n.months).toHaveLength(12); expect(n.fields).toHaveLength(4); expect(n.yearPillar.text).toBe('정미'); });
});

describe('시그니처 콘텐츠 — 달빛 편지·황금 부적', () => {
  it('맞춤 편지: 150~250자, 이름을 부르고, 예측·겁주는 말 없음, 상담사 서명', () => {
    for (const f of LETTER_FEELINGS) for (const p of PERSONAS) for (const t of [null, ...LETTER_TOPICS.map((x) => x.id)]) {
      const l = composeLetter({ name: '김하늘', persona: p.id, feeling: f.id, topic: t, input: '연락이 올까요', trait: '단단한 바위', seed: f.id + p.id + t });
      expect(l.body.length).toBeGreaterThanOrEqual(150);
      expect(l.body.length).toBeLessThanOrEqual(250);
      expect(l.body).toContain('김하늘');
      expect(l.body).not.toMatch(/반드시|무조건|틀림없이|큰일|불행|위험해/);
      expect(l.to).toBe('TO. 김하늘 고객님');
      expect(l.from).toContain(p.name);
    }
  });
  it('오늘의 편지는 날짜마다 같은 편지, 부적은 5종이고 보장 표현 없음', () => {
    expect(defaultTodayLetter('2026-10-09')).toEqual(defaultTodayLetter('2026-10-09'));
    expect(CHARMS.map((c) => c.id)).toEqual(['business', 'wealth', 'estate', 'work', 'goal']);
    for (const c of CHARMS) expect([c.name, c.bless, ...c.wishes].join(' ')).not.toMatch(/보장|확실|반드시|대박|수익률/);
  });
});
