// 상품 상세 → 결제 → 결제 후 복귀 → 풀이. 회원가입 없이 결제 가능(기기 계정), 로그인하면 기록이 합쳐진다.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import detail from '@dalsaegim/content/data/detail.json';
import reading from '@dalsaegim/content/data/reading.json';
import { useApp, useMain } from '../store/app';
import { apiAuth } from '../lib/api';
import { METHODS, PENDING, isInAppBrowser, phoneOk, purchase, savePhone, savedPhone } from '../platform/payments';
import { Moon, Skeleton, Top, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { saveImage, shareLink, shortLink } from '../lib/share';
import brand from '../../../brand.config.json';

type Prod = (typeof brand.products)[number];
const findP = (id?: string) => brand.products.find((p) => p.id === id) as Prod | undefined;

export function ProductDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const p = findP(id);
  const d = (detail as Record<string, { sub: string; target: string[]; why: string }>)[id ?? ''];
  const ch = (reading.chapters as Record<string, string[]>)[id ?? ''];
  useEffect(() => { if (p) track('product_view', { product: p.id }); }, [p?.id]);
  if (!p || !p.visible) return <><Top title="풀이" /><main className="screen"><p>없는 상품이에요.</p><Link to="/" className="btn primary">홈으로</Link></main></>;
  const q = sp.toString();
  return (
    <>
      <Top title={p.title} />
      <main className="screen">
        <section className="card navy" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -14, top: -14, opacity: 0.7 }}><Moon size={110} /></div>
          {p.badge && <span className="badge">{p.badge}</span>}
          <h2 className="h1 mt8" style={{ fontSize: 24 }}>{p.title}</h2>
          <p className="mt8" style={{ color: '#d9d6ea', margin: '8px 0 0' }}>{d?.sub ?? p.cardCopy}</p>
          <div className="mt16 row" style={{ alignItems: 'baseline', gap: 8 }}>
            {p.listPrice && <span style={{ textDecoration: 'line-through', color: '#9a97b3' }}>{won(p.listPrice)}</span>}
            <b className="serif" style={{ fontSize: 26, color: '#F2DCCB' }}>{won(p.price)}</b>
          </div>
        </section>
        {d && (
          <>
            <section className="card mt16"><h3 className="h3">이런 분께 필요해요</h3>{d.target.map((t) => <p key={t} className="small" style={{ margin: '8px 0 0' }}>✓ {t}</p>)}</section>
            <section className="card flat mt12"><h3 className="h3">지금 봐야 하는 이유</h3><p className="small mt8" style={{ margin: '8px 0 0' }}>{d.why}</p></section>
          </>
        )}
        {ch && (
          <section className="card mt12">
            <h3 className="h3">담기는 내용 · {ch.length}장</h3>
            <ol className="small mt8" style={{ paddingLeft: 20, margin: '8px 0 0', lineHeight: 1.9 }}>{ch.map((c) => <li key={c}>{c}</li>)}</ol>
            <p className="faint mt8">무료로 본 지수·좋은 달과 같은 계산을 바탕으로, 내 사주에 맞춰 새로 써요.</p>
          </section>
        )}
        <p className="notice mt12">결제 후 바로 이 사이트에서 열려요 · 회원가입 없이 결제 가능 · 풀이는 마이 &gt; 구매한 풀이에서 다시 볼 수 있어요</p>
        <Link to={`/checkout/${p.id}${q ? `?${q}` : ''}`} className="btn primary mt16">{p.kind === 'pass' ? '이용권 시작하기' : '풀이 받기'} · {won(p.price)}</Link>
      </main>
    </>
  );
}

export function Checkout() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const p = findP(id);
  const { profiles, mainId } = useApp();
  const { profile, isSample } = useMain();
  const [pick, setPick] = useState<string[]>(isSample ? [] : [profile.id]);
  const [method, setMethod] = useState(isInAppBrowser() ? 'kakaopay' : 'card');
  const [phone, setPhone] = useState(savedPhone());
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();
  useEffect(() => { if (p) track('checkout_open', { product: p.id }); }, [p?.id]);
  if (!p) return null;
  const need = p.kind === 'pass' ? 0 : p.people;
  const toggle = (pid: string) => setPick((x) => (x.includes(pid) ? x.filter((y) => y !== pid) : need === 1 ? [pid] : [...x, pid].slice(-need)));
  const meta = Object.fromEntries(['cat', 'sub', 'q', 'mbti'].map((k) => [k, sp.get(k) ?? (k === 'mbti' ? profiles.find((x) => x.id === pick[0])?.mbti ?? '' : '')]).filter(([, v]) => v));
  const ready = pick.length >= need && agree && phoneOk(phone) && !(p.id === 'mbti_deep' && !meta.mbti);
  const pay = async () => {
    setBusy(true);
    savePhone(phone);
    track('pay_start', { product: p.id, method });
    const r = await purchase(p.id, need ? pick : [], { method, phone: phone.replace(/\D/g, ''), meta });
    setBusy(false);
    if (r.status === 'paid') { track('pay_success', { product: p.id }); nav(p.kind === 'pass' ? '/friend' : `/reading/${r.orderId}`, { replace: true }); }
    else if (r.status === 'failed') { track('pay_fail', { product: p.id, code: r.code }); toast(r.message ?? '결제를 시작하지 못했어요'); }
  };
  return (
    <>
      <Top title="결제하기" />
      <main className="screen">
        <section className="card between" style={{ display: 'flex' }}>
          <div><div className="faint">{p.kind === 'pass' ? '이용권' : '풀이'}</div><b>{p.title}</b></div>
          <b className="serif" style={{ fontSize: 22 }}>{won(p.price)}</b>
        </section>
        {need > 0 && (
          <section className="mt20">
            <div className="between"><h2 className="h3">{need > 1 ? '두 사람을 골라 주세요' : '누구의 사주로 볼까요?'}</h2><Link to={`/profile/new?next=${encodeURIComponent(location.pathname + location.search)}`} className="link">+ 사주 추가</Link></div>
            {profiles.length === 0 ? (
              <Link to={`/profile/new?next=${encodeURIComponent(location.pathname + location.search)}`} className="btn line mt12">사주 입력하기</Link>
            ) : (
              <div className="stack mt12">
                {profiles.map((x) => (
                  <button key={x.id} className={`opt${pick.includes(x.id) ? ' picked' : ''}`} style={{ padding: 14 }} onClick={() => toggle(x.id)}>
                    <b style={{ flex: 1, fontSize: 16 }}>{x.name} <span className="faint">· {x.relation ?? (x.id === mainId ? '나' : '')}</span></b>
                    <span className="faint">{x.calendar === 'lunar' ? '음' : '양'} {x.year}.{x.month}.{x.day}</span>
                  </button>
                ))}
              </div>
            )}
            {p.id === 'mbti_deep' && !meta.mbti && <p className="small mt8" style={{ color: '#c0687b' }}>먼저 <Link to="/mbti" className="link">사주 × MBTI</Link>에서 MBTI를 골라 주세요.</p>}
          </section>
        )}
        <section className="mt20">
          <h2 className="h3">결제 수단</h2>
          <div className="seg mt12">{METHODS.map((m) => <button key={m.id} className={method === m.id ? 'on' : ''} onClick={() => setMethod(m.id)}>{m.label}</button>)}</div>
          {isInAppBrowser() && <p className="faint mt8">카카오톡·인스타그램 안에서는 카드 결제창이 막힐 수 있어 카카오페이를 추천해요.</p>}
          <label className="field"><span>결제 안내 문자 받을 휴대폰 번호</span><input className="input" inputMode="tel" value={phone} placeholder="010-0000-0000" onChange={(e) => setPhone(e.target.value)} /></label>
        </section>
        <label className="check mt20"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>디지털 콘텐츠 특성상 풀이가 열린 뒤에는 청약철회가 제한됨을 확인했어요. <Link to="/refund" className="link">환불정책</Link></span></label>
        <button className="btn primary mt20" disabled={!ready || busy} onClick={pay}>{busy ? '결제창을 여는 중…' : `${won(p.price)} 결제하기`}</button>
        <p className="notice mt12">회원가입 없이 결제할 수 있어요. 로그인하면 다른 기기에서도 풀이를 볼 수 있어요.</p>
      </main>
    </>
  );
}

export function PayReturn() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [msg, setMsg] = useState('결제를 확인하고 있어요');
  useEffect(() => {
    const id = sp.get('order') ?? (() => { try { return JSON.parse(localStorage.getItem(PENDING) || '{}').orderId; } catch { return null; } })();
    if (!id) { nav('/', { replace: true }); return; }
    let n = 0;
    const tick = async () => {
      const o = await apiAuth<{ status: string; kind: string; productId: string }>(`/orders/${id}`).catch(() => null);
      if (o?.status === 'paid') { localStorage.removeItem(PENDING); track('pay_success', { product: o.productId }); nav(o.kind === 'subscription' ? '/friend' : `/reading/${id}`, { replace: true }); return; }
      if (o && ['failed', 'cancelled'].includes(o.status)) { track('pay_cancel', { product: o.productId }); setMsg('결제가 완료되지 않았어요'); return; }
      if (++n < 15) setTimeout(tick, 2000); else setMsg('결제 확인이 늦어지고 있어요. 마이 > 구매한 풀이에서 확인해 주세요.');
    };
    void tick();
  }, []);
  return <main className="screen center" style={{ paddingTop: 120 }}><div style={{ display: 'grid', placeItems: 'center' }}><Moon size={100} /></div><p className="mt16">{msg}</p><Link to="/me" className="link">마이로 가기</Link></main>;
}

type Reading = { status: 'queued' | 'generating' | 'done' | 'failed'; productId: string; content: { title: string; intro: string; chapters: { id: string; title: string; say: string; body: string; highlight: string }[]; closing: { title: string; body: string; tips: string[] } } | null };
export function ReadingPage() {
  const { orderId } = useParams();
  const [r, setR] = useState<Reading | null>(null);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const { profile, isSample } = useMain();
  const toast = useToast();
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const x = await apiAuth<Reading>(`/readings/${orderId}`);
        if (stop) return;
        setR(x);
        if (x.status === 'queued' || x.status === 'generating') setTimeout(tick, 3000);
      } catch (e: any) { setErr(e.message); }
    };
    void tick();
    return () => { stop = true; };
  }, [orderId]);
  const keep = async () => {
    if (!r?.content) return;
    await apiAuth('/memories', { method: 'POST', json: { kind: 'reading', category: r.productId.startsWith('money') ? 'money' : ['love_flow', 'gunghap'].includes(r.productId) ? 'love' : 'growth', title: `${r.content.title} 풀이를 받음`, summary: r.content.chapters[0]?.highlight, refId: orderId, profileId: isSample ? null : profile.id } }).catch(() => {});
    setSaved(true); toast('타임라인에 새겼어요');
  };
  const share = async (text: string) => {
    const url = await shortLink('/', `reading_${r?.productId}`, `달새김사주 ${r?.content?.title}`, text);
    if ((await shareLink({ title: '달새김사주', text, url })) === 'copied') toast('링크를 복사했어요');
  };
  if (err) return <><Top title="풀이" back="/me" /><main className="screen"><p>{err}</p><Link to="/me" className="btn primary">마이로 가기</Link></main></>;
  if (!r || !r.content) return (
    <>
      <Top title="풀이" back="/me" />
      <main className="screen center" style={{ paddingTop: 60 }}>
        <div style={{ display: 'grid', placeItems: 'center' }}><Moon size={110} /></div>
        <h2 className="h2 mt16">{r?.status === 'failed' ? '풀이를 다시 준비하고 있어요' : '달새김이 풀이를 새기고 있어요'}</h2>
        <p className="muted small mt8">보통 1~2분이면 완성돼요. 이 화면을 닫아도 마이 &gt; 구매한 풀이에서 볼 수 있어요.</p>
        <div className="stack mt24"><Skeleton h={18} /><Skeleton h={18} /><Skeleton h={18} /></div>
      </main>
    </>
  );
  const c = r.content;
  return (
    <>
      <Top title={c.title} back="/me" />
      <main className="screen read">
        <section className="card navy"><div className="eyebrow" style={{ color: 'var(--gold)' }}>달새김사주 풀이</div><h1 className="h1 mt8" style={{ fontSize: 23 }}>{c.title}</h1><p className="mt8" style={{ color: '#d9d6ea', margin: '8px 0 0' }}>{c.intro}</p></section>
        <nav className="chips mt16" aria-label="목차">{c.chapters.map((x, i) => <a key={x.id} href={`#${x.id}`} className="chip sm">{i + 1}. {x.title}</a>)}</nav>
        {c.chapters.map((x, i) => (
          <section key={x.id} id={x.id} className="card mt16" style={{ scrollMarginTop: 70 }}>
            <div className="eyebrow">{String(i + 1).padStart(2, '0')}</div>
            <h2 className="mt4">{x.title}</h2>
            <p className="faint" style={{ marginBottom: 12 }}>{x.say}</p>
            {x.body.split(/\n\n+/).map((t, k) => <p key={k}>{t}</p>)}
            <div className="quote">{x.highlight}</div>
            <button className="link mt8" onClick={() => share(x.highlight)}>이 문장 공유하기</button>
          </section>
        ))}
        <section className="card lav mt16">
          <h2>{c.closing.title}</h2>
          <p>{c.closing.body}</p>
          {c.closing.tips.map((t) => <p key={t} className="small" style={{ margin: '4px 0' }}>· {t}</p>)}
        </section>
        <button className="btn primary mt16" disabled={saved} onClick={keep}>{saved ? '✓ 타임라인에 새겼어요' : '이 풀이를 타임라인에 새기기'}</button>
        <div className="grid2 mt8">
          <Link to="/friend" className="btn line sm" style={{ width: '100%' }}><I.chat size={18} />친구에게 묻기</Link>
          <button className="btn line sm" style={{ width: '100%' }} onClick={() => { const el = document.querySelector('.read') as HTMLElement; if (el) void saveImage(el, `reading_${orderId}`, '#F7F3EE'); }}><I.download size={18} />저장</button>
        </div>
      </main>
    </>
  );
}
