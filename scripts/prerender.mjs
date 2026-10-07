// 빌드 후 정적 HTML 사전 렌더 — 검색 크롤러·링크 미리보기가 JS 없이도 읽을 글을 각 주소의 index.html 에 넣는다.
// 브라우저에서는 React 가 #root 를 덮어써서 화면은 똑같다. brand.config + 상세 문구로 만든다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'web', 'dist');
const brand = JSON.parse(readFileSync(join(root, 'brand.config.json'), 'utf8'));
const detail = JSON.parse(readFileSync(join(root, 'packages/content/data/detail.json'), 'utf8'));
const chapters = JSON.parse(readFileSync(join(root, 'packages/content/data/reading.json'), 'utf8')).chapters;
const SITE = brand.serviceName;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const shell = readFileSync(join(dist, 'index.html'), 'utf8');
function page(path, title, desc, body) {
  const html = shell
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace('<div id="root"></div>', `<div id="root"><div class="prerender" style="display:none">${body}</div></div>`);
  const dir = join(dist, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
const won = (n) => `${n.toLocaleString('ko-KR')}원`;
const visible = brand.products.filter((p) => p.visible !== false && !p.adult);
page('', SITE, `${brand.slogan} 오늘의 운세·내 고민의 길·AI 사주친구·돈의 흐름.`,
  `<h1>${SITE}</h1><p>${esc(brand.slogan)}</p><ul>${visible.map((p) => `<li><a href="/product/${p.id}">${esc(p.title)}</a> — ${esc(p.cardCopy)}</li>`).join('')}</ul>`);
page('today', `오늘의 운세 | ${SITE}`, '오늘의 지수, 연애·재물·직장·건강운과 오늘의 키워드를 무료로.', '<h1>오늘의 운세</h1>');
page('money', `돈의 흐름 | ${SITE}`, '재물·사업·투자·부동산 — 달새김 재물 시리즈. 시장의 큰 흐름과 나의 흐름을 함께.', '<h1>돈의 흐름</h1>');
page('path', `내 고민의 길 | ${SITE}`, '고민을 따라가면 필요한 운세와 시기가 보여요.', '<h1>내 고민의 길</h1>');
page('friend', `AI 사주친구 | ${SITE}`, '내 사주와 기록을 아는 친구와 이야기해요.', '<h1>AI 사주친구</h1>');
page('mbti', `사주 × MBTI | ${SITE}`, '타고난 기운과 지금의 성향이 만나는 방식.', '<h1>사주 × MBTI</h1>');
for (const p of visible) {
  const d = detail[p.id];
  page(`product/${p.id}`, `${p.title} | ${SITE}`, d?.sub ?? p.cardCopy,
    `<h1>${esc(p.title)}</h1><p>${esc(d?.sub ?? p.cardCopy)}</p>` +
    (d ? `<h2>이런 분께 필요해요</h2><ul>${d.target.map((t) => `<li>${esc(t)}</li>`).join('')}</ul><p>${esc(d.why)}</p>` : '') +
    (chapters[p.id] ? `<h2>담기는 내용</h2><ol>${chapters[p.id].map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : '') + `<p>가격 ${won(p.price)}</p>`);
}
page('terms', `이용약관 | ${SITE}`, `${SITE} 이용약관`, '<h1>이용약관</h1>');
page('privacy', `개인정보처리방침 | ${SITE}`, `${SITE} 개인정보처리방침`, '<h1>개인정보처리방침</h1>');
page('refund', `환불정책 | ${SITE}`, `${SITE} 환불정책`, '<h1>환불정책</h1>');
writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin\n');
console.log('prerender ok');
