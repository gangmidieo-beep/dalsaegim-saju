// 마음 보내기 — 편지·부적을 '이미지 그 자체'로 보낸다(10/29 대표님 요청).
// 1) 휴대폰 공유창이 사진 파일을 받으면(크롬·사파리·삼성 인터넷) → 사진 그대로 카카오톡·라인·인스타·문자로
// 2) 카카오톡 안 브라우저처럼 공유창이 없으면 → 이미지를 올리고 외부 브라우저의 '보내기 화면'(/g/:code?send=1)으로 넘긴다
// 3) 그 밖(PC 등) → 이미지 저장 + 링크 복사 안내
import { apiAuth } from './api';

const serif = '"Noto Serif KR", "Nanum Myeongjo", serif';

export const LETTER_THEMES = [
  { id: 'cheer', label: '응원', color: '#b8892f', ex: ['너라면 분명 해낼 거야. 오늘도 정말 고생 많았어.', '결과보다 지금까지 버텨 온 네가 더 대단해.', '힘들 땐 잠깐 쉬어 가도 괜찮아. 늘 응원할게.'] },
  { id: 'comfort', label: '위로', color: '#6f7fb3', ex: ['괜찮지 않아도 괜찮아. 내가 곁에 있을게.', '오늘 하루도 정말 수고했어. 푹 쉬어.', '지나고 나면 지금의 너를 더 아끼게 될 거야.'] },
  { id: 'thanks', label: '감사', color: '#b06b45', ex: ['늘 곁에 있어 줘서 고마워.', '말로 다 못 했지만 정말 고마웠어.', '네 덕분에 힘을 많이 얻었어.'] },
  { id: 'love', label: '사랑', color: '#c2556a', ex: ['오늘도 많이 사랑해.', '함께라서 매일이 조금 더 따뜻해.', '네가 웃으면 나도 행복해.'] },
  { id: 'congrats', label: '축하', color: '#3f8a6a', ex: ['정말 축하해! 그동안 애쓴 만큼 빛나는 날이야.', '새로운 시작을 진심으로 응원해.', '오늘의 기쁨이 오래오래 이어지길.'] },
] as const;
export type LetterTheme = (typeof LETTER_THEMES)[number]['id'];

const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

/** 글자 단위로 폭에 맞춰 줄 나누기(한글은 띄어쓰기 기준, 너무 긴 낱말은 글자 단위) */
function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let cur = '';
    for (const word of para.split(' ')) {
      const t = cur ? `${cur} ${word}` : word;
      if (g.measureText(t).width <= width) { cur = t; continue; }
      if (cur) out.push(cur);
      cur = '';
      for (const ch of word) { if (g.measureText(cur + ch).width > width) { out.push(cur); cur = ch; } else cur += ch; }
    }
    out.push(cur);
  }
  return out.filter((l, i, a) => l || (i > 0 && i < a.length - 1));
}

/** 마음 편지 카드(1080×1350, 인스타·카톡에 알맞은 4:5) */
export async function drawLetterCard(o: { to: string; from: string; body: string; theme: LetterTheme }): Promise<string> {
  const W = 1080, H = 1350;
  const th = LETTER_THEMES.find((t) => t.id === o.theme) ?? LETTER_THEMES[0];
  await Promise.all(['600 56px "Noto Serif KR"', '400 44px "Noto Serif KR"'].map((f) => document.fonts?.load(f).catch(() => null)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fcf8ef'); bg.addColorStop(1, '#f2e7d2');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 금색 두 줄 테두리
  g.strokeStyle = 'rgba(184, 146, 95, 0.75)'; g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80);
  g.strokeStyle = 'rgba(184, 146, 95, 0.4)'; g.lineWidth = 1.5; g.strokeRect(56, 56, W - 112, H - 112);
  // 달 로고
  try { const moon = await loadImg('/img/ui/logo-moon.webp'); g.drawImage(moon, W / 2 - 56, 96, 112, 112); } catch { /* 로고 없이 */ }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = th.color; g.font = `600 30px ${serif}`; g.fillText(`달빛 편지 · ${th.label}`, W / 2, 242);
  // To.
  g.textAlign = 'left'; g.fillStyle = '#1d2440'; g.font = `600 56px ${serif}`;
  g.fillText(`To. ${o.to}`, 130, 340);
  g.strokeStyle = 'rgba(184, 146, 95, 0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(130, 390); g.lineTo(W - 130, 390); g.stroke();
  // 본문
  // 짧은 편지는 글자를 키우고 가운데로 — 빈 종이처럼 보이지 않게
  g.fillStyle = '#2f3352';
  g.font = `400 44px ${serif}`;
  let lines = wrap(g, o.body.trim(), W - 260).slice(0, 11);
  let lh = 70;
  if (lines.length <= 5) { g.font = `400 52px ${serif}`; lines = wrap(g, o.body.trim(), W - 260).slice(0, 8); lh = 86; }
  const top0 = 440, bottom0 = 1110, blockH = lines.length * lh;
  const y0 = top0 + Math.max(0, (bottom0 - top0 - blockH) / 2) + lh / 2;
  lines.forEach((l, i) => g.fillText(l, 130, y0 + i * lh));
  // From.
  g.textAlign = 'right'; g.fillStyle = '#1d2440'; g.font = `600 50px ${serif}`;
  g.fillText(`From. ${o.from}`, W - 130, 1185);
  g.textAlign = 'center'; g.fillStyle = 'rgba(122, 90, 34, 0.75)'; g.font = `400 26px ${serif}`;
  g.fillText('달새김사주 · 오늘의 운을 읽고, 나의 시간을 새기다', W / 2, 1262);
  return cv.toDataURL('image/jpeg', 0.92);
}

/** dataURL → 파일(공유창에 넘길 사진). 미리 만들어 두어야 버튼을 누른 즉시 공유창이 열린다 */
export function fileOf(dataUrl: string, name: string): File {
  const [head, b64] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type });
}

/** 올리기용 JPEG(가로 900) */
async function toJpeg(dataUrl: string) {
  const img = await loadImg(dataUrl);
  const cv = document.createElement('canvas'); cv.width = 900; cv.height = Math.round(900 * img.height / img.width);
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.86);
}

export const inKakao = () => /KAKAOTALK/i.test(navigator.userAgent);
export const canShareFile = (f: File | null) => !!f && !!navigator.canShare?.({ files: [f] });

export type GiftInfo = { kind: 'charm' | 'letter'; title: string; fromName: string; toName?: string };
/** 서버에 올리고 링크 받기(받는 사람이 링크에서 이미지 그대로) */
export async function uploadGift(dataUrl: string, info: GiftInfo) {
  return apiAuth<{ url: string; code: string }>('/gifts', { method: 'POST', json: { ...info, image: await toJpeg(dataUrl) } });
}

/** 이미지로 보내기 — 결과: shared(공유창) | external(외부 브라우저로 넘김) | save(저장 안내 필요) */
export async function sendImage(file: File, dataUrl: string, info: GiftInfo): Promise<{ mode: 'shared' | 'external' | 'save' | 'cancelled'; url?: string }> {
  if (canShareFile(file)) {
    try { await navigator.share({ files: [file] }); return { mode: 'shared' }; } catch (e) { if ((e as Error).name === 'AbortError') return { mode: 'cancelled' }; }
  }
  const r = await uploadGift(dataUrl, info);
  if (inKakao()) { location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(`${r.url}?send=1`)}`; return { mode: 'external', url: r.url }; }
  return { mode: 'save', url: r.url };
}

export function downloadData(dataUrl: string, name: string) {
  const a = document.createElement('a'); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
