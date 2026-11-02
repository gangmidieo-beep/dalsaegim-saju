// 풀이 A4 PDF — ① 상품별 표지 ② 한 페이지 목차(쪽 번호) ③ 들어가며·원국표·본문 ④ 서월의 한 장 요약 ⑤ 달빛선물(편지·황금부적). 11/3 대표님 확정 구성
// pdfkit + Noto CJK(서버 이미지의 fonts-noto-cjk). 브라우저 없이 서버에서 바로 만든다.
// 한국어는 어절 단위로 줄을 바꾼다(단어 중간에서 끊지 않음 — pdfkit 기본 줄바꿈 대신 직접 배치).
import PDFDocument from 'pdfkit';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAROT } from '@dalsaegim/content';
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
  const size = o.size ?? 11.5, lh = size * (o.lead ?? 1.75), ind = o.indent ?? 0, width = (o.width ?? CW) - ind;
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

// 표지·목차·한 장 요약·달빛선물(대표님 10/25 확정 구성, 11/3 반영) — 표지 배경은 server/assets/covers/<상품>.jpg + covers.json(이름 띠 위치)
const ASSETS = fileURLToPath(new URL('../../../assets/', import.meta.url));
const COVERS = (() => { try { return JSON.parse(readFileSync(`${ASSETS}covers/covers.json`, 'utf8')) as Record<string, { band: [number, number, number, number]; cream: [number, number, number] }>; } catch { return {}; } })();
const PAPER = '#FDF9F0';
export function titleOf(c: Long): [string, string] {
  if ((c as { long?: boolean }).long) return ['정통사주 감정서', '나의 사주지도 전체 풀이'];
  const [a, ...b] = String(c.title ?? '달새김 풀이').split(' — ');
  return [a, b.join(' — ') || '달새김 풀이'];
}
const WISH: Record<string, [string, string]> = {
  love: ['인연과 다정', '다정한 마음이 좋은 인연으로 닿기를'],
  money: ['재물과 결실', '애쓴 시간이 든든한 결실로 돌아오기를'],
  time: ['새 출발과 행운', '다가올 시간이 밝은 걸음으로 이어지기를'],
  saju: ['평온과 결실', '나를 돌보는 여유가 차곡차곡 결실이 되기를'],
};
function giftLetter(c: Long, name: string): string[] {
  const tone = c.summary?.tone ?? 'saju';
  const L: Record<string, string[]> = {
    love: [`${name} 님, 마음을 쓰는 일은 언제나 용기가 필요해요.`, '오늘 읽은 카드와 흐름은 정답이 아니라, 내 마음을 비춰 본 거울이에요.', '서두르지 않아도 괜찮아요. 닿을 마음은 결국 닿게 되어 있어요.', '상대의 마음만큼 내 마음도 아껴 주는 날들이 되기를 바랄게요.', `${name} 님의 다정함이 좋은 인연으로 돌아오기를 응원합니다.`],
    money: [`${name} 님, 돈의 흐름을 읽는다는 건 나의 시간을 아끼는 일이에요.`, '좋은 달에는 과감하게, 조심할 달에는 차분하게 지켜 주세요.', '작은 기록 하나가 내년의 큰 차이를 만들어요.', '숫자보다 중요한 건, 그 숫자를 만드는 나의 하루예요.', `${name} 님의 애쓴 시간이 든든한 결실로 돌아오기를 응원합니다.`],
    time: [`${name} 님, 새로운 시간 앞에 선 지금이 가장 좋은 출발점이에요.`, '좋은 달을 달력에 표시하고, 그때 할 일을 하나씩 미리 적어 두세요.', '흔들리는 달이 와도, 미리 알고 있으면 덜 흔들려요.', '한 해의 끝에서 오늘을 돌아볼 때, 웃을 수 있기를 바라요.', `${name} 님의 걸음마다 밝은 기운이 함께하기를 응원합니다.`],
    saju: [`${name} 님, 차곡차곡 쌓아 온 배움과 다정함을 아껴 주세요.`, '다른 사람을 돌보듯, 내 마음에도 쉴 자리를 남겨 주세요.', '오래 품은 생각 하나를 작은 실천으로 꺼내 보세요.', '오늘의 한 걸음이 내일의 든든한 바탕이 되기를 바랍니다.', `서두르지 않아도 괜찮아요. ${name} 님의 속도를 응원합니다.`],
  };
  return L[tone] ?? L.saju;
}
/** 타로 카드 그림(벡터) — 고른 3장을 표지 다음 장에 */
function tarotCards(x: Ctx, cards: { id: number; rev: boolean }[]) {
  const cw = 118, ch = 190, gap = (CW - cw * 3) / 2;
  room(x, ch + 60);
  const labels = ['그 사람의 마음', '우리 사이의 흐름', '다가올 결과'];
  cards.slice(0, 3).forEach((d, i) => {
    const card = TAROT[d.id]; if (!card) return;
    const cx = MX + i * (cw + gap), cy = x.y;
    x.doc.roundedRect(cx, cy, cw, ch, 8).fill(C.navy);
    x.doc.roundedRect(cx + 6, cy + 6, cw - 12, ch - 12, 5).lineWidth(1).strokeColor(C.gold).stroke();
    const mx = cx + cw / 2, my = cy + (d.rev ? ch - 70 : 70);
    x.doc.circle(mx, my, 24).lineWidth(1).strokeColor(C.gold).stroke();
    x.doc.circle(mx + 9 * (d.rev ? -1 : 1), my - 4 * (d.rev ? -1 : 1), 20).fill(C.navy);
    for (const [dx, dy] of [[-34, -26], [36, -18], [-30, 30], [32, 28]]) x.doc.circle(mx + dx, my + dy, 1.4).fill('#E8C98F');
    const nameY = d.rev ? cy + 34 : cy + ch - 60;
    font(x.doc, 'sb', card.name.length > 5 ? 11 : 13, '#F7F3EA'); x.doc.text(card.name, cx + 8, nameY, { width: cw - 16, align: 'center', lineBreak: false });
    font(x.doc, 'r', 8.5, '#E8C98F'); x.doc.text(card.arcana === 'major' ? `MAJOR ${card.num ?? 0}` : (card.suit ?? '').toUpperCase(), cx + 8, nameY + 20, { width: cw - 16, align: 'center', lineBreak: false });
    font(x.doc, 'b', 10, C.navy); x.doc.text(labels[i], cx, cy + ch + 8, { width: cw, align: 'center', lineBreak: false });
    font(x.doc, 'r', 9, d.rev ? '#B33C66' : C.gold); x.doc.text(d.rev ? '역방향 (거꾸로 놓임)' : '정방향', cx, cy + ch + 24, { width: cw, align: 'center', lineBreak: false });
  });
  x.y += ch + 48;
}

function render(doc: Doc, c: Long, meta: { name: string; birth: string; date: string }, toc: Record<string, number> | null) {
  const [t1, t2] = titleOf(c);
  const x: Ctx = { doc, y: TOP, page: 0, title: t1, name: meta.name, marks: {} };
  // ① 표지 — 상품별 확정 표지(고객 이름·발행일은 실제 글자로) / 표지 이미지가 없으면 남색 표지
  newPage(x, true);
  const cov = COVERS[c.productId], covFile = `${ASSETS}covers/${c.productId}.jpg`;
  if (cov && existsSync(covFile)) {
    doc.image(covFile, 0, 0, { width: W, height: H });
    const k = W / 1055, [x0, y0, x1, y1] = cov.band, bw = (x1 - x0) * k, bh = (y1 - y0) * k;
    font(doc, 'sb', 17, C.navy); doc.text(`${meta.name} 님을 위한 ${t1}`, x0 * k, y0 * k + bh * 0.18, { width: bw, align: 'center', lineBreak: false });
    font(doc, 'r', 9.5, C.gray); doc.text(`${meta.birth}  ·  발행일 ${meta.date}`, x0 * k, y0 * k + bh * 0.62, { width: bw, align: 'center', lineBreak: false });
  } else {
    doc.rect(0, 0, W, H).fill(C.navy);
    doc.circle(W / 2, 250, 70).lineWidth(1).strokeColor(C.gold).stroke();
    doc.circle(W / 2 + 22, 238, 58).fill(C.navy);
    font(doc, 'b', 10, C.gold); doc.text('DALSAEGIM PERSONAL SAJU REPORT', 0, 360, { width: W, align: 'center', characterSpacing: 2 });
    font(doc, 'sb', t1.length > 12 ? 24 : 30, '#F7F3EA'); doc.text(t1, 40, 392, { width: W - 80, align: 'center' });
    font(doc, 'sr', 13, '#D9D3C4'); doc.text(t2, 40, 440, { width: W - 80, align: 'center' });
    font(doc, 'b', 16, '#F7F3EA'); doc.text(`${meta.name} 님`, 0, 520, { width: W, align: 'center' });
    font(doc, 'r', 10.5, '#D9D3C4'); doc.text(meta.birth, 0, 546, { width: W, align: 'center' });
    font(doc, 'r', 9, '#B9B4A8'); doc.text(`달새김사주 · 오늘의 운을 읽고, 나의 시간을 새기다 · ${meta.date}`, 0, H - 80, { width: W, align: 'center' });
  }
  // ② 목차 — 한 페이지(본문과 섞지 않음)
  newPage(x);
  font(doc, 'sb', 34, C.navy); doc.text('목차', MX, x.y, { width: CW, lineBreak: false }); x.y += 50;
  doc.moveTo(MX, x.y).lineTo(MX + 48, x.y).lineWidth(2).strokeColor(C.gold).stroke(); x.y += 14;
  font(doc, 'r', 12, C.gray); doc.text(`${meta.name} 님의 ${t1}`, MX, x.y, { width: CW, lineBreak: false }); x.y += 34;
  const big = c.chapters.length <= 14, rowH = big ? 27 : 19.5, fs = big ? 13.5 : 11;
  const tocRow = (label: string, page: string) => {
    if (x.y + rowH > H - BOT) newPage(x);
    font(doc, 'r', fs, C.ink);
    const lw = doc.widthOfString(label);
    doc.text(label, MX + 8, x.y, { width: CW - 70, lineBreak: false });
    font(doc, 'r', fs, C.faint);
    const dotsW = CW - 60 - Math.min(lw, CW - 70) - 16;
    if (dotsW > 10) doc.text('·'.repeat(Math.floor(dotsW / doc.widthOfString('·'))), MX + 16 + Math.min(lw, CW - 70), x.y, { width: dotsW, lineBreak: false });
    font(doc, 'r', fs, C.ink); doc.text(page, W - MX - 40, x.y, { width: 40, align: 'right', lineBreak: false });
    x.y += rowH;
  };
  let lastPart = -1;
  tocRow('들어가며', toc ? String(toc.__intro ?? '') : '');
  c.chapters.forEach((ch, i) => {
    if (ch.part != null && ch.part !== lastPart) { lastPart = ch.part; x.y += 8; if (x.y + 40 > H - BOT) newPage(x); font(doc, 'sb', 15, C.gold); doc.text(c.parts?.[ch.part] ?? '', MX, x.y, { width: CW, lineBreak: false }); x.y += 28; }
    tocRow(`${String(i + 1).padStart(2, '0')}   ${ch.title}`, toc ? String(toc[ch.id] ?? '') : '');
  });
  tocRow('한 장 핵심 요약', toc ? String(toc.__summary ?? '') : '');
  tocRow('달빛선물 — 편지와 황금부적', toc ? String(toc.__gift ?? '') : '');
  // ③ 본문 — 들어가며(+타로 카드 그림) → 원국표 → 장
  newPage(x);
  x.marks.__intro = x.page - 1;
  heading(x, 'INTRO', '들어가며');
  para(x, c.intro);
  if (c.summary?.cards?.length) tarotCards(x, c.summary.cards);
  const v = c.visual as any;
  if (v?.table) {
    newPage(x);
    heading(x, 'MYEONGSIK', `${meta.name} 님의 사주 원국표`);
    para(x, '시주·일주·월주·연주 네 기둥과 여덟 글자의 기본표예요. 오행은 색으로 표시했어요(목 초록 · 화 빨강 · 토 황토 · 금 회색 · 수 남색).', { size: 9.5, color: C.gray });
    sajuTable(x, v.table);
    if (v.elements) bars(x, v.elements.map((e: any) => ({ label: `${e.el} ${({ 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' } as any)[e.el]}`, v: e.pct, color: EL[e.el], note: `${e.pct}%` })), Math.max(...v.elements.map((e: any) => e.pct), 1), '오행 비율');
  }
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
    } else { x.y += 22; room(x, 200); }
    x.marks[ch.id] = x.page - 1;
    heading(x, `CHAPTER ${String(i + 1).padStart(2, '0')}`, ch.title);
    if (ch.say) para(x, ch.say, { f: 'b', size: 11.5, color: C.gold, after: 10 });
    ch.body.split(/\n{2,}/).forEach((t) => para(x, t.trim()));
    if (v?.daeunAt === i && v.daeun?.length) table(x, ['나이', '연도', '대운', '주제', '지수'], v.daeun.map((d: any) => [`${d.fromAge}~${d.toAge}세`, `${d.fromYear}~${d.toYear}`, `${d.hanja} ${d.text}`, d.theme + (d.now ? ' (지금)' : ''), String(d.score)]), [62, 86, 74, CW - 62 - 86 - 74 - 46, 46], { title: '평생 대운표', hi: (r) => (v.daeun[r].now ? C.goldBg : undefined) });
    if (v?.seunAt === i && v.seun?.length) table(x, ['연도', '간지', '십성', '종합', '연애', '일', '재물'], v.seun.map((s: any) => [String(s.y), s.gz, s.sip, String(s.score), String(s.love), String(s.work), String(s.wealth)]), [50, 110, 60, 50, 50, 50, CW - 370], { title: '앞으로 10년 세운표' });
    if (v?.wolunAt === i && v.wolun?.length) table(x, ['달', '간지', '십성', '연애', '일', '재물'], v.wolun.map((s: any) => [`${s.y}.${s.m}`, s.gz, s.sip, String(s.love), String(s.work), String(s.wealth)]), [70, 110, 70, 70, 70, CW - 390], { title: '앞으로 12달 월운표' });
    if (v?.luckyAt === i && v.lucky) { const l = v.lucky; table(x, ['행운 색', '숫자', '방향', '모양'], [[l.color, (l.number ?? []).join('·'), l.direction, l.shape]], [CW / 4, CW / 4, CW / 4, CW / 4], { title: `채우면 좋은 기운 · ${l.element}` }); para(x, `행운템: ${l.item} / 습관: ${l.routine}`, { size: 9.5, color: C.gray }); para(x, l.note ?? '', { size: 8.5, color: C.faint }); }
    if (ch.highlight && !ch.body.includes(ch.highlight)) box(x, ch.highlight); // 본문 첫 문장을 그대로 되풀이하지 않음
  });
  // ④ 한 장 핵심 요약 — 달빛 상담사 서월
  newPage(x);
  x.marks.__summary = x.page - 1;
  font(doc, 'b', 10, C.gold); doc.text('달빛 상담사 서월의 한 장 요약', 0, x.y, { width: W, align: 'center', characterSpacing: 1 }); x.y += 22;
  font(doc, 'sb', 20, C.navy); doc.text(`${meta.name} 님을 위한 ${t1} 핵심 정리`, MX, x.y, { width: CW, align: 'center' }); x.y += 34;
  font(doc, 'r', 9.5, C.gray); doc.text(`${t1} · ${meta.date} 기준`, 0, x.y, { width: W, align: 'center', lineBreak: false }); x.y += 24;
  if (c.summary) {
    box(x, c.summary.headline);
    if (c.summary.lead) para(x, c.summary.lead, { size: 10.5 });
    bars(x, c.summary.metrics.map((m) => ({ label: m.label, v: m.score })), 100);
    para(x, c.summary.note ?? '막대는 사주 계산으로 낸 지수예요(100에 가까울수록 그 분야의 기운이 밝아요). 확률이나 결과 보장이 아니에요.', { size: 8.5, color: C.faint });
    table(x, ['기억할 시기', '내용'], c.summary.steps.map((s) => [s.label, s.text]), [130, CW - 130], { rowH: 26 });
  }
  const pts = c.chapters.filter((ch) => ch.highlight).slice(0, c.chapters.length > 12 ? 8 : 6);
  const left = () => H - BOT - x.y; // 한 장에 담기 — 남은 자리만큼만
  if (pts.length && left() > pts.length * 22 + 160) {
    room(x, 40); font(doc, 'b', 11, C.navy); doc.text('장별 한 줄 정리', MX, x.y, { width: CW, lineBreak: false }); x.y += 20;
    for (const ch of pts) para(x, `· ${ch.title} — ${ch.highlight}`, { size: 10, after: 3 });
  }
  if (c.closing.tips.length && left() > 120) { x.y += 6; font(doc, 'b', 11, C.navy); doc.text('오늘 기억할 실천', MX, x.y, { width: CW, lineBreak: false }); x.y += 20; c.closing.tips.forEach((t, i) => para(x, `${i + 1}. ${t}`, { size: 10, after: 3 })); }
  if (c.summary?.action && left() > 70) box(x, `오늘부터 적용할 한 가지 — ${c.summary.action}`);
  // ⑤ 마지막 — 달빛선물(편지 + 황금부적)
  newPage(x, true);
  x.marks.__gift = x.page - 1;
  doc.rect(0, 0, W, H).fill(PAPER);
  doc.rect(22, 22, W - 44, H - 44).lineWidth(1.2).strokeColor(C.gold).stroke();
  doc.rect(28, 28, W - 56, H - 56).lineWidth(0.5).strokeColor(C.gold).stroke();
  const logo = `${ASSETS}logo-moon.png`;
  if (existsSync(logo)) doc.image(logo, W / 2 - 48, 46, { width: 96 });
  let gy = 150;
  font(doc, 'sb', 24, C.navy); doc.text(`${meta.name} 님의 달빛선물`, 0, gy, { width: W, align: 'center' }); gy += 38;
  font(doc, 'r', 10.5, C.gray); doc.text(`${t1} 풀이의 끝에, 마음을 담아`, 0, gy, { width: W, align: 'center', lineBreak: false }); gy += 34;
  font(doc, 'sr', 12, C.ink);
  for (const ln of giftLetter(c, meta.name)) { for (const l of lines(doc, ln, CW - 40)) { doc.text(l, MX + 20, gy, { width: CW - 40, align: 'center', lineBreak: false }); gy += 24; } }
  gy += 8;
  font(doc, 'sr', 11, C.navy); doc.text('달빛 상담사 서월(瑞月) 드림', MX, gy, { width: CW - 20, align: 'right', lineBreak: false }); gy += 18;
  font(doc, 'r', 9.5, C.gray); doc.text(meta.date, MX, gy, { width: CW - 20, align: 'right', lineBreak: false }); gy += 36;
  doc.moveTo(MX + 60, gy).lineTo(W - MX - 60, gy).lineWidth(0.6).strokeColor(C.gold).stroke(); gy += 26;
  // 황금부적
  const [wish, wishLine] = WISH[c.summary?.tone ?? 'saju'] ?? WISH.saju;
  const kx = MX + 30, kw = 150, kh = 206;
  const grad = doc.linearGradient(kx, gy, kx + kw, gy + kh); grad.stop(0, '#F6DFA0').stop(0.5, '#D9AE55').stop(1, '#B98A35');
  doc.roundedRect(kx, gy, kw, kh, 10).fill(grad);
  doc.roundedRect(kx + 7, gy + 7, kw - 14, kh - 14, 7).lineWidth(0.8).strokeColor('#8A6424').stroke();
  font(doc, 'sb', 13, '#5A3E12'); doc.text(`${meta.name} 님`, kx, gy + 20, { width: kw, align: 'center', lineBreak: false });
  doc.circle(kx + kw / 2, gy + 104, 34).lineWidth(1.4).strokeColor('#6B4A18').stroke();
  doc.circle(kx + kw / 2 + 13, gy + 97, 29).fill('#E2B964');
  for (const [dx, dy] of [[-44, -30], [42, -36], [-40, 34], [44, 30]]) doc.circle(kx + kw / 2 + dx, gy + 104 + dy, 1.6).fill('#6B4A18');
  font(doc, 'sb', 14, '#5A3E12'); doc.text(wish, kx, gy + kh - 40, { width: kw, align: 'center', lineBreak: false });
  const tx = kx + kw + 30, tw = W - MX - 20 - tx;
  font(doc, 'sb', 15, C.navy); doc.text(`${meta.name} 님을 위한 황금부적`, tx, gy + 40, { width: tw });
  font(doc, 'r', 11.5, C.ink); doc.text(wishLine, tx, gy + 86, { width: tw, lineGap: 6 });
  font(doc, 'r', 9, C.faint); doc.text('마음에 간직하는 상징적인 응원 선물', tx, gy + 150, { width: tw });
  gy += kh + 36;
  font(doc, 'sb', 13, C.navy); doc.text('다시 나를 돌아보고 싶은 날, 달새김에서 이야기를 이어가요.', MX, gy, { width: CW, align: 'center' }); gy += 30;
  font(doc, 'r', 8, C.faint); doc.text('이 풀이는 사주·타로 계산을 바탕으로 한 자기 이해용 참고 자료예요. 의료·법률·투자 판단을 대신하지 않으며 결과를 보장하지 않아요. · www.dalsaegim.com', MX + 10, H - 62, { width: CW - 20, align: 'center' });
  return x.marks;
}

export async function readingPdf(c: Long, meta: { name: string; birth: string; date: string }): Promise<Buffer> {
  const make = () => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, info: { Title: `달새김사주 ${titleOf(c)[0]} — ${meta.name} 님`, Subject: titleOf(c)[0], Author: '달새김사주' } });
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
