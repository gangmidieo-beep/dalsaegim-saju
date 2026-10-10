// 공유 카드 이미지(서버 생성) — 가로 1200×630(링크 미리보기 OG), 세로 1080×1350(이미지 공유).
// 글꼴: SVG 는 서버 시스템 글꼴을 쓴다 → Dockerfile 에서 fonts-noto-cjk 설치(윈도우 개발 PC 는 맑은 고딕).
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 링크 미리보기 배경(황금빛 달·분홍 벚꽃·딥네이비 밤하늘, 왼쪽은 글자 자리)
const BG = join(dirname(fileURLToPath(import.meta.url)), '../../assets/share-bg.jpg');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 한글은 글자 폭이 거의 같으므로 글자 수로 줄바꿈
function wrap(text: string, perLine: number, maxLines: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > perLine) { out.push(line.trim()); line = word; } else line += ' ' + word;
    if (out.length === maxLines) break;
  }
  if (out.length < maxLines && line.trim()) out.push(line.trim());
  if (out.length === maxLines && text.replace(/\s+/g, '').length > out.join('').replace(/\s+/g, '').length) out[maxLines - 1] = out[maxLines - 1].replace(/.$/, '…');
  return out;
}
const FONT = `'Noto Serif CJK KR','Noto Serif KR','Malgun Gothic','NanumMyeongjo',serif`;

export async function shareCard(o: { title: string; text: string; url: string; size: 'wide' | 'tall' }) {
  if (o.size === 'wide' && existsSync(BG)) return wideCard(o);
  const [W, H] = o.size === 'wide' ? [1200, 630] : [1080, 1350];
  const pad = o.size === 'wide' ? 64 : 80;
  const lines = wrap(o.text, o.size === 'wide' ? 26 : 18, o.size === 'wide' ? 4 : 8);
  const fs = o.size === 'wide' ? 40 : 54;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262B4E"/><stop offset="1" stop-color="#14172E"/></linearGradient>
    <radialGradient id="moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF6E6"/><stop offset="1" stop-color="#D8B895"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - pad - fs * 1.2}" cy="${pad + fs * 1.2}" r="${fs * 1.6}" fill="#C7B6FF" opacity=".08"/>
  <circle cx="${W - pad - fs * 1.2}" cy="${pad + fs * 1.2}" r="${fs * 0.9}" fill="url(#moon)"/>
  <circle cx="${W - pad - fs * 0.85}" cy="${pad + fs * 1.0}" r="${fs * 0.8}" fill="#262B4E"/>
  <text x="${pad}" y="${pad + fs * 0.9}" font-size="${fs * 0.8}" font-weight="700" fill="#D8B895" font-family="${FONT}">${esc(o.title)}</text>
  ${lines.map((l, i) => `<text x="${pad}" y="${pad + fs * 2.6 + i * fs * 1.55}" font-size="${fs}" fill="#F7F3EE" font-family="${FONT}">${esc(l)}</text>`).join('\n  ')}
  <text x="${pad}" y="${H - pad}" font-size="${fs * 0.5}" fill="#B9B4CC" font-family="${FONT}">${esc(o.url.replace(/^https?:\/\//, ''))}</text>
  <text x="${W - pad}" y="${H - pad}" font-size="${fs * 0.75}" fill="#D8B895" text-anchor="end" font-family="${FONT}">달새김사주</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// 가로 1200×630 — 카카오톡·문자 링크 미리보기. 작은 화면에서도 읽히게 글자를 크게, 로고를 금빛으로.
async function wideCard(o: { title: string; text: string }) {
  const lines = wrap(o.text, 17, 3);
  const shade = Array.from({ length: 14 }, (_, i) => `<rect x="${i * 50}" y="0" width="50" height="630" fill="#080c22" opacity="${(0.42 * (1 - i / 14)).toFixed(3)}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${shade}
  <text x="72" y="118" font-size="30" font-weight="700" fill="#E8CF98" font-family="${FONT}">${esc(o.title.slice(0, 22))}</text>
  ${lines.map((l, i) => `<text x="72" y="${215 + i * 74}" font-size="52" font-weight="700" fill="#FBF4E6" font-family="${FONT}">${esc(l)}</text>`).join('\n  ')}
  <line x1="74" y1="${215 + lines.length * 74 - 22}" x2="190" y2="${215 + lines.length * 74 - 22}" stroke="#D9B874" stroke-width="3"/>
  <text x="72" y="560" font-size="58" font-weight="700" fill="#F6DC9C" font-family="${FONT}">달새김사주</text>
</svg>`;
  return sharp(BG).resize(1200, 630).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}
