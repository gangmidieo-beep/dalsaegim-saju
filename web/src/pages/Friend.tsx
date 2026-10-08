// AI 사주친구 (시안 6·6-1) — 캐릭터 화면 + 음성 상담(말하기 → 답을 읽어 줌) 기본, 텍스트 상담으로 전환 가능.
// 답할 때마다 "오늘의 새김" 요약 → [저장][수정][남기지 않기]. 캐릭터는 이 화면에서만 쓴다(다른 화면 과노출 지양).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp, useMain } from '../store/app';
import { apiAuth, syncProfile } from '../lib/api';
import { MemoryCard, Sheet, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import brand from '../../../brand.config.json';

type Msg = { role: 'user' | 'friend'; text: string; at?: string };
type Draft = { category: string; title: string; summary: string; sajuNote?: string };
const STARTERS = ['요즘 연애가 고민이에요', '이직해도 괜찮을까요?', '올해 돈 흐름이 궁금해요', '요즘 너무 지쳐요'];
const CHAR_IMG = '/img/ui/friend.webp'; // 대표님 확정 캐릭터가 오면 이 파일만 교체
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Friend() {
  const [sp] = useSearchParams();
  const { profile, isSample } = useMain();
  const { friendChatId, setFriendChat, setPass } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [text, setText] = useState(sp.get('q') ?? '');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ d: Draft; state: 'open' | 'saved' | 'skip' } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>(sp.get('q') ? 'text' : 'voice');
  const [rec, setRec] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [talk, setTalk] = useState<{ on: boolean; t: number; total: number }>({ on: false, t: 0, total: 0 });
  const [rate, setRate] = useState(1);
  const [sheet, setSheet] = useState<'log' | 'save' | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const nav = useNavigate();
  const topic = sp.get('topic');
  const pass = brand.products.find((p) => p.id === 'friend_pass')!;
  const lastFriend = [...msgs].reverse().find((m) => m.role === 'friend');
  const lastUser = msgs.length && msgs[msgs.length - 1].role === 'user' ? msgs[msgs.length - 1] : null;
  const greet = `${profile.name} 님, 무슨 일이 있으세요?\n편하게 말씀해요. 제가 함께 생각해 볼게요.`;

  useEffect(() => {
    if (isSample) return;
    apiAuth<{ remaining: number | null; pass: boolean }>('/friend/status').then((s) => { setRemaining(s.remaining); setPass(s.pass); }).catch(() => {});
    if (friendChatId && !sp.get('q')) apiAuth<{ id: string; messages: Msg[] }>(`/friend/chats/${friendChatId}`).then((c) => { setChatId(c.id); setMsgs(c.messages); }).catch(() => setFriendChat(null));
    return () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
  }, [isSample]);
  useEffect(() => { if (mode === 'text') end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, busy, draft, mode]);
  useEffect(() => { if (!rec) return; setRecSec(0); const i = setInterval(() => setRecSec((s) => s + 1), 1000); return () => clearInterval(i); }, [rec]);
  useEffect(() => { if (!talk.on) return; const i = setInterval(() => setTalk((x) => ({ ...x, t: Math.min(x.total, x.t + 0.25) })), 250); return () => clearInterval(i); }, [talk.on]);

  const speak = (t: string, r = rate) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ko-KR'; u.rate = r;
    const ko = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko') && /female|yuna|heami|sun/i.test(v.name)) ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'));
    if (ko) u.voice = ko;
    u.onend = () => setTalk((x) => ({ ...x, on: false, t: x.total }));
    setTalk({ on: true, t: 0, total: Math.max(3, (t.length * 0.14) / r) });
    speechSynthesis.speak(u);
  };
  const send = async (raw?: string) => {
    const t = (raw ?? text).trim();
    if (!t || busy) return;
    setText('');
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setBusy(true);
    try {
      await syncProfile(profile, true);
      const r = await apiAuth<{ chatId: string; reply: string; draft: Draft; remaining: number | null; pass: boolean }>('/friend/chat', { method: 'POST', json: { chatId, profileId: profile.id, text: t, topic, source: sp.get('q') ? 'path' : 'home' } });
      setChatId(r.chatId); setFriendChat(r.chatId);
      setMsgs((m) => [...m, { role: 'friend', text: r.reply }]);
      setRemaining(r.remaining); setPass(r.pass);
      setDraft({ d: r.draft, state: 'open' });
      if (mode === 'voice') speak(r.reply);
      track('friend_send', { topic: r.draft.category, mode });
    } catch (e: any) {
      setMsgs((m) => m.slice(0, -1));
      setText(t);
      if (e.code === 'friend_limit') setLimit(true); else toast(e.message);
    } finally { setBusy(false); }
  };
  const saveMemory = async (d: { category: string; title: string; summary?: string }) => {
    try {
      await apiAuth('/memories', { method: 'POST', json: { kind: 'consult', ...d, sajuNote: draft?.d.sajuNote, refId: chatId, profileId: profile.id } });
      setDraft((x) => (x ? { ...x, state: 'saved' } : x));
      track('memory_save', { kind: 'consult' });
    } catch (e: any) { toast(e.message); }
  };
  const listen = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { toast('이 브라우저에서는 음성 입력이 어려워요. 텍스트로 이야기해 주세요'); setMode('text'); return; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const r = new SR();
    r.lang = 'ko-KR'; r.interimResults = false;
    r.onresult = (e: any) => { const said = e.results[0][0].transcript; if (mode === 'voice') void send(said); else setText((x) => `${x} ${said}`.trim()); };
    r.onerror = () => setRec(false);
    r.onend = () => setRec(false);
    setRec(true); r.start();
  };
  const newChat = () => { setChatId(null); setFriendChat(null); setMsgs([]); setDraft(null); if ('speechSynthesis' in window) speechSynthesis.cancel(); };
  const hangUp = () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (draft?.state === 'open') setSheet('save'); else nav(-1);
  };

  if (isSample) return (
    <div className="friend-stage">
      <div className="night-top"><button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><I.back /></button><span /><span style={{ width: 40 }} /></div>
      <div className="f-bubble">내 사주를 아는 친구, 달새김이에요.{'\n'}생년월일을 알려 주시면 지금의 흐름까지 같이 짚어 드릴게요.</div>
      <div className="voice"><Link to="/profile/new?next=/friend" className="btn primary">사주 입력하고 대화하기</Link></div>
      <div style={{ height: 24 }} />
    </div>
  );

  const Save = draft && draft.state !== 'skip' && (
    <MemoryCard draft={draft.d} saved={draft.state === 'saved'} onSave={saveMemory} onSkip={() => { setDraft((x) => (x ? { ...x, state: 'skip' } : x)); setSheet(null); track('memory_skip', { kind: 'consult' }); }} />
  );
  const Sheets = (
    <>
      <Sheet open={sheet === 'log'} onClose={() => setSheet(null)} label="대화 내용">
        <h2 className="h2">대화 내용</h2>
        <div className="chat" style={{ padding: '12px 0' }}>
          {msgs.length === 0 && <p className="faint">아직 나눈 이야기가 없어요.</p>}
          {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'friend'}`}>{m.text}</div>)}
        </div>
      </Sheet>
      <Sheet open={sheet === 'save'} onClose={() => setSheet(null)} label="오늘의 새김">
        <h2 className="h2">오늘의 새김</h2>
        <p className="muted small mt4">이번 상담을 기록으로 남길지 골라 주세요. 남긴 기록만 타임라인에 새겨져요.</p>
        <div className="mt12">{Save || <p className="faint">상담을 나누면 요약이 자동으로 만들어져요.</p>}</div>
      </Sheet>
      <Sheet open={limit} onClose={() => setLimit(false)} label="이용권 안내">
        <h2 className="h2">오늘의 무료 대화를 모두 썼어요</h2>
        <p className="muted small mt8">무료 대화는 하루 {brand.friend.freePerDay}번이에요. 내일 다시 이어서 이야기하거나, 이용권으로 제한 없이 대화할 수 있어요.</p>
        <div className="card gold mt16"><b>{pass.title}</b><div className="small muted">{pass.cardCopy}</div><div className="mt8 hl-gold">{won(pass.price)}</div></div>
        <Link to="/checkout/friend_pass" className="btn primary mt16">이용권으로 계속 대화하기</Link>
        <button className="btn line mt8" onClick={() => setLimit(false)}>내일 다시 올게요</button>
      </Sheet>
    </>
  );

  if (mode === 'text') return (
    <div className="no-tab" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header className="top">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><I.back /></button>
        <div className="row" style={{ flex: 1, gap: 10 }}>
          <div className="avatar" style={{ width: 40, height: 40 }}><img src={CHAR_IMG} alt="" /></div>
          <div style={{ lineHeight: 1.3 }}><b>달새김</b><div className="faint" style={{ fontSize: 12 }}>{profile.name} 님의 사주와 기록을 알고 있어요</div></div>
        </div>
        <button className="icon-btn" aria-label="음성으로 상담하기" onClick={() => setMode('voice')}><I.mic /></button>
        <button className="icon-btn" aria-label="새 대화" onClick={newChat}><I.edit /></button>
      </header>
      <div className="chat" style={{ flex: 1 }}>
        {msgs.length === 0 && (
          <div className="fade-in">
            <div className="bubble friend">{greet}</div>
            <div className="chips mt12">{STARTERS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'friend'}`}>{m.text}</div>)}
        {busy && <div className="bubble friend"><span className="typing" aria-label="생각 중"><i /><i /><i /></span></div>}
        {!busy && Save}
        <div ref={end} />
      </div>
      {remaining != null && <p className="notice" style={{ margin: '0 0 4px' }}>오늘 무료 대화 {remaining}번 남았어요</p>}
      <div className="composer">
        <button className={`round light${rec ? ' rec' : ''}`} aria-label="음성으로 말하기" onClick={listen}><I.mic size={20} /></button>
        <textarea value={text} rows={1} maxLength={500} placeholder="편하게 말해 주세요" aria-label="메시지" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
        <button className="round" aria-label="보내기" disabled={busy || !text.trim()} onClick={() => send()}><I.send size={20} /></button>
      </div>
      {Sheets}
    </div>
  );

  // 음성 상담(시안 6)
  return (
    <div className="friend-stage">
      <div className="night-top">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><I.back /></button>
        <span className="small" style={{ opacity: 0.85 }}>AI 사주친구 · 달새김</span>
        <button className="icon-btn" aria-label="새 대화" onClick={newChat}><I.edit /></button>
      </div>
      {lastUser && busy && <div className="f-bubble me" style={{ marginTop: 'auto' }}>{lastUser.text}</div>}
      <div className="f-bubble" style={lastUser && busy ? { marginTop: 10 } : undefined} aria-live="polite">
        {busy ? <span className="typing" aria-label="생각 중"><i /><i /><i /></span> : lastFriend?.text ?? greet}
      </div>

      <section className="voice" aria-label="음성 상담">
        {lastFriend && !rec ? (
          <div className="player">
            <button className="play" aria-label={talk.on ? '멈추기' : '다시 듣기'} onClick={() => (talk.on ? (speechSynthesis.cancel(), setTalk((x) => ({ ...x, on: false }))) : speak(lastFriend.text))}>
              {talk.on ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>}
            </button>
            <div style={{ flex: 1 }}>
              <div className="bar"><i style={{ width: `${talk.total ? (talk.t / talk.total) * 100 : 0}%`, transition: 'width .25s linear' }} /></div>
              <div className="between faint" style={{ fontSize: 12, marginTop: 4 }}><span>{mmss(talk.t)}</span><span>{mmss(talk.total || lastFriend.text.length * 0.14)}</span></div>
            </div>
            <button className="speed" onClick={() => { const r = rate === 1 ? 1.2 : rate === 1.2 ? 0.9 : 1; setRate(r); if (talk.on) speak(lastFriend.text, r); }}>{rate.toFixed(1)}x</button>
          </div>
        ) : (
          <div className="row" style={{ gap: 14 }}>
            <button className={`mic${rec ? ' rec' : ''}`} aria-label={rec ? '듣는 중' : '눌러서 말하기'} onClick={listen} disabled={busy}><I.mic size={28} /></button>
            <div style={{ flex: 1 }}>
              <div className={`wave${rec ? ' on' : ''}`} aria-hidden>{Array.from({ length: 22 }, (_, i) => <i key={i} />)}</div>
              <div className="faint" style={{ fontSize: 13 }}>{rec ? `듣고 있어요 · ${mmss(recSec)}` : busy ? '달새김이 생각하고 있어요' : '마이크를 누르고 편하게 말해 주세요'}</div>
            </div>
          </div>
        )}
        {lastFriend && !rec && (
          <div className="row mt12" style={{ gap: 10 }}>
            <button className="mic" style={{ width: 52, height: 52 }} aria-label="이어서 말하기" onClick={listen} disabled={busy}><I.mic size={24} /></button>
            <span className="faint" style={{ fontSize: 13 }}>눌러서 이어서 말하기</span>
          </div>
        )}
        {msgs.length === 0 && !rec && <div className="chips mt12">{STARTERS.slice(0, 3).map((s) => <button key={s} className="chip sm" onClick={() => send(s)}>{s}</button>)}</div>}
        <div className="f-actions">
          <button className="pill" style={{ flex: 1 }} onClick={() => setMode('text')}><I.chat size={18} />텍스트로 상담하기</button>
          <button className="hang" aria-label="상담 마치기" onClick={hangUp}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path d="M3 14.5c4.8-4.4 13.2-4.4 18 0l-2.3 2.6-3.4-1.6v-2.6a12 12 0 0 0-6.6 0v2.6l-3.4 1.6z" fill="currentColor" /></svg></button>
        </div>
        {remaining != null && <p className="notice" style={{ margin: '10px 0 0' }}>오늘 무료 대화 {remaining}번 남았어요</p>}
      </section>

      <div className="f-foot">
        <button onClick={() => setSheet('log')}><I.book size={20} />대화 내용 보기</button>
        <button onClick={() => setSheet('save')}><I.download size={20} />{draft?.state === 'saved' ? '저장했어요' : '저장하기'}</button>
      </div>
      {Sheets}
    </div>
  );
}
