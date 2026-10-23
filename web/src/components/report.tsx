import type { ReactNode } from 'react';
// 프리미엄 리포트 그림 — 사주 구성표(근거 번호 표시) · 3년 월별 흐름 · 행운 카드. 서버가 계산해 둔 값을 그대로 그린다.
type Side = { han: string; kor: string; el: string; yy: string; sip: string };
type Col = { key: 'hour' | 'day' | 'month' | 'year'; label: string; empty: true } | { key: 'hour' | 'day' | 'month' | 'year'; label: string; empty: false; stem: Side; branch: Side; stage: string; shinsal: string; gwiin: string[] };
export type Basis = { pos: 'hour' | 'day' | 'month' | 'year'; part: 'stem' | 'branch' | 'pillar'; n: number };
export type Visual = { table: Col[]; flow?: { points: { y: number; m: number; score: number }[]; top: { y: number; m: number; score: number }[]; low: { y: number; m: number; score: number }[] }; lucky?: { color: string; number: number[]; direction: string; shape: string; item: string; routine: string; element: string; note: string }; flowAt?: number; luckyAt?: number;
  elements?: { el: string; pct: number }[]; elementsAt?: number; daeun?: DaeunRow[]; daeunAt?: number; years?: { y: number; score: number }[]; yearsAt?: number;
  seun?: SeunRow[]; seunAt?: number; wolun?: WolunRow[]; wolunAt?: number };
export type SeunRow = { y: number; gz: string; sip: string; score: number; love: number; work: number; wealth: number };
export type WolunRow = { y: number; m: number; gz: string; sip: string; love: number; work: number; wealth: number };
export type DaeunRow = { text: string; hanja: string; fromAge: number; toAge: number; fromYear: number; toYear: number; theme: string; score: number; now: boolean };

const EL_CLASS: Record<string, string> = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' };
const CIRCLED = ['①', '②', '③', '④'];

/** 사주 구성표 — full: 십성·음양오행·천간·지지·십이운성·십이신살·귀인 / 장마다: 천간·지지만 + 근거 번호 */
export function SajuTableView({ table, basis = [], full = false, name }: { table: Col[]; basis?: Basis[]; full?: boolean; name?: string }) {
  const mark = (key: Col['key'], part: 'stem' | 'branch') => basis.find((b) => b.pos === key && (b.part === part || b.part === 'pillar'));
  return (
    <div className={`stbl${full ? ' full' : ''}`} role="table" aria-label={`${name ? `${name} 님의 ` : ''}사주 구성표`}>
      <div className="stbl-row head" role="row"><span role="columnheader" />{table.map((c) => <span key={c.key} role="columnheader">{c.label}</span>)}</div>
      {full && <Row label="십성" cells={table.map((c) => (c.empty ? '' : c.stem.sip))} />}
      {full && <Row label="음양오행" cells={table.map((c) => (c.empty ? '' : `${c.stem.han}(${c.stem.yy}${c.stem.el})`))} small />}
      <div className="stbl-row big" role="row">
        <span role="rowheader">천간</span>
        {table.map((c) => { if (c.empty) return <span key={c.key} className="none" role="cell">시간<br />모름</span>; const m = mark(c.key, 'stem'); return <span key={c.key} role="cell" className={`ch ${EL_CLASS[c.stem.el]}${m ? ' on' : ''}`}>{m && <i>{CIRCLED[m.n - 1]}</i>}<b>{c.stem.han}</b><small>{c.stem.kor}{!full ? ` · ${c.stem.sip}` : ''}</small></span>; })}
      </div>
      <div className="stbl-row big" role="row">
        <span role="rowheader">지지</span>
        {table.map((c) => { if (c.empty) return <span key={c.key} className="none" role="cell" />; const m = mark(c.key, 'branch'); return <span key={c.key} role="cell" className={`ch ${EL_CLASS[c.branch.el]}${m ? ' on' : ''}`}>{m && <i>{CIRCLED[m.n - 1]}</i>}<b>{c.branch.han}</b><small>{c.branch.kor}{!full ? ` · ${c.branch.sip}` : ''}</small></span>; })}
      </div>
      {full && <Row label="음양오행" cells={table.map((c) => (c.empty ? '' : `${c.branch.han}(${c.branch.yy}${c.branch.el})`))} small />}
      {full && <Row label="십성" cells={table.map((c) => (c.empty ? '' : c.branch.sip))} />}
      {full && <Row label="십이운성" cells={table.map((c) => (c.empty ? '' : c.stage))} />}
      {full && <Row label="십이신살" cells={table.map((c) => (c.empty ? '' : c.shinsal))} />}
      {full && <Row label="귀인" cells={table.map((c) => (c.empty ? '' : c.gwiin.join('\n')))} small />}
    </div>
  );
}
function Row({ label, cells, small }: { label: string; cells: string[]; small?: boolean }) {
  return <div className={`stbl-row${small ? ' sm' : ''}`} role="row"><span role="rowheader">{label}</span>{cells.map((t, i) => <span key={i} role="cell">{t}</span>)}</div>;
}

/** 3년 월별 재물 흐름 — 선 그래프 + 강한 시기 TOP 3 */
export function Flow36({ flow, name }: { flow: NonNullable<Visual['flow']>; name?: string }) {
  const W = 340, H = 150, P = 14;
  const pts = flow.points;
  const x = (i: number) => P + (i * (W - P * 2)) / (pts.length - 1);
  const y = (s: number) => H - 22 - ((s - 30) / 70) * (H - 40);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
  const idx = (t: { y: number; m: number }) => pts.findIndex((p) => p.y === t.y && p.m === t.m);
  const years = [...new Set(pts.map((p) => p.y))];
  return (
    <figure className="f36">
      <figcaption>{name ? `${name} 님의 ` : ''}향후 3년 월별 재물 흐름 ({years[0]}–{years[years.length - 1]})</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`가장 강한 시기 ${flow.top.map((t) => `${t.y}년 ${t.m}월`).join(', ')}`}>
        {[40, 60, 80].map((v) => <line key={v} x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="grid" />)}
        {years.slice(1).map((yy) => { const i = pts.findIndex((p) => p.y === yy); return <g key={yy}><line x1={x(i) - 3} x2={x(i) - 3} y1={8} y2={H - 22} className="yr" /><text x={x(i)} y={H - 6} className="lab">{yy}</text></g>; })}
        <text x={P} y={H - 6} className="lab">{years[0]}</text>
        <path d={d} className="ln" />
        {flow.top.map((t, k) => { const i = idx(t); return <g key={k}><circle cx={x(i)} cy={y(t.score)} r="5" className="top" /><text x={x(i)} y={y(t.score) - 9} className="tlab">{k + 1}</text></g>; })}
        {flow.low.map((t, k) => { const i = idx(t); return <circle key={k} cx={x(i)} cy={y(t.score)} r="4" className="low" />; })}
      </svg>
      <ol className="f36-top">{flow.top.map((t, k) => <li key={k}><span>TOP {k + 1}</span><b>{t.y}년 {t.m}월</b><em>{t.score}점</em></li>)}</ol>
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>● 강한 시기 · ○ 숨 고르는 시기({flow.low.map((t) => `${String(t.y).slice(2)}.${t.m}`).join(', ')}) — 무료 ‘돈의 흐름’과 같은 계산이에요.</p>
    </figure>
  );
}

export function LuckyCard({ l }: { l: NonNullable<Visual['lucky']> }) {
  return (
    <section className="lucky">
      <small>채우면 좋은 기운 · {l.element}</small>
      <div className="lucky-grid">
        <div><span>행운 숫자</span><b>{l.number.join(' · ')}</b></div>
        <div><span>행운 색</span><b>{l.color}</b></div>
        <div><span>방향</span><b>{l.direction}</b></div>
        <div><span>모양</span><b>{l.shape}</b></div>
      </div>
      <p><b>행운템</b> {l.item}</p>
      <p><b>상승 루틴</b> {l.routine}</p>
      <p className="faint" style={{ fontSize: 12.5 }}>{l.note}</p>
    </section>
  );
}

// 결과 맨 위 요약 카드(대표님 V88 리포트 틀) — 막대는 엔진이 계산한 지수, 단계는 실제 좋은 달
export type Summary = { tone: 'love' | 'money' | 'saju' | 'time'; headline: string; lead: string; metrics: { label: string; score: number; note?: string }[]; steps: { label: string; text: string }[]; action: string; cards?: { id: number; rev: boolean }[] };
const TONE_LABEL = { love: 'LOVE · 사랑과 인연', money: 'WEALTH · 돈과 일', saju: 'SAJU · 타고난 나', time: 'TIME · 시기의 흐름' };
export function ReportSummary({ s, title, cardsNode }: { s: Summary; title: string; cardsNode?: ReactNode }) {
  return (
    <section className={`rs ${s.tone}`} aria-label="핵심 요약">
      <small className="rs-over">{TONE_LABEL[s.tone]}</small>
      <h2 className="rs-head">{s.headline}</h2>
      <p className="rs-lead">{s.lead}</p>
      {cardsNode}
      <div className="rs-box">
        <small>핵심 요약 · {title}</small>
        <div className="rs-bars">
          {s.metrics.map((m) => (
            <div key={m.label} className="rs-bar">
              <span>{m.label}{m.note && <em>{m.note}</em>}</span>
              <span className="track" role="img" aria-label={`${m.label} ${m.score}`}><i style={{ width: `${Math.max(8, Math.min(100, (m.score - 30) / 0.65))}%` }} /></span>
              <b>{m.score}</b>
            </div>
          ))}
        </div>
        <p className="rs-note">{s.cards ? '막대는 고른 카드가 보여 주는 분위기예요(정방향·반가운 카드일수록 길어요).' : '막대는 내 사주로 계산한 지수예요(100에 가까울수록 기운이 밝아요).'} 확률이나 결과 보장은 아니에요.</p>
      </div>
      <h3 className="rs-sub">시기·단계별로 살펴보기</h3>
      <ol className="rs-steps">{s.steps.map((x, i) => <li key={i}><span>{i + 1}</span><div><b>{x.label}</b><p>{x.text}</p></div></li>)}</ol>
      <h3 className="rs-sub">오늘부터 적용할 한 가지</h3>
      <p className="rs-act">{s.action}</p>
    </section>
  );
}

/** 정통사주 — 오행 비율 막대 */
const EL_NAME: Record<string, string> = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
export function ElementBars({ els, name }: { els: { el: string; pct: number }[]; name?: string }) {
  const max = Math.max(...els.map((e) => e.pct), 1);
  return (
    <figure className="elb">
      <figcaption>{name ? `${name} 님의 ` : ''}오행 비율</figcaption>
      {els.map((e) => (
        <div key={e.el} className="elb-row">
          <span className={`elb-k ${EL_CLASS[e.el]}`}>{e.el}<small>{EL_NAME[e.el]}</small></span>
          <span className="elb-track" role="img" aria-label={`${e.el} ${e.pct}%`}><i className={EL_CLASS[e.el]} style={{ width: `${e.pct === 0 ? 0 : Math.max(6, (e.pct / max) * 100)}%` }} /></span>
          <b>{e.pct}%</b>
        </div>
      ))}
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>사주 여덟 글자를 오행으로 나눈 비율이에요. 0%인 기운은 '바깥에서 채워 쓰는 기운'이에요.</p>
    </figure>
  );
}

/** 정통사주 — 평생 대운표(10년 단위) */
export function DaeunTable({ rows, name }: { rows: DaeunRow[]; name?: string }) {
  const best = [...rows].filter((r) => r.fromAge >= 17 && r.fromAge <= 65).sort((a, b) => b.score - a.score)[0];
  return (
    <figure className="dwt">
      <figcaption>{name ? `${name} 님의 ` : ''}평생 대운표</figcaption>
      <ol>
        {rows.map((r) => (
          <li key={r.fromAge} className={`${r.now ? 'now' : ''}${best && r.fromAge === best.fromAge ? ' peak' : ''}`}>
            <span className="dwt-age">{r.fromAge}~{r.toAge}세<small>{r.fromYear}~{r.toYear}</small></span>
            <span className="dwt-gz"><b>{r.hanja}</b><small>{r.text}</small></span>
            <span className="dwt-th">{r.theme}{r.now && <em>지금</em>}{best && r.fromAge === best.fromAge && <em className="g">전성기</em>}</span>
            <span className="dwt-bar" role="img" aria-label={`${r.score}점`}><i style={{ width: `${Math.max(8, Math.min(100, (r.score - 50) * 2.2))}%` }} /></span>
          </li>
        ))}
      </ol>
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>막대는 대운마다 일·재물·사랑·성장 기운을 계산한 지수예요. 결과를 보장하지 않아요.</p>
    </figure>
  );
}

/** 정통사주 — 앞으로 10년 연도별 흐름 */
export function YearBars({ years, name }: { years: { y: number; score: number }[]; name?: string }) {
  const top = new Set([...years].sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.y));
  const lo = Math.min(...years.map((x) => x.score)) - 4, hi = Math.max(...years.map((x) => x.score));
  return (
    <figure className="yrb">
      <figcaption>{name ? `${name} 님의 ` : ''}앞으로 10년 흐름</figcaption>
      <div className="yrb-cols" role="img" aria-label={`빛나는 해 ${[...top].sort().join(', ')}년`}>
        {years.map((x) => (
          <div key={x.y} className={top.has(x.y) ? 'on' : ''}>
            <span className="yrb-v">{x.score}</span>
            <span className="yrb-bar"><i style={{ height: `${Math.max(10, ((x.score - lo) / Math.max(1, hi - lo)) * 100)}%` }} /></span>
            <span className="yrb-y">{String(x.y).slice(2)}</span>
          </div>
        ))}
      </div>
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>금색 막대가 특히 빛나는 해예요(연도 뒤 두 자리).</p>
    </figure>
  );
}

/** 정통사주 장편 — 앞으로 10년 세운표 */
export function SeunTable({ rows }: { rows: SeunRow[] }) {
  const top = new Set([...rows].sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.y));
  return (
    <figure className="gtbl">
      <figcaption>앞으로 10년 세운표</figcaption>
      <table>
        <thead><tr><th>해</th><th>간지</th><th>십성</th><th>종합</th><th>연애</th><th>일</th><th>재물</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.y} className={top.has(r.y) ? 'on' : ''}><td>{r.y}</td><td className="gz">{r.gz.replace(/\(.*\)/, '')}<small>{(r.gz.match(/\((.*)\)/) ?? [])[1]}</small></td><td>{r.sip}</td><td><b>{r.score}</b></td><td>{r.love}</td><td>{r.work}</td><td>{r.wealth}</td></tr>)}</tbody>
      </table>
      <p className="faint" style={{ margin: '6px 0 0', fontSize: 13 }}>금색 줄이 특히 빛나는 해예요. 지수는 결과를 보장하지 않아요.</p>
    </figure>
  );
}
/** 정통사주 장편 — 앞으로 12달 월운표 */
export function WolunTable({ rows }: { rows: WolunRow[] }) {
  const best = (r: WolunRow) => Math.max(r.love, r.work, r.wealth);
  return (
    <figure className="gtbl">
      <figcaption>앞으로 12달 월운표</figcaption>
      <table>
        <thead><tr><th>달</th><th>간지</th><th>십성</th><th>연애</th><th>일</th><th>재물</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={`${r.y}-${r.m}`}><td>{String(r.y).slice(2)}.{r.m}</td><td className="gz">{r.gz.replace(/\(.*\)/, '')}</td><td>{r.sip}</td>{[r.love, r.work, r.wealth].map((v, i) => <td key={i} className={v === best(r) ? 'hi' : ''}>{v}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  );
}
