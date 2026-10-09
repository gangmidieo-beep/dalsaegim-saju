// 달빛 편지 & 나의 달빛 우체통 — ① 오늘의 달빛 편지(누구나) ② AI 맞춤 편지(상담사·감정·고민 → 봉투가 열리며 편지 → 상담사 목소리로 듣기)
// ③ 우체통(본인만, 다시 읽기·듣기·삭제) ④ 카카오톡 도착 안내 수신 동의(따로 신청한 고객만, 언제든 철회).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LETTER_FEELINGS, LETTER_TOPICS, PERSONAS, personaOf } from '@dalsaegim/content';
import { useApp, useMain } from '../store/app';
import { apiAuth, apiGet, syncProfile } from '../lib/api';
import { Sheet, Skeleton, Top, useToast } from '../components/ui';
import { I } from '../components/icons';
import { CharmList } from './Charm';
import { track } from '../lib/track';

export type Letter = { id: string; persona: string; feeling: string; topic: string | null; title: string; body: string; createdAt: string; to?: string; from?: string };
type Today = { date: string; theme: string; title: string; body: string };
// 받침 있으면 '이', 없으면 '가' (사주도령이 / 달하가)
const withJosa = (n: string) => { const c = n.charCodeAt(n.length - 1) - 0xac00; return n + (c >= 0 && c < 11172 && c % 28 ? '이' : '가'); };
const dot = (s: string) => s.slice(0, 10).replace(/-/g, '.');

// 상담사 목소리로 읽기 — 여성 상담사는 부드러운 여성 음성, 남성 상담사는 낮은 남성 음성(없으면 음높이를 낮춤)
export function useReader(personaId: string) {
  const [state, setState] = useState<'idle' | 'play' | 'pause'>('idle');
  const pe = personaOf(personaId);
  useEffect(() => () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); }, []);
  const play = (text: string) => {
    if (!('speechSynthesis' in window)) return false;
    if (state === 'pause') { speechSynthesis.resume(); setState('play'); return true; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ko'));
    const male = pe.gender === 'M';
    const v = vs.find((x) => (male ? /male|injoon|minsu|남/i : /female|yuna|heami|sun|여/i).test(x.name) && !(male && /female/i.test(x.name))) ?? vs[0];
    if (v) u.voice = v;
    u.rate = 0.92;
    u.pitch = male && !(v && /male|injoon|minsu|남/i.test(v.name) && !/female/i.test(v.name)) ? 0.72 : 1.02;
    u.onend = () => setState('idle');
    setState('play');
    speechSynthesis.speak(u);
    return true;
  };
  const pause = () => { speechSynthesis.pause(); setState('pause'); };
  const replay = (text: string) => { speechSynthesis.cancel(); setState('idle'); setTimeout(() => play(text), 60); };
  return { state, play, pause, replay };
}

export function LetterView({ l, name, onDelete }: { l: Letter; name: string; onDelete?: () => void }) {
  const pe = personaOf(l.persona);
  const r = useReader(l.persona);
  const toast = useToast();
  const text = `${name}님께. ${l.body}`;
  return (
    <section className="letter-view fade-in">
      <div className={`lv-portrait${r.state === 'play' ? ' on' : ''}`} style={{ backgroundImage: `url(${pe.img})` }}>
        <span className="lv-glow" />
        <span className="lv-who">{pe.name} · {pe.title}</span>
      </div>
      <article className="paper">
        <p className="to">{l.to ?? `TO. ${name} 고객님`}</p>
        <h2>{l.title}</h2>
        {l.body.split('\n').map((x, i) => <p key={i}>{x}</p>)}
        <p className="from">{l.from ?? `FROM. ${pe.sign}`}</p>
        <p className="date">{dot(l.createdAt)} · 달새김사주</p>
      </article>
      <div className="lv-ctrl">
        {r.state === 'play'
          ? <button className="btn primary" onClick={r.pause}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" /></svg>잠시 멈추기</button>
          : <button className="btn blush" onClick={() => { track('letter_listen', { persona: l.persona }); if (!r.play(text)) toast('이 브라우저에서는 소리로 들을 수 없어요. 글로 읽어 주세요'); }}><I.speaker size={20} />{r.state === 'pause' ? '이어서 듣기' : '편지 들어보기'}</button>}
        <button className="btn line sm" onClick={() => r.replay(text)}>처음부터 다시 듣기</button>
      </div>
      <p className="notice">자동으로 재생되지 않아요. 소리 없이 글로만 읽으셔도 돼요.</p>
      {onDelete && <button className="link mt12 center" style={{ display: 'block', width: '100%', color: '#9a9cb0' }} onClick={onDelete}>이 편지 지우기</button>}
    </section>
  );
}

// ① 오늘의 달빛 편지
export function TodayLetter() {
  const [t, setT] = useState<Today | null>(null);
  useEffect(() => { apiGet<Today>('/letters/today').then(setT).catch(() => {}); }, []);
  return (
    <>
      <Top title="오늘의 달빛 편지" />
      <main className="screen letter-bg">
        {!t ? <Skeleton h={300} /> : (
          <article className="paper today fade-in">
            <p className="to">{t.date.replace(/-/g, '.')} · {t.theme}</p>
            <h2>{t.title}</h2>
            <p>{t.body}</p>
            <p className="from">FROM. 달새김사주, 달빛 편지</p>
          </article>
        )}
        <section className="card mt16 center">
          <h3 className="h3">나에게만 쓰는 편지를 받아 볼까요?</h3>
          <p className="muted mt8">고른 상담사가 지금 마음과 고민을 읽고, 이름을 불러 주며 편지를 써요. 목소리로도 들을 수 있어요.</p>
          <Link to="/letter/new" className="btn blush mt12">나만의 달빛 편지 받기 →</Link>
          <Link to="/mailbox" className="link mt12" style={{ display: 'inline-block' }}>나의 달빛 우체통 열기</Link>
        </section>
      </main>
    </>
  );
}

// ② AI 맞춤 편지 신청
export function NewLetter() {
  const { profile, isSample } = useMain();
  const persona = useApp((s) => s.persona);
  const nav = useNavigate();
  const toast = useToast();
  const [g, setG] = useState<'F' | 'M'>(personaOf(persona).gender);
  const [pid, setPid] = useState(personaOf(persona).id);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'form' | 'open' | 'done'>('form');
  const [letter, setLetter] = useState<Letter | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!isSample) apiAuth<{ remaining: number | null }>('/letters/status').then((s) => setLeft(s.remaining)).catch(() => {}); }, [isSample]);
  const list = PERSONAS.filter((p) => p.gender === g);
  const submit = async () => {
    if (isSample) { nav('/profile/new?next=/letter/new'); return; }
    setPhase('open');
    const started = Date.now();
    try {
      await syncProfile(profile, true);
      const l = await apiAuth<Letter>('/letters', { method: 'POST', json: { profileId: profile.id, persona: pid, feeling, topic, input } });
      await new Promise((r) => setTimeout(r, Math.max(0, 1700 - (Date.now() - started)))); // 봉투가 열리는 1~2초
      track('letter_make', { persona: pid, feeling, topic });
      setLetter(l); setPhase('done'); scrollTo({ top: 0 });
    } catch (e: any) { setPhase('form'); toast(e.message); }
  };
  if (phase === 'open') return (
    <main className="envelope-stage" aria-live="polite">
      <div className="env"><div className="env-flap" /><div className="env-paper" /><div className="env-seal" /></div>
      <p>{withJosa(personaOf(pid).name)} {profile.name}님께 편지를 쓰고 있어요…</p>
    </main>
  );
  if (phase === 'done' && letter) return (
    <>
      <Top title="달빛 편지가 도착했어요" back="/letter" />
      <main className="screen letter-bg">
        <LetterView l={letter} name={profile.name} />
        <p className="saved-note">✓ 나의 달빛 우체통에 저장했어요</p>
        <div className="grid2 mt12"><Link to="/mailbox" className="btn line sm" style={{ width: '100%' }}>우체통 열기</Link><button className="btn line sm" style={{ width: '100%' }} onClick={() => { setPhase('form'); setLetter(null); }}>다른 편지 받기</button></div>
      </main>
    </>
  );
  return (
    <>
      <Top title="나만의 달빛 편지" />
      <main className="screen letter-bg" ref={top}>
        <h2 className="h2">지금 마음을 들려주면,<br />편지로 답해 드릴게요</h2>
        <section className="qblock">
          <h3>1. 편지를 써 줄 상담사</h3>
          <div className="seg" style={{ maxWidth: 240 }}>{([['F', '여성 상담사'], ['M', '남성 상담사']] as const).map(([k, l]) => <button key={k} className={g === k ? 'on' : ''} onClick={() => { setG(k); setPid(PERSONAS.find((p) => p.gender === k)!.id); }}>{l}</button>)}</div>
          <div className="pchoose mt12">
            {list.map((p) => (
              <button key={p.id} className={pid === p.id ? 'on' : ''} onClick={() => setPid(p.id)} aria-pressed={pid === p.id}>
                <img src={p.img} alt="" /><b>{p.name}</b><small>{p.title}</small>
              </button>
            ))}
          </div>
        </section>
        <section className="qblock">
          <h3>2. 지금 나의 마음은?</h3>
          <div className="qchips">{LETTER_FEELINGS.map((f) => <button key={f.id} className={feeling === f.id ? 'on' : ''} onClick={() => setFeeling(f.id)}>{f.label}</button>)}</div>
        </section>
        <section className="qblock">
          <h3>3. 어떤 고민인가요? <span className="faint">(선택)</span></h3>
          <div className="qchips">{LETTER_TOPICS.map((t) => <button key={t.id} className={topic === t.id ? 'on' : ''} onClick={() => setTopic(topic === t.id ? null : t.id)}>{t.label}</button>)}</div>
          <input className="input mt12" maxLength={60} value={input} onChange={(e) => setInput(e.target.value)} placeholder="한 줄로 적어도 좋아요 (예: 연락이 기다려져요)" />
        </section>
        <button className="btn blush mt24" disabled={!feeling} onClick={submit}>{isSample ? '사주 입력하고 편지 받기 →' : '달빛 편지 받기 →'}</button>
        {left != null && <p className="notice mt8">오늘 받을 수 있는 편지 {left}통 남았어요</p>}
        <p className="notice mt4">편지는 나만 볼 수 있는 우체통에 보관되고, 언제든 지울 수 있어요.</p>
      </main>
    </>
  );
}

// ③ 나의 달빛 우체통
export function Mailbox() {
  const { profile, isSample } = useMain();
  const account = useApp((s) => s.account);
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<'letter' | 'charm'>('letter');
  const [list, setList] = useState<Letter[] | null>(null);
  const [notify, setNotify] = useState(false);
  const [ask, setAsk] = useState(false);
  const load = () => apiAuth<Letter[]>('/letters').then(setList).catch(() => setList([]));
  useEffect(() => {
    if (isSample) { setList([]); return; }
    void load();
    apiAuth<{ notify: boolean }>('/letters/status').then((s) => setNotify(s.notify)).catch(() => {});
  }, [isSample]);
  const open = list?.find((x) => x.id === id);
  const del = async (lid: string) => {
    try { await apiAuth(`/letters/${lid}`, { method: 'DELETE' }); toast('편지를 지웠어요'); nav('/mailbox', { replace: true }); void load(); } catch (e: any) { toast(e.message); }
  };
  const setN = async (on: boolean) => {
    try { await apiAuth('/letters/notify', { method: 'POST', json: { on } }); setNotify(on); setAsk(false); toast(on ? '카카오톡 안내를 신청했어요' : '카카오톡 안내를 그만 받아요'); } catch (e: any) { toast(e.message); }
  };
  if (id && open) return (
    <>
      <Top title="나의 달빛 우체통" back="/mailbox" />
      <main className="screen letter-bg"><LetterView l={open} name={profile.name} onDelete={() => del(open.id)} /></main>
    </>
  );
  return (
    <>
      <Top title="나의 달빛 우체통" />
      <main className="screen letter-bg">
        <section className="mailbox-head">
          <img src="/img/ui/letter-env.webp" alt="" />
          <div><b>{isSample ? '나만의 우체통' : `${profile.name}님의 우체통`}</b><span>받은 편지와 부적이 차곡차곡 쌓여요. 나만 볼 수 있어요.</span></div>
        </section>
        <div className="tabs mt12" role="tablist">{([['letter', '달빛 편지'], ['charm', '황금 부적']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === 'charm' ? <CharmList /> : (
          <>
            {list === null && <div className="stack mt16"><Skeleton /><Skeleton /></div>}
            {list?.length === 0 && (
              <section className="card center mt16">
                <h3 className="h3">아직 받은 편지가 없어요</h3>
                <p className="muted mt8">지금 마음을 들려주면 상담사가 편지를 써 드려요.</p>
                <Link to="/letter/new" className="btn blush mt12">첫 달빛 편지 받기 →</Link>
              </section>
            )}
            <div className="stack mt16">
              {list?.map((l) => {
                const pe = personaOf(l.persona);
                return (
                  <Link key={l.id} to={`/mailbox/${l.id}`} className="mail-row">
                    <img src={pe.img} alt="" className="p-avatar s" />
                    <span className="grow"><small>{dot(l.createdAt)} · {pe.name}</small><b>{l.title}</b><span>{l.body.split('\n')[0]}</span></span>
                    <I.right className="chev" />
                  </Link>
                );
              })}
            </div>
            {list && list.length > 0 && <Link to="/letter/new" className="btn blush mt16">새 편지 받기 →</Link>}
          </>
        )}
        {!isSample && (
          <section className="card flat mt20">
            <div className="between"><b>카카오톡으로 편지 도착 알림</b><button className={`switch${notify ? ' on' : ''}`} role="switch" aria-checked={notify} onClick={() => (notify ? setN(false) : account ? setAsk(true) : (toast('카카오 로그인 후 신청할 수 있어요'), nav('/me')))}><i /></button></div>
            <p className="faint mt4" style={{ margin: '4px 0 0' }}>신청한 분께만 ‘달빛 편지가 도착했어요’ 한 줄만 보내요. 편지 내용이나 고민은 담지 않아요. 언제든 끌 수 있어요.</p>
            {!account && <p className="faint mt4" style={{ margin: '4px 0 0' }}>카카오 로그인을 하면 알림을 받을 수 있어요.</p>}
          </section>
        )}
      </main>
      <Sheet open={ask} onClose={() => setAsk(false)} label="카카오톡 알림 신청">
        <h2 className="h2">카카오톡 알림을 신청할까요?</h2>
        <p className="muted mt8">새 달빛 편지가 도착하면 카카오톡으로 “달빛 편지가 도착했어요” 안내를 보내 드려요. 편지 내용과 고민은 메시지에 담지 않고, 우체통에서만 열 수 있어요. 마이 또는 우체통에서 언제든 끌 수 있어요.</p>
        <button className="btn primary mt16" onClick={() => setN(true)}>동의하고 신청하기</button>
        <button className="btn line mt8" onClick={() => setAsk(false)}>다음에 할게요</button>
      </Sheet>
    </>
  );
}
