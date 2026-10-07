// 파비콘·앱 아이콘·공유 미리보기(OG) 이미지를 SVG 로 그려 PNG 로 만든다(외부 이미지 없음). 사용: node scripts/make-brand-images.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const out = (f) => new URL(`../web/public/img/${f}`, import.meta.url).pathname;
const icon = readFileSync(new URL('../web/public/favicon.svg', import.meta.url));
await sharp(icon).resize(180, 180).png().toFile(out('icon-180.png'));
await sharp(icon).resize(512, 512).png().toFile(out('icon-512.png'));
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs>
<radialGradient id="bg" cx="80%" cy="0%" r="120%"><stop offset="0" stop-color="#3A3F66"/><stop offset=".45" stop-color="#262B4E"/><stop offset="1" stop-color="#1B1F3B"/></radialGradient>
<radialGradient id="m" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF8EE"/><stop offset=".7" stop-color="#F2DCCB"/><stop offset="1" stop-color="#D8B895"/></radialGradient>
<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F7E7DC" stop-opacity=".3"/><stop offset="1" stop-color="#F7E7DC" stop-opacity="0"/></radialGradient>
<mask id="c"><rect width="1200" height="630" fill="#fff"/><circle cx="975" cy="235" r="120" fill="#000"/></mask></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<circle cx="930" cy="290" r="240" fill="url(#g)"/><circle cx="930" cy="290" r="128" fill="url(#m)" mask="url(#c)"/>
<g fill="#fff" opacity=".6"><circle cx="140" cy="120" r="2"/><circle cx="420" cy="80" r="1.5"/><circle cx="640" cy="170" r="1.6"/><circle cx="260" cy="470" r="1.4"/><circle cx="1100" cy="520" r="2"/></g>
<text x="90" y="300" font-size="92" font-weight="600" fill="#F7F3EE" font-family="'Noto Serif CJK KR','Noto Serif KR',serif">달새김사주</text>
<text x="94" y="380" font-size="38" fill="#D8B895" font-family="'Noto Serif CJK KR','Noto Serif KR',serif">오늘의 운을 읽고, 나의 시간을 새기다.</text>
<text x="94" y="520" font-size="28" fill="#B9B6CF" font-family="'Noto Sans CJK KR',sans-serif">오늘의 운세 · 내 고민의 길 · AI 사주친구 · 돈의 흐름</text></svg>`;
await sharp(Buffer.from(og)).png().toFile(out('og.png'));
console.log('brand images ok');
