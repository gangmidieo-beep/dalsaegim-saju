// AI 사주친구 — 텍스트 대화(음성 입력·음성으로 듣기는 선택). 답할 때마다 "오늘의 새김" 요약 → [저장][수정][남기지 않기].
// 캐릭터는 이 화면에서만 쓴다(다른 화면 과노출 지양). 이미지가 오기 전까지는 달 아바타.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp, useMain } from '../store/app';
import { apiAuth, syncProfile } from '../lib/api';
import { MemoryCard, Moon, Sheet, Top, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import brand from '../../../brand.config.json';

type Msg = { role: 'user' | 'friend'; text: string; at?: string };
type Draft = { category: string; title: string; summary: string; sajuNote?: string };
const STARTERS = ['요즘 연애가 고민이에요', '이직해도 괜찮을까요?', '올해 돈 흐름이 궁금해요', '요즘 너무 지쳐요'];
const CHAR_IMG = '/img/friend.webp'; // 대표님 캐릭터 이미지(실사 70~80% + AI 감성) 들어오면 이 파일만 교체

export default function Friend() {
  const [sp] = useSearchParams();
  const { profile, isSample } = useMain();
  const { friendChatId, setFriendChat, setPass } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [text, setText] = useState(sp.get('q') ?? '');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ d: Draft; at: number; state: 'open' | 'saved' } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(false);
  const [voice, setVoice] = useState(false);
  const [rec, setRec] = useState(false);
  const [img, setImg] = useState(true);
  const end = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const topic = sp.get('topic');
  const pass = brand.products.find((p) => p.id === 'friend_pass')!;

  useEffect(() => {
    if (isSample) return;
    apiAuth<{ remaining: number | null; pass: boolean }>('/friend/status').then((s) => { setRemaining(s.remaining); setPass(s.pass); }).catch(() => {});
    if (friendChatId && !sp.get('q')) apiAuth<{ id: string; messages: Msg[] }>(`/friend/chats/${friendChatId}`).then((c) => { setChatId(c.id); setMsgs(c.messages); }).catch(() => setFriendChat(null));
  }, [isSample]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, busy, draft]);

  const speak = (t: string) => {
    if (!voice || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'ko-KR'; u.rate = 1.02;
    const ko = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko') && /female|yuna|heami|sun/i.test(v.name)) ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'));
    if (ko) u.voice = ko;
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
      setDraft({ d: r.draft, at: msgs.length + 2, state: 'open' });
      speak(r.reply);
      track('friend_send', { topic: r.draft.category });
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
    if (!SR) { toast('이 브라우저에서는 음성 입력이 어려워요. 글로 적어 주세요'); return; }
    const r = new SR();
    r.lang = 'ko-KR'; r.interimResults = false;
    r.onresult = (e: any) => setText((x) => `${x} ${e.results[0][0].transcript}`.trim());
    r.onend = () => setRec(false);
    setRec(true); r.start();
  };
  const newChat = () => { setChatId(null); setFriendChat(null); setMsgs([]); setDraft(null); };

  if (isSample) return (
    <>
      <Top title="AI 사주친구" />
      <main className="screen center">
        <div style={{ display: 'grid', placeItems: 'center' }}><Moon size={120} /></div>
        <h2 className="h2 mt12">내 사주를 아는 친구, 달새김</h2>
        <p className="muted mt8 small">사주를 쉽게 풀어 주고, 지금 상황과 연결해 이야기해요.<br />먼저 생년월일을 알려 주세요.</p>
        <Link to="/profile/new?next=/friend" className="btn primary mt20">사주 입력하고 대화하기</Link>
      </main>
    </>
  );

  return (
    <div className="no-tab" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Top title="AI 사주친구" right={<button className="icon-btn" aria-label="새 대화" onClick={newChat}><I.edit /></button>} />
      <div className="row" style={{ padding: '4px 16px 0', gap: 12 }}>
        <div className="avatar">{img ? <img src={CHAR_IMG} alt="" onError={() => setImg(false)} /> : <Moon size={52} glow={false} />}</div>
        <div style={{ flex: 1 }}>
          <b>달새김</b><div className="faint">{profile.name} 님의 사주와 기록을 알고 있어요</div>
        </div>
        <div className="seg" style={{ width: 128, padding: 3 }}>
          <button className={!voice ? 'on' : ''} style={{ minHeight: 32, fontSize: 13 }} onClick={() => { setVoice(false); speechSynthesis?.cancel?.(); }}>글</button>
          <button className={voice ? 'on' : ''} style={{ minHeight: 32, fontSize: 13 }} onClick={() => setVoice(true)} aria-label="음성으로 듣기"><I.speaker size={16} /></button>
        </div>
      </div>
      <div className="chat" style={{ flex: 1 }}>
        {msgs.length === 0 && (
          <div className="fade-in">
            <div className="bubble friend">{profile.name} 님, 반가워요. 저는 달새김이에요.{'\n'}오늘은 어떤 이야기를 나눠 볼까요? 사주로 보면 지금의 흐름도 같이 짚어 드릴게요.</div>
            <div className="chips mt12">{STARTERS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className={`bubble ${m.role === 'user' ? 'me' : 'friend'}`}>{m.text}</div>
            {draft && draft.at === i + 1 && (
              <MemoryCard draft={draft.d} saved={draft.state === 'saved'} onSave={saveMemory} onSkip={() => { setDraft(null); track('memory_skip', { kind: 'consult' }); }} />
            )}
          </div>
        ))}
        {busy && <div className="bubble friend"><span className="typing" aria-label="생각 중"><i /><i /><i /></span></div>}
        <div ref={end} />
      </div>
      {remaining != null && <p className="notice" style={{ margin: '0 0 4px' }}>오늘 무료 대화 {remaining}번 남았어요</p>}
      <div className="composer">
        <button className={`round light${rec ? ' rec' : ''}`} aria-label="음성으로 말하기" onClick={listen}><I.mic size={20} /></button>
        <textarea value={text} rows={1} maxLength={500} placeholder="편하게 말해 주세요" aria-label="메시지" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
        <button className="round" aria-label="보내기" disabled={busy || !text.trim()} onClick={() => send()}><I.send size={20} /></button>
      </div>
      <Sheet open={limit} onClose={() => setLimit(false)} label="이용권 안내">
        <h2 className="h2">오늘의 무료 대화를 모두 썼어요</h2>
        <p className="muted small mt8">무료 대화는 하루 {brand.friend.freePerDay}번이에요. 내일 다시 이어서 이야기하거나, 이용권으로 제한 없이 대화할 수 있어요.</p>
        <div className="card gold mt16"><b>{pass.title}</b><div className="small muted">{pass.cardCopy}</div><div className="mt8 hl-gold">{won(pass.price)}</div></div>
        <Link to="/checkout/friend_pass" className="btn primary mt16">이용권으로 계속 대화하기</Link>
        <button className="btn line mt8" onClick={() => setLimit(false)}>내일 다시 올게요</button>
      </Sheet>
    </div>
  );
}
