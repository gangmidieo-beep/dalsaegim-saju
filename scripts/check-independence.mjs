// 독립성 검사 — 다른 서비스·다른 의뢰인의 이름·도메인·판매자 아이디·서비스 ID·키 흔적이 저장소에 남아 있으면 실패(exit 1).
// 금지 문자열 목록은 이 파일 자신이 걸리지 않도록 base64 로 저장한다.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FORBIDDEN = Buffer.from(
  'amFqZW9uZwrsnpDsoJXsgqzso7wK7J6Q7KCVCmJpbWlsCuu5hOuwgOyLoOuLuQpiaW1pbHNpbmRhbmcKd2hpc3BlcnNhanUK6reT7IaN66eQCm55aDA5MjgKa2FtaTY2MTAKa2FtaTkyOApsc2oyMwp1cC5yYWlsd2F5LmFwcApjMWFiMWYyOQoxZTNhM2I5ZQozYTBhNmU4Mgpzay1hbnQtCnhrZXlzaWItCuyynOq2geuPhOuguQpuYW1hbgrrgpjrp4zsnZgg7Jq07IS4CuuCmOunjOydmOyatOyEuArsspzqtoEK7JuU7ZWY7ISg64WACuyepeyaqeuvvApteXVuc2UzNjUK64+Z66qF7IKs7KO8Cu2MqOyFmO2UvO2UjAp0YWxpc21hbg==',
  'base64',
).toString('utf8').split('\n');
// 검사 제외: 외부 패키지·빌드 결과
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'test-results', 'playwright-report', '.data']);
const EXCLUDE_FILES = new Set([['scripts', 'check-independence.mjs'].join(sep), 'package-lock.json']);
const BINARY = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf|pdf|zip|jar|keystore|jks|mp4|mp3)$/i;

const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name), rel = relative(ROOT, full);
    const st = statSync(full);
    // 앱 빌드 산출물(웹 복사본·gradle 결과)은 검사 대상 아님
    if (st.isDirectory()) { if (!EXCLUDE_DIRS.has(name) && !/^app[\\/]android[\\/](app[\\/](build|src[\\/]main[\\/]assets)|build|\.gradle|capacitor-cordova-android-plugins)/.test(rel)) walk(full); continue; }
    if (EXCLUDE_FILES.has(rel) || BINARY.test(name) || st.size > 5_000_000) continue;
    const lines = readFileSync(full, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const low = line.toLowerCase();
      for (const w of FORBIDDEN) if (low.includes(w.toLowerCase())) hits.push(`${rel}:${i + 1}  [${w.slice(0, 3)}…]`);
    });
  }
}
walk(ROOT);
if (hits.length) {
  console.error(`독립성 검사 실패 — ${hits.length}곳\n` + hits.join('\n'));
  process.exit(1);
}
console.log('독립성 검사 통과 ✓');
