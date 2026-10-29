// 따옴표로 감싼 말 뒤의 조사를 앞말 받침에 맞춘다 — '꿈꾸는 중재자'이에요 → '꿈꾸는 중재자'예요, '경쟁'예요 → '경쟁'이에요
// 괄호가 붙은 말은 괄호 앞 말을 기준으로 한다('수(물)'이에요 → '수(물)'예요). 숫자는 읽는 소리로, 영문·기호는 건드리지 않는다.
const DIGIT_BATCHIM: Record<string, boolean> = { '0': true, '1': true, '2': false, '3': true, '4': false, '5': false, '6': true, '7': true, '8': true, '9': false };
/** 받침 유무 — 판단할 수 없으면 null, ㄹ 받침이면 'ㄹ' */
function tail(w: string): boolean | 'ㄹ' | null {
  const s = w.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const ch = s.slice(-1);
  if (!ch) return null;
  const c = ch.charCodeAt(0) - 0xac00;
  if (c >= 0 && c < 11172) { const t = c % 28; return t === 0 ? false : t === 8 ? 'ㄹ' : true; }
  if (ch in DIGIT_BATCHIM) return DIGIT_BATCHIM[ch] ? (ch === '1' || ch === '7' || ch === '8' ? 'ㄹ' : true) : false;
  return null;
}
const PAIRS: [string, string][] = [['이에요', '예요'], ['이었어요', '였어요'], ['이라는', '라는'], ['이라고', '라고'], ['이라', '라'], ['이고', '고'], ['이며', '며'], ['이', '가'], ['을', '를'], ['은', '는'], ['과', '와'], ['으로', '로']];
const ALL = PAIRS.flat().sort((a, b) => b.length - a.length).join('|');
const RE = new RegExp(`(['‘"“])([^'’"”\\n]{1,40})(['’"”])(${ALL})(?=[\\s.,!?·)\\]…~]|$)`, 'g');
export function fixJosa(text: string): string {
  if (!text || !/['‘"“]/.test(text)) return text;
  return text.replace(RE, (all, o: string, w: string, c: string, j: string) => {
    const t = tail(w);
    if (t === null) return all;
    const pair = PAIRS.find(([a, b]) => a === j || b === j)!;
    const pick = pair[0] === '으로' ? (t === true ? '으로' : '로') : t ? pair[0] : pair[1];
    return `${o}${w}${c}${pick}`;
  });
}
/** 객체 안의 모든 문자열에 fixJosa 적용 */
export function fixJosaDeep<T>(x: T): T {
  if (typeof x === 'string') return fixJosa(x) as T;
  if (Array.isArray(x)) return x.map(fixJosaDeep) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fixJosaDeep(v)])) as T;
  return x;
}
