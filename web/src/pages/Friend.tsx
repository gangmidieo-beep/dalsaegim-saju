// AI 사주친구 — ① 상담사(페르소나) 고르기 ② 첫 화면: 상담사 사진 + 인사 + 말로/글로 시작 ③ 상담이 시작되면 사진은 작게, 대화창을 크게.
// 답할 때마다 "오늘의 새김" 요약 → [저장][수정][남기지 않기]. 대화는 서버에 남아 화면을 나갔다 와도 이어진다.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FRIEND_TOPICS, PERSONAS, personaOf } from '@dalsaegim/content';
import { useApp, useMain } from '../store/app';
import { apiAuth, syncProfile } from '../lib/api';
import { MemoryCard, Sheet, Top, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { speak as voiceSpeak, stopVoice } from '../lib/voice';
import brand from '../../../brand.config.json';

type Msg = { role: 'user' | 'friend'; text: string; at?: string };
type Draft = { category: string; title: string; summary: string; sajuNote?: string };
const josa = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? '과' : '와');
const STARTERS = ['그 사람 마음이 궁금해요', '헤어진 사람과 다시 만날 수 있을까요?', '언제쯤 좋은 인연이 올까요?', '요즘 일이 너무 지쳐요'];

export default function Friend() {
  const [sp, setSp] = useSearchParams();
  const { profile, isSample } = useMain();
  const { friendChatId, setFriendChat, setPass, persona, setPersona } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatPersona, setChatPersona] = useState<string | null>(null);
  const [text, setText] = useState(sp.get('q') ?? '');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ d: Draft; state: 'open' | 'saved' | 'skip' } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [left, setLeft] = useState<{ free: number; credits: number | null } | null>(null);
  const leftText = left ? (left.credits != null && left.credits > 0 ? `오늘 무료 ${left.free}번 · 이용권 질문 ${left.credits}번 남았어요` : `오늘 무료 상담 ${left.free}번 남았어요`) : remaining != null ? `오늘 무료 상담 ${remaining}번 남았어요` : '';
  const [limit, setLimit] = useState(false);
  const [rec, setRec] = useState(false);
  const [read, setRead] = useState(false); // 답을 소리로 읽어 주기
  const [typing, setTyping] = useState(!!sp.get('q'));
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const nav = useNavigate();
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const topic = sp.get('topic') ?? pendingTopic;
  const pass = brand.products.find((p) => p.id === 'friend_pass')!;
  const picking = !persona || sp.get('pick') === '1';
  const pe = personaOf(chatPersona ?? persona);

  useEffect(() => {
    if (isSample) return;
    apiAuth<{ remaining: number | null; pass: boolean; free: number; credits: number | null }>('/friend/status').then((s) => { setRemaining(s.remaining); setPass(s.pass); setLeft({ free: s.free, credits: s.credits }); }).catch(() => {});
    if (friendChatId && !sp.get('q')) apiAuth<{ id: string; persona: string | null; messages: Msg[] }>(`/friend/chats/${friendChatId}`).then((c) => { setChatId(c.id); setMsgs(c.messages); setChatPersona(c.persona); }).catch(() => setFriendChat(null));
    return () => { stopVoice(); };
  }, [isSample]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, busy, draft?.state]);
  useEffect(() => { if (typing) input.current?.focus(); }, [typing]);

  // 상담사 성별대로 읽기(자연 음성이 켜져 있으면 그것으로)
  const speak = (t: string, g: 'F' | 'M' = pe.gender) => { void voiceSpeak(t, g, { rate: 1.02 }); };
  const send = async (raw?: string, viaVoice = false, opt: { persona?: string; topic?: string } = {}) => {
    const t = (raw ?? text).trim();
    if (!t || busy) return;
    setText('');
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setBusy(true);
    try {
      await syncProfile(profile, true);
      const r = await apiAuth<{ chatId: string; reply: string; draft: Draft; remaining: number | null; pass: boolean; free: number; credits: number | null }>('/friend/chat', { method: 'POST', json: { chatId, profileId: profile.id, text: t, topic: opt.topic ?? topic, persona: opt.persona ?? pe.id, source: sp.get('q') ? 'path' : 'home' } });
      // 상담사를 고르자마자 첫 질문을 보내는 경우, 이 시점의 pe 는 이전 상담사라 고른 id 를 쓴다
      const used = personaOf(opt.persona ?? pe.id);
      setChatId(r.chatId); setFriendChat(r.chatId); setChatPersona(used.id);
      setMsgs((m) => [...m, { role: 'friend', text: r.reply }]);
      setRemaining(r.remaining); setPass(r.pass); setLeft({ free: r.free, credits: r.credits });
      setDraft({ d: r.draft, state: 'open' });
      if (read || viaVoice) speak(r.reply, used.gender);
      track('friend_send', { topic: r.draft.category, persona: used.id, voice: viaVoice });
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
    if (!SR) { toast('이 브라우저에서는 음성 입력이 어려워요. 글로 적어 주세요'); setTyping(true); return; }
    stopVoice();
    const r = new SR();
    r.lang = 'ko-KR'; r.interimResults = false;
    r.onresult = (e: any) => { setRead(true); void send(e.results[0][0].transcript, true); };
    r.onerror = () => setRec(false);
    r.onend = () => setRec(false);
    setRec(true); r.start();
  };
  const newChat = () => { setChatId(null); setFriendChat(null); setChatPersona(null); setMsgs([]); setDraft(null); setTyping(false); stopVoice(); };
  const choose = (id: string) => {
    setPersona(id);
    if (chatPersona && chatPersona !== id) newChat();
    track('persona_pick', { id });
    if (isSample) { nav('/profile/new?next=/friend'); return; }
    setSp({});
  };

  const sheets = (
    <Sheet open={limit} onClose={() => setLimit(false)} label="이용권 안내">
      <h2 className="h2">오늘의 무료 상담을 모두 썼어요</h2>
      <p className="muted mt8">무료 상담은 하루 {brand.friend.freePerDay}번이에요. 내일 다시 이어서 이야기하거나, 이용권으로 질문 {(pass as any).questions ?? 10}번을 더 할 수 있어요({(pass as any).days ?? 90}일 동안).</p>
      <div className="card gold mt16"><b>{pass.title}</b><div className="small muted">{pass.cardCopy}</div><div className="mt8 hl-gold" style={{ fontSize: 20 }}>{won(pass.price)}</div></div>
      <Link to="/checkout/friend_pass" className="btn primary mt16">이용권으로 계속 상담하기</Link>
      <button className="btn line mt8" onClick={() => setLimit(false)}>내일 다시 올게요</button>
    </Sheet>
  );

  // ① 상담사 고르기(접수)
  if (picking) return <PersonaPick current={persona} onPick={(id, q, t) => { choose(id); if (q && !isSample) { setPendingTopic(t ?? null); void send(q, false, { persona: id, topic: t }); } }} />;

  // ② 첫 화면 — 상담사 사진 크게
  if (msgs.length === 0 && !typing) return (
    <div className="friend-stage v2">
      <div className="night-top">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><I.back /></button>
        <button className="persona-chip" onClick={() => setSp({ pick: '1' })}>{pe.name} · {pe.title} <I.right size={14} /></button>
        <span style={{ width: 40 }} />
      </div>
      <figure className="fs-photo"><img src={pe.img} alt={`${pe.name} 상담사`} /><figcaption><b>{pe.name}</b><span>{pe.who}</span></figcaption></figure>
      <div className="f-bubble">{pe.greet.replace('{name}', profile.name)}</div>
      <section className="voice" aria-label="상담 시작">
        <div className="row" style={{ gap: 14 }}>
          <button className={`mic${rec ? ' rec' : ''}`} aria-label={rec ? '듣는 중' : '말로 상담하기'} onClick={listen} disabled={busy}><I.mic size={28} /></button>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 17 }}>{rec ? '듣고 있어요…' : '말로 상담하기'}</b>
            <div className="muted" style={{ fontSize: 14.5 }}>{rec ? '편하게 말씀해 주세요' : '마이크를 누르고 말하면 답을 읽어 드려요'}</div>
          </div>
        </div>
        <button className="pill mt12" style={{ width: '100%' }} onClick={() => setTyping(true)}><I.chat size={18} />글로 상담하기</button>
        <div className="chips mt12">{STARTERS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
        {leftText && <p className="notice" style={{ margin: '10px 0 0' }}>{leftText}</p>}
      </section>
      <div style={{ height: 'calc(16px + var(--safe-b))' }} />
      {sheets}
    </div>
  );

  // ③ 상담 중 — 사진은 작게, 대화창은 크게
  return (
    <div className="no-tab chat-page">
      <header className="chat-head">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><I.back /></button>
        <button className="row" style={{ flex: 1, gap: 10, textAlign: 'left' }} onClick={() => setSp({ pick: '1' })} aria-label="상담사 바꾸기">
          <img className="p-avatar" src={pe.img} alt="" />
          <span style={{ lineHeight: 1.3 }}><b style={{ fontSize: 16.5 }}>{pe.name}</b><span className="faint" style={{ display: 'block', fontSize: 13 }}>{pe.title} · {profile.name} 님의 사주를 알고 있어요</span></span>
        </button>
        <button className={`icon-btn${read ? ' on' : ''}`} aria-label={read ? '읽어 주기 끄기' : '답을 소리로 읽어 주기'} aria-pressed={read} onClick={() => { setRead(!read); if (read) stopVoice(); }}><I.speaker /></button>
        <button className="icon-btn" aria-label="새 상담" onClick={newChat}><I.edit /></button>
      </header>
      <div className="chat big">
        {msgs.length === 0 && (
          <div className="fade-in">
            <div className="bubble friend">{pe.greet.replace('{name}', profile.name)}</div>
            <div className="chips mt12">{STARTERS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'friend' && <img className="p-avatar s" src={pe.img} alt="" />}
            <div className={`bubble ${m.role === 'user' ? 'me' : 'friend'}`}>{m.text}</div>
            {m.role === 'friend' && i === msgs.length - 1 && !busy && <button className="relisten" onClick={() => speak(m.text)}><I.speaker size={15} />다시 듣기</button>}
          </div>
        ))}
        {busy && <div className="msg friend"><img className="p-avatar s" src={pe.img} alt="" /><div className="bubble friend"><span className="typing" aria-label="생각 중"><i /><i /><i /></span></div></div>}
        {!busy && draft && draft.state !== 'skip' && (
          <MemoryCard draft={draft.d} saved={draft.state === 'saved'} onSave={saveMemory} onSkip={() => { setDraft((x) => (x ? { ...x, state: 'skip' } : x)); track('memory_skip', { kind: 'consult' }); }} />
        )}
        <div ref={end} />
      </div>
      {leftText && <p className="notice" style={{ margin: '0 0 4px' }}>{leftText}</p>}
      <div className="composer">
        <button className={`round light${rec ? ' rec' : ''}`} aria-label="말로 하기" onClick={listen}><I.mic size={22} /></button>
        <textarea ref={input} value={text} rows={1} maxLength={500} placeholder={`${pe.name}에게 편하게 말해 주세요`} aria-label="메시지" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
        <button className="round" aria-label="보내기" disabled={busy || !text.trim()} onClick={() => send()}><I.send size={20} /></button>
      </div>
      {sheets}
    </div>
  );
}

// 상담사 고르기 — 리뉴얼 시안(v29): 상담사 6명 카드 + 상담 주제 24가지 + 오늘의 고민
function PersonaPick({ current, onPick }: { current: string | null; onPick: (id: string, q?: string, topic?: string) => void }) {
  const [sel, setSel] = useState(personaOf(current ?? PERSONAS[0].id).id);
  const [topic, setTopic] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const p = personaOf(sel);
  const start = () => onPick(sel, q.trim() || (topic ? `${topic} 고민을 이야기하고 싶어요` : undefined), topic ?? undefined);
  return (
    <>
      <Top title="AI 사주친구" />
      <main className="screen pk">
        <small className="pd-eye dark">DALSAEGIM · MOONLIGHT COUNSEL</small>
        <h2 className="pk-title">나에게 맞는 사주 상담사</h2>
        <p className="h-sub">지금 내 마음에 맞는 상담 스타일을 고르세요. 같은 사주를 보고도 말하는 방식이 달라요.</p>
        <div className="pk-grid mt16" role="radiogroup" aria-label="상담사">
          {PERSONAS.map((x) => (
            <button key={x.id} role="radio" aria-checked={sel === x.id} className={`pk-card${sel === x.id ? ' on' : ''}`} onClick={() => setSel(x.id)}>
              <span className="pk-img"><img src={x.img} alt="" loading="lazy" />{x.tag && <em>{x.tag}</em>}</span>
              <span className="pk-body"><b>{x.name}</b><small className="t">{x.title}</small><small>{x.who}</small></span>
            </button>
          ))}
        </div>
        <section className="pk-greet mt16" aria-live="polite">
          <b>{p.name}의 첫인사</b>
          <p>“{p.quote}”</p>
        </section>
        <section className="mt24" aria-labelledby="pk-topic">
          <div className="between"><h3 className="h3" id="pk-topic">상담 주제 선택</h3><span className="faint">{FRIEND_TOPICS.length}가지 관심사</span></div>
          <p className="faint mt4">연애부터 사업·재물·가족까지, 지금 가장 마음에 걸리는 주제를 골라 주세요.</p>
          <div className="pk-topics mt12">{FRIEND_TOPICS.map((t) => <button key={t} aria-pressed={topic === t} className={topic === t ? 'on' : ''} onClick={() => setTopic(topic === t ? null : t)}>{t}</button>)}</div>
        </section>
        <label className="field mt20"><span>오늘의 고민 <small className="faint">(선택)</small></span>
          <textarea className="input" rows={3} maxLength={500} value={q} placeholder={topic ? `${topic}에 관해 지금 상황과 가장 궁금한 점을 적어 주세요` : '지금 상황과 가장 궁금한 점을 편하게 적어 주세요'} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn primary mt16" onClick={start}>{p.name}{josa(p.name)} 상담 시작하기 →</button>
        <p className="notice mt12">상담사는 AI 캐릭터예요. 실제 사주 계산을 바탕으로 이야기하며, ‘연화 할매’도 신내림이나 점괘를 주장하지 않아요.</p>
        <Link to="/product/friend_pass" className="link center mt8" style={{ display: 'block' }}>AI 사주친구 이용권 살펴보기 →</Link>
      </main>
    </>
  );
}
