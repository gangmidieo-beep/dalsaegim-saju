// 공유하기 — 카카오톡 / LINE / 인스타그램 / 틱톡 / 스레드 / 문자 / 기타 공유 / 링크 복사 (+ 이미지가 있으면 이미지 저장)
// 플랫폼마다 웹에서 할 수 있는 일이 달라서, 바로 보낼 수 없는 곳(인스타그램·틱톡)은 이미지 저장 + 링크 복사로 대신한다.
// 개인 편지·사주 정보는 기본 비공개 — 화면에서 고객이 고른 것만 이 시트로 들어온다.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { kakaoShare, shortLink } from '../lib/share';
import { track } from '../lib/track';
import { Sheet, useToast } from './ui';

export type ShareOpts = {
  title: string; // 링크 미리보기 제목
  text: string; // 링크 미리보기 설명·메시지 본문
  path: string; // 열릴 화면(사이트 안 주소)
  contentId: string; // 집계용 이름
  image?: () => Promise<Blob | null>; // 이미지로도 나눌 수 있는 콘텐츠(부적·편지 카드 등)
  filename?: string;
  note?: string; // 시트 위에 보일 안내(예: 편지 내용은 보내지 않아요)
};
type Ch = 'kakao' | 'line' | 'instagram' | 'tiktok' | 'threads' | 'sms' | 'more' | 'copy' | 'save';
const enc = encodeURIComponent;
const CH: { id: Ch; label: string; mark: string; bg: string; fg: string }[] = [
  { id: 'kakao', label: '카카오톡', mark: 'TALK', bg: '#FEE500', fg: '#191919' },
  { id: 'line', label: 'LINE', mark: 'LINE', bg: '#06C755', fg: '#fff' },
  { id: 'instagram', label: '인스타그램', mark: 'IG', bg: 'linear-gradient(45deg,#F9CE34,#EE2A7B,#6228D7)', fg: '#fff' },
  { id: 'tiktok', label: '틱톡', mark: '♪', bg: '#111', fg: '#fff' },
  { id: 'threads', label: '스레드', mark: '@', bg: '#1B1F3B', fg: '#fff' },
  { id: 'sms', label: '문자', mark: 'SMS', bg: '#34C759', fg: '#fff' },
  { id: 'more', label: '기타 공유', mark: '⋯', bg: '#EFEAFF', fg: '#1B1F3B' },
  { id: 'copy', label: '링크 복사', mark: '⧉', bg: '#EFEAFF', fg: '#1B1F3B' },
];

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch {
    const t = document.createElement('textarea');
    t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
}
function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 10_000);
}

const Ctx = createContext<(o: ShareOpts) => void>(() => {});
export const useShare = () => useContext(Ctx);

export function ShareProvider({ children }: { children: ReactNode }) {
  const [o, setO] = useState<ShareOpts | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const open = useCallback((x: ShareOpts) => { setO(x); track('share_click', { content: x.contentId }); }, []);
  const close = () => setO(null);

  const run = async (ch: Ch) => {
    if (!o || busy) return;
    setBusy(true);
    try {
      const url = await shortLink(o.path, o.contentId, o.title, o.text);
      const msg = `${o.text}\n${url}`;
      track('share', { content: o.contentId, channel: ch });
      const file = async () => { const b = await o.image?.(); return b ? new File([b], o.filename ?? 'dalsaegim.png', { type: b.type || 'image/png' }) : null; };
      const nativeFile = async () => { const f = await file(); if (f && navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: o.title, text: msg }); return true; } return false; };
      switch (ch) {
        case 'kakao': {
          if (__KAKAO_JS_KEY__) { await kakaoShare({ title: o.title, text: o.text, url }); break; }
          if (navigator.share) { await navigator.share({ title: o.title, text: o.text, url }); break; }
          await copy(msg); toast('링크를 복사했어요. 카카오톡 대화창에 붙여 넣어 주세요'); break;
        }
        case 'line': open_(`https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(o.text)}`); break;
        case 'threads': open_(`https://www.threads.com/intent/post?text=${enc(msg)}`); break;
        case 'sms': location.href = `sms:?&body=${enc(msg)}`; break;
        case 'instagram': case 'tiktok': {
          // 웹에서 인스타그램·틱톡으로 바로 보낼 수 없어 → 휴대폰 공유창(이미지) → 안 되면 이미지 저장 + 링크 복사
          const app = ch === 'instagram' ? '인스타그램' : '틱톡';
          if (await nativeFile().catch(() => false)) break;
          const f = await file();
          await copy(url);
          if (f) { download(f, f.name); toast(`이미지를 저장하고 링크를 복사했어요. ${app}에 이미지를 올리고 링크를 붙여 넣어 주세요`); }
          else toast(`링크를 복사했어요. ${app} 프로필·스토리 링크에 붙여 넣어 주세요`);
          break;
        }
        case 'more': {
          if (await nativeFile().catch(() => false)) break;
          if (navigator.share) { await navigator.share({ title: o.title, text: o.text, url }); break; }
          await copy(msg); toast('링크를 복사했어요'); break;
        }
        case 'copy': await copy(url); toast('링크를 복사했어요'); break;
        case 'save': { const f = await file(); if (f) { download(f, f.name); toast('이미지를 저장했어요'); } break; }
      }
      close();
    } catch { /* 공유 취소 */ } finally { setBusy(false); }
  };

  return (
    <Ctx.Provider value={open}>
      {children}
      <Sheet open={!!o} onClose={close} label="공유하기">
        <h2 className="h3">공유하기</h2>
        {o?.note && <p className="faint mt4" style={{ margin: '4px 0 0' }}>{o.note}</p>}
        <div className="share-grid mt16">
          {[...CH, ...(o?.image ? [{ id: 'save' as Ch, label: '이미지 저장', mark: '↓', bg: '#F6EEDB', fg: '#7A5A1E' }] : [])].map((c) => (
            <button key={c.id} onClick={() => run(c.id)} disabled={busy}>
              <span className="share-mark" style={{ background: c.bg, color: c.fg }}>{c.mark}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <button className="btn line mt16" onClick={close}>닫기</button>
      </Sheet>
    </Ctx.Provider>
  );
}
const open_ = (u: string) => window.open(u, '_blank', 'noopener');
