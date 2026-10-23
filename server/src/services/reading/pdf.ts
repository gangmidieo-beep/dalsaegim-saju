// 정통사주 감정서 A4 PDF(10/23) — 표지·핵심 요약·목차(쪽 번호)·사주 원국표·부/장·분석표·마무리.
// pdfkit + Noto CJK(서버 이미지의 fonts-noto-cjk). 브라우저 없이 서버에서 바로 만든다.
// 한국어는 어절 단위로 줄을 바꾼다(단어 중간에서 끊지 않음 — pdfkit 기본 줄바꿈 대신 직접 배치).
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import type { ReadingContent } from './generate.ts';

const DIR = () => process.env.PDF_FONT_DIR || '/usr/share/fonts/opentype/noto';
const FONTS = {
  r: ['NotoSansCJK-Regular.ttc', 'NotoSansCJKkr-Regular'],
  b: ['NotoSansCJK-Bold.ttc', 'NotoSansCJKkr-Bold'],
  sb: ['NotoSerifCJK-Bold.ttc', 'NotoSerifCJKkr-Bold'],
  sr: ['NotoSerifCJK-Regular.ttc', 'NotoSerifCJKkr-Regular'],
} as const;
export const pdfReady = () => existsSync(`${DIR()}/${FONTS.r[0]}`) && existsSync(`${DIR()}/${FONTS.b[0]}`);

const C = { navy: '#1B1F3B', ink: '#2A2D3E', gray: '#6B6F80', faint: '#9A9DAA', gold: '#B8893F', goldBg: '#FBF4E6', lav: '#F3F0F8', line: '#E4DFD4', paper: '#FAF7F1' };
const EL: Record<string, string> = { 목: '#4F9A72', 화: '#D0624D', 토: '#C1923F', 금: '#9A9FAD', 수: '#2C3A66' };
const W = 595.28, H = 841.89, MX = 54, TOP = 68, BOT = 66;
const CW = W - MX * 2;

type Doc = InstanceType<typeof PDFDocument>;
type Long = ReadingContent & { parts?: string[]; chapters: (ReadingContent['chapters'][number] & { part?: number; partTitle?: string })[] };
type Ctx = { doc: Doc; y: number; page: number; title: string; name: string; marks: Record<string, number> };

function font(doc: Doc, f: keyof typeof FONTS, size: number, color = C.ink) {
  doc.font(f).fontSize(size).fillColor(color);
}
function newPage(x: Ctx, plain = false) {
  x.doc.addPage({ size: 'A4', margin: 0 });
  x.page++;
  x.y = TOP;
  if (plain) return;
  font(x.doc, 'r', 8, C.faint);
  x.doc.text(`달새김사주 · ${x.name} 님의 ${x.title}`, MX, 34, { width: CW, lineBreak: false });
  x.doc.moveTo(MX, 48).lineTo(W - MX, 48).lineWidth(0.5).strokeColor(C.line).stroke();
  x.doc.text(`— ${x.page - 1} —`, MX, H - 40, { width: CW, align: 'center', lineBreak: false });
}
const room = (x: Ctx, h: number) => { if (x.y + h > H - BOT) newPage(x); };
/** 어절 단위 줄바꿈 */
function lines(doc: Doc, text: string, width: number) {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w0 of words) {
      let w = w0;
      const t = cur ? `${cur} ${w}` : w;
      if (doc.widthOfString(t) <= width) { cur = t; continue; }
      if (cur) out.push(cur);
      cur = '';
      while (doc.widthOfString(w) > width) { // 한 어절이 줄보다 길면 글자 단위로
        let k = w.length;
        while (k > 1 && doc.widthOfString(w.slice(0, k)) > width) k--;
        out.push(w.slice(0, k)); w = w.slice(k);
      }
      cur = w;
    }
    out.push(cur);
  }
  return out;
}
function para(x: Ctx, text: string, o: { f?: keyof typeof FONTS; size?: number; color?: string; lead?: number; after?: number; indent?: number; width?: number; align?: 'left' | 'center' } = {}) {
  const size = o.size ?? 10.5, lh = size * (o.lead ?? 1.72), ind = o.indent ?? 0, width = (o.width ?? CW) - ind;
  font(x.doc, o.f ?? 'r', size, o.color ?? C.ink);
  for (const ln of lines(x.doc, text, width)) {
    room(x, lh);
    font(x.doc, o.f ?? 'r', size, o.color ?? C.ink);
    x.doc.text(ln, MX + ind, x.y, { width, align: o.align ?? 'left', lineBreak: false });
    x.y += lh;
  }
  x.y += o.after ?? size * 0.9;
}
function heading(x: Ctx, eyebrow: string, title: string) {
  room(x, 90);
  font(x.doc, 'b', 9, C.gold); x.doc.text(eyebrow, MX, x.y, { width: CW, lineBreak: false }); x.y += 16;
  para(x, title, { f: 'sb', size: 18, color: C.navy, lead: 1.4, after: 6 });
  x.doc.moveTo(MX, x.y).lineTo(MX + 40, x.y).lineWidth(2).strokeColor(C.gold).stroke(); x.y += 14;
}
function box(x: Ctx, text: string, bg = C.goldBg, color = C.navy) {
  font(x.doc, 'b', 11, color);
  const ls = lines(x.doc, text, CW - 32);
  const h = ls.length * 19 + 22;
  room(x, h + 8);
  x.doc.roundedRect(MX, x.y, CW, h, 8).fill(bg);
  x.doc.rect(MX, x.y, 3, h).fill(C.gold);
  font(x.doc, 'b', 11, color);
  ls.forEach((l, i) => x.doc.text(l, MX + 18, x.y + 12 + i * 19, { width: CW - 32, lineBreak: false }));
  x.y += h + 14;
}
function cell(doc: Doc, s: string, cx: number, cy: number, w: number, h: number, o: { f?: keyof typeof FONTS; size?: number; color?: string; bg?: string } = {}) {
  if (o.bg) doc.rect(cx, cy, w, h).fill(o.bg);
  doc.rect(cx, cy, w, h).lineWidth(0.5).strokeColor(C.line).stroke();
  font(doc, o.f ?? 'r', o.size ?? 9, o.color ?? C.ink);
  const ls = s.split('\n');
  const lh = (o.size ?? 9) * 1.35;
  const top = cy + (h - ls.length * lh) / 2 + 1;
  ls.forEach((l, i) => doc.text(l, cx + 2, top + i * lh, { width: w - 4, align: 'center', lineBreak: false }));
}
function table(x: Ctx, head: string[], rows: string[][], widths: number[], o: { rowH?: number; title?: string; hi?: (i: number) => string | undefined } = {}) {
  const rh = o.rowH ?? 22;
  if (o.title) { room(x, 30 + rh * 2); font(x.doc, 'b', 11, C.navy); x.doc.text(o.title, MX, x.y, { width: CW, lineBreak: false }); x.y += 20; }
  const drawHead = () => { let cx = MX; head.forEach((h, i) => { cell(x.doc, h, cx, x.y, widths[i], rh, { f: 'b', bg: C.lav, color: C.navy }); cx += widths[i]; }); x.y += rh; };
  room(x, rh * 2); drawHead();
  rows.forEach((r, ri) => {
    if (x.y + rh > H - BOT) { newPage(x); drawHead(); }
    let cx = MX; r.forEach((v, i) => { cell(x.doc, v, cx, x.y, widths[i], rh, { bg: o.hi?.(ri) }); cx += widths[i]; }); x.y += rh;
  });
  x.y += 14;
}
function sajuTable(x: Ctx, t: any[]) {
  const cols = ['', ...t.map((c) => c.label)];
  const w = [70, ...t.map(() => (CW - 70) / t.length)];
  const val = (c: any, f: (c: any) => string) => (c.empty ? '' : f(c));
  const rows: [string, (c: any) => string, number?, boolean?][] = [
    ['천간', (c) => `${c.stem.han}\n${c.stem.kor} · ${c.stem.yy}${c.stem.el}`, 40, true], ['십성', (c) => c.stem.sip],
    ['지지', (c) => `${c.branch.han}\n${c.branch.kor} · ${c.branch.yy}${c.branch.el}`, 40, true], ['십성', (c) => c.branch.sip],
    ['십이운성', (c) => c.stage], ['십이신살', (c) => c.shinsal], ['귀인', (c) => (c.gwiin ?? []).join('\n') || '—', 32],
  ];
  room(x, 300);
  let cx = MX; cols.forEach((h, i) => { cell(x.doc, h, cx, x.y, w[i], 24, { f: 'b', bg: C.lav, color: C.navy }); cx += w[i]; }); x.y += 24;
  for (const [label, f, h, big] of rows) {
    const rh = h ?? 22; cx = MX;
    cell(x.doc, label, cx, x.y, w[0], rh, { f: 'b', color: C.gray }); cx += w[0];
    t.forEach((c, i) => { const el = c.empty ? '' : label === '천간' ? c.stem.el : label === '지지' ? c.branch.el : ''; cell(x.doc, c.empty && big ? '시간\n모름' : val(c, f), cx, x.y, w[i + 1], rh, { f: big ? 'sb' : 'r', size: big ? 11 : 9, color: el ? EL[el] : C.ink }); cx += w[i + 1]; });
    x.y += rh;
  }
  x.y += 16;
}
function bars(x: Ctx, items: { label: string; v: number; color?: string; note?: string }[], max = 100, title?: string) {
  if (title) { room(x, 30); font(x.doc, 'b', 11, C.navy); x.doc.text(title, MX, x.y, { width: CW, lineBreak: false }); x.y += 20; }
  for (const it of items) {
    room(x, 22);
    font(x.doc, 'b', 10, it.color ?? C.navy); x.doc.text(it.label, MX, x.y, { width: 90, lineBreak: false });
    const bw = CW - 150;
    x.doc.roundedRect(MX + 92, x.y + 3, bw, 9, 4.5).fill('#ECE7DD');
    if (it.v > 0) x.doc.roundedRect(MX + 92, x.y + 3, Math.max(9, (it.v / max) * bw), 9, 4.5).fill(it.color ?? C.navy);
    font(x.doc, 'b', 10, C.ink); x.doc.text(it.note ?? String(it.v), MX + 92 + bw + 8, x.y, { width: 50, lineBreak: false });
    x.y += 22;
  }
  x.y += 8;
}

function render(doc: Doc, c: Long, meta: { name: string; birth: string; date: string }, toc: Record<string, number> | null) {
  const x: Ctx = { doc, y: TOP, page: 0, title: '정통사주 감정서', name: meta.name, marks: {} };
  // 표지
  newPage(x, true);
  doc.rect(0, 0, W, H).fill(C.navy);
  doc.circle(W / 2, 250, 70).lineWidth(1).strokeColor(C.gold).stroke();
  doc.circle(W / 2 + 22, 238, 58).fill(C.navy);
  font(doc, 'b', 10, C.gold); doc.text('DALSAEGIM PERSONAL SAJU REPORT', 0, 360, { width: W, align: 'center', characterSpacing: 2 });
  font(doc, 'sb', 30, '#F7F3EA'); doc.text('정통사주 감정서', 0, 392, { width: W, align: 'center' });
  font(doc, 'sr', 13, '#D9D3C4'); doc.text('나의 사주지도 전체 풀이', 0, 440, { width: W, align: 'center' });
  font(doc, 'b', 16, '#F7F3EA'); doc.text(`${meta.name} 님`, 0, 520, { width: W, align: 'center' });
  font(doc, 'r', 10.5, '#D9D3C4'); doc.text(meta.birth, 0, 546, { width: W, align: 'center' });
  font(doc, 'r', 9, '#B9B4A8'); doc.text(`달새김사주 · 오늘의 운을 읽고, 나의 시간을 새기다 · ${meta.date}`, 0, H - 80, { width: W, align: 'center' });
  // 들어가며 + 핵심 요약
  newPage(x);
  heading(x, 'INTRO', '들어가며');
  para(x, c.intro);
  if (c.summary) {
    heading(x, 'SUMMARY', '핵심 요약');
    box(x, c.summary.headline);
    para(x, c.summary.lead);
    bars(x, c.summary.metrics.map((m) => ({ label: m.label, v: m.score })), 100);
    for (const s of c.summary.steps) para(x, `· ${s.label} — ${s.text}`, { after: 2 });
    x.y += 6; para(x, `오늘부터 적용할 한 가지: ${c.summary.action}`, { f: 'b', color: C.navy });
    para(x, '막대는 사주로 계산한 지수예요(100에 가까울수록 기운이 밝아요). 확률이나 결과 보장이 아니에요.', { size: 8.5, color: C.faint });
  }
  // 목차
  newPage(x);
  heading(x, 'CONTENTS', '목차');
  let lastPart = -1;
  c.chapters.forEach((ch, i) => {
    if (ch.part != null && ch.part !== lastPart) { lastPart = ch.part; x.y += 6; font(doc, 'b', 10.5, C.gold); doc.text(c.parts?.[ch.part] ?? '', MX, x.y, { width: CW, lineBreak: false }); x.y += 20; }
    font(doc, 'r', 10.5, C.ink);
    doc.text(`${String(i + 1).padStart(2, '0')}  ${ch.title}`, MX + 8, x.y, { width: CW - 60, lineBreak: false });
    doc.text(toc ? String(toc[ch.id] ?? '') : '', W - MX - 40, x.y, { width: 40, align: 'right', lineBreak: false });
    x.y += 18.5;
  });
  // 사주 원국표
  const v = c.visual as any;
  if (v?.table) {
    newPage(x);
    heading(x, 'MYEONGSIK', `${meta.name} 님의 사주 원국표`);
    para(x, '시주·일주·월주·연주 네 기둥과 여덟 글자의 기본표예요. 오행은 색으로 표시했어요(목 초록 · 화 빨강 · 토 황토 · 금 회색 · 수 남색).', { size: 9.5, color: C.gray });
    sajuTable(x, v.table);
    if (v.elements) bars(x, v.elements.map((e: any) => ({ label: `${e.el} ${({ 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' } as any)[e.el]}`, v: e.pct, color: EL[e.el], note: `${e.pct}%` })), Math.max(...v.elements.map((e: any) => e.pct), 1), '오행 비율');
  }
  // 본문
  lastPart = -1;
  c.chapters.forEach((ch, i) => {
    if (ch.part != null && ch.part !== lastPart) {
      lastPart = ch.part;
      newPage(x);
      x.y = 300;
      font(doc, 'b', 10, C.gold); doc.text(`PART ${ch.part + 1}`, 0, x.y, { width: W, align: 'center', characterSpacing: 2 }); x.y += 26;
      font(doc, 'sb', 22, C.navy); doc.text((c.parts?.[ch.part] ?? '').replace(/^제\d부 · /, ''), MX, x.y, { width: CW, align: 'center' }); x.y += 50;
      const inPart = c.chapters.map((y, j) => ({ y, j })).filter(({ y }) => y.part === ch.part);
      font(doc, 'r', 10.5, C.gray);
      for (const { y, j } of inPart) { doc.text(`${String(j + 1).padStart(2, '0')}  ${y.title}`, 0, x.y, { width: W, align: 'center', lineBreak: false }); x.y += 19; }
      newPage(x);
    } else if (i > 0) { x.y += 18; room(x, 160); }
    x.marks[ch.id] = x.page - 1;
    heading(x, `CHAPTER ${String(i + 1).padStart(2, '0')}`, ch.title);
    if (ch.say) para(x, ch.say, { f: 'b', size: 10.5, color: C.gold, after: 10 });
    ch.body.split(/\n{2,}/).forEach((t) => para(x, t.trim()));
    if (v?.daeunAt === i && v.daeun?.length) table(x, ['나이', '연도', '대운', '주제', '지수'], v.daeun.map((d: any) => [`${d.fromAge}~${d.toAge}세`, `${d.fromYear}~${d.toYear}`, `${d.hanja} ${d.text}`, d.theme + (d.now ? ' (지금)' : ''), String(d.score)]), [62, 86, 74, CW - 62 - 86 - 74 - 46, 46], { title: '평생 대운표', hi: (r) => (v.daeun[r].now ? C.goldBg : undefined) });
    if (v?.seunAt === i && v.seun?.length) table(x, ['연도', '간지', '십성', '종합', '연애', '일', '재물'], v.seun.map((s: any) => [String(s.y), s.gz, s.sip, String(s.score), String(s.love), String(s.work), String(s.wealth)]), [50, 110, 60, 50, 50, 50, CW - 370], { title: '앞으로 10년 세운표' });
    if (v?.wolunAt === i && v.wolun?.length) table(x, ['달', '간지', '십성', '연애', '일', '재물'], v.wolun.map((s: any) => [`${s.y}.${s.m}`, s.gz, s.sip, String(s.love), String(s.work), String(s.wealth)]), [70, 110, 70, 70, 70, CW - 390], { title: '앞으로 12달 월운표' });
    if (v?.luckyAt === i && v.lucky) { const l = v.lucky; table(x, ['행운 색', '숫자', '방향', '모양'], [[l.color, (l.number ?? []).join('·'), l.direction, l.shape]], [CW / 4, CW / 4, CW / 4, CW / 4], { title: `채우면 좋은 기운 · ${l.element}` }); para(x, `행운템: ${l.item} / 습관: ${l.routine}`, { size: 9.5, color: C.gray }); para(x, l.note ?? '', { size: 8.5, color: C.faint }); }
    if (ch.highlight) box(x, ch.highlight);
  });
  // 마무리
  newPage(x);
  heading(x, 'CLOSING', c.closing.title);
  para(x, c.closing.body);
  for (const t of c.closing.tips) para(x, `· ${t}`, { after: 3 });
  x.y += 20;
  para(x, '이 감정서는 사주 계산 결과를 바탕으로 작성한 자기 이해용 참고 자료예요. 의료·법률·투자 판단을 대신하지 않으며, 결과를 보장하지 않아요.', { size: 8.5, color: C.faint });
  return x.marks;
}

export async function readingPdf(c: Long, meta: { name: string; birth: string; date: string }): Promise<Buffer> {
  const make = () => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, info: { Title: `${meta.name} 님의 정통사주 감정서`, Author: '달새김사주' } });
    for (const [k, [file, ps]] of Object.entries(FONTS)) {
      // 명조(Serif)가 없는 서버면 고딕으로 대신
      const [f2, p2] = existsSync(`${DIR()}/${file}`) ? [file, ps] : k === 'sb' ? FONTS.b : FONTS.r;
      doc.registerFont(k, `${DIR()}/${f2}`, p2);
    }
    return doc;
  };
  // 1차: 장마다 시작 쪽 계산 → 2차: 목차에 쪽 번호를 넣어 실제 출력
  const probe = make();
  const marks = render(probe, c, meta, null);
  probe.end();
  const doc = make();
  const chunks: Buffer[] = [];
  doc.on('data', (b: Buffer) => chunks.push(b));
  const done = new Promise<void>((res) => doc.on('end', () => res()));
  render(doc, c, meta, marks);
  doc.end();
  await done;
  return Buffer.concat(chunks);
}
