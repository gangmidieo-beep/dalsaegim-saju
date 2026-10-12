// 상품 상세 → 결제 → 결제 후 복귀 → 풀이. 회원가입 없이 결제 가능(기기 계정), 로그인하면 기록이 합쳐진다.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import detail from '@dalsaegim/content/data/detail.json';
import reading from '@dalsaegim/content/data/reading.json';
import { useApp, useMain } from '../store/app';
import { apiAuth } from '../lib/api';
import { PAY_GROUPS, PAY_METHODS, PENDING, isInAppBrowser, methodOf, phoneOk, purchase, savePhone, savedPhone } from '../platform/payments';
import { Moon, Skeleton, Top, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { saveImage } from '../lib/share';
import { useShare } from '../components/share';
import brand from '../../../brand.config.json';

type Prod = (typeof brand.products)[number];
// 무료로 이미 볼 수 있는 것 vs 결제 후 받는 것(대표님 요청: 범위를 분명하게)
const FREE: Record<string, string[]> = {
  love: ['오늘의 연애 지수', '연애·재회 운세의 12달 흐름 그래프', '연애 고민의 길(사랑의 갈림길) 결과'],
  money: ['돈의 흐름 4종 요약 지수', '좋은 달·신중한 달 요약', '오늘의 행운번호'],
  year: ['2027 신년운세 미리보기(총운·좋은 달)', '이번 달 흐름 한 줄'],
  life: ['사주 여덟 글자·오행 균형', '분야별로 보는 나', '지금 지나는 큰 흐름(대운) 한 줄'],
  worry: ['고민의 길 결과(가장 좋은 시기·추천 행동 3가지)'],
  mbti: ['사주 × MBTI 일치도와 한 줄 요약'],
  friend: [`AI 사주친구 하루 ${brand.friend.freePerDay}번 무료 상담`],
};
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
        <section className="card mt12" aria-label="무료와 유료 비교">
          <h3 className="h3">무료와 결제 후, 무엇이 다른가요?</h3>
          <div className="cmp mt12">
            <div><small>무료로 보는 것</small>{(FREE[p.series] ?? ['오늘의 운세', '나의 사주지도 요약']).map((x) => <p key={x}>· {x}</p>)}</div>
            <div className="paid"><small>결제 후 받는 것</small>
              {p.kind === 'pass'
                ? <><p>· 30일 동안 횟수 제한 없이 상담</p><p>· 상담 기록을 이어서 기억하는 상담</p><p>· 기간이 끝나면 자동 결제되지 않아요</p></>
                : <><p>· 내 사주 맞춤 상세 풀이 {ch?.length ?? ''}장</p><p>· 좋은 시기·조심할 시기와 그 이유</p><p>· 바로 할 수 있는 조언</p><p>· 언제든 다시 보기(마이 &gt; 구매한 풀이)</p></>}
            </div>
          </div>
          <Link to="/refund" className="link mt8" style={{ display: 'inline-block', fontSize: 14 }}>환불정책 보기</Link>
        </section>
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
  const [method, setMethod] = useState(() => (isInAppBrowser() && methodOf('kakaopay') ? 'kakaopay' : PAY_METHODS[0]?.id ?? 'card'));
  const [group, setGroup] = useState(() => methodOf(method)?.group ?? 'card');
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
  const m = methodOf(method);
  const inGroup = PAY_METHODS.filter((x) => x.group === group);
  const pickGroup = (g: string) => { setGroup(g); const first = PAY_METHODS.find((x) => x.group === g); if (first) setMethod(first.id); };
  const step = (n: number, t: string) => <h2 className="co-step"><span>{n}</span>{t}</h2>;
  return (
    <>
      <Top title="주문·결제" />
      <main className="screen co">
        <section className="co-item">
          <span className="chip sm lav">디지털 콘텐츠</span>
          <div className="between mt8" style={{ alignItems: 'flex-end' }}>
            <div><b className="co-title">{p.title}</b><div className="faint mt4">{p.kind === 'pass' ? '30일 이용권 · 결제 즉시 시작' : '결제 후 바로 풀이가 만들어져요'}</div></div>
            <div className="co-price">{p.listPrice ? <s>{won(p.listPrice)}</s> : null}<b>{won(p.price)}</b></div>
          </div>
        </section>
        {need > 0 && (
          <section className="mt24">
            <div className="between">{step(1, need > 1 ? '두 사람의 사주 정보' : '사주 정보 확인')}<Link to={`/profile/new?next=${encodeURIComponent(location.pathname + location.search)}`} className="link">+ 새로 입력</Link></div>
            {profiles.length === 0 ? (
              <Link to={`/profile/new?next=${encodeURIComponent(location.pathname + location.search)}`} className="btn line mt12">사주 입력하기</Link>
            ) : (
              <div className="stack mt12">
                {profiles.map((x) => (
                  <button key={x.id} className={`opt${pick.includes(x.id) ? ' picked' : ''}`} style={{ padding: 14 }} onClick={() => toggle(x.id)} aria-pressed={pick.includes(x.id)}>
                    <b style={{ flex: 1, fontSize: 16 }}>{x.name} <span className="faint">· {x.relation ?? (x.id === mainId ? '나' : '')}</span></b>
                    <span className="muted small">{x.calendar === 'lunar' ? '음력' : '양력'} {x.year}.{x.month}.{x.day} · {x.hour == null ? '시간 모름' : `${x.hour}시`}</span>
                  </button>
                ))}
              </div>
            )}
            {need > 1 && <p className="faint mt8">{pick.length}/{need}명 선택</p>}
            {p.id === 'mbti_deep' && !meta.mbti && <p className="small mt8" style={{ color: '#a83f5c' }}>먼저 <Link to="/mbti" className="link">사주 × MBTI</Link>에서 MBTI를 골라 주세요.</p>}
          </section>
        )}
        <section className="mt24">
          {step(need > 0 ? 2 : 1, '결제수단')}
          <div className="co-tabs mt12" role="tablist" aria-label="결제수단 종류">
            {PAY_GROUPS.map(([g, l]) => <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => pickGroup(g)}>{l}</button>)}
          </div>
          <div className="stack mt12" role="radiogroup" aria-label="결제수단">
            {inGroup.map((x) => (
              <button key={x.id} role="radio" aria-checked={method === x.id} className={`co-pay${method === x.id ? ' on' : ''}`} onClick={() => setMethod(x.id)}>
                {x.mark ? <span className="co-mark" style={{ background: x.color, color: x.ink }} aria-hidden>{x.mark}</span> : <span className="co-mark plain" aria-hidden>{x.group === 'phone' ? <I.phone size={18} /> : x.group === 'card' ? <I.card size={18} /> : <I.bank size={18} />}</span>}
                <span className="grow"><b>{x.label}</b>{x.desc && <span className="faint" style={{ display: 'block', fontSize: 13 }}>{x.desc}</span>}</span>
                <span className="co-radio" aria-hidden />
              </button>
            ))}
          </div>
          {isInAppBrowser() && <p className="faint mt8">카카오톡·인스타그램 안에서는 카드 결제창이 막힐 수 있어 간편결제를 추천해요.</p>}
        </section>
        <section className="mt24">
          {step(need > 0 ? 3 : 2, '결제 안내 받을 연락처')}
          <label className="field"><span>휴대폰 번호 (결제 안내 문자)</span><input className="input" inputMode="tel" autoComplete="tel" value={phone} placeholder="010-0000-0000" onChange={(e) => setPhone(e.target.value)} /></label>
          {phone && !phoneOk(phone) && <p className="small mt4" style={{ color: '#a83f5c' }}>010으로 시작하는 번호를 확인해 주세요</p>}
          <label className="check mt16"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>디지털 콘텐츠 특성상 풀이가 열린 뒤에는 청약철회가 제한됨을 확인했어요. <Link to="/refund" className="link">환불정책</Link></span></label>
        </section>
        <section className="co-total mt24">
          {step(need > 0 ? 4 : 3, '최종 확인')}
          <dl>
            <div><dt>상품</dt><dd>{p.title}</dd></div>
            {need > 0 && <div><dt>사주</dt><dd>{pick.length ? pick.map((x) => profiles.find((y) => y.id === x)?.name).join(' · ') : '선택 전'}</dd></div>}
            <div><dt>결제수단</dt><dd>{m?.label ?? '-'}</dd></div>
            {p.listPrice ? <div><dt>할인</dt><dd style={{ color: '#a83f5c' }}>-{won(p.listPrice - p.price)}</dd></div> : null}
            <div className="sum"><dt>총 결제금액</dt><dd>{won(p.price)}</dd></div>
          </dl>
          {m?.group === 'vbank' && <p className="faint mt8">결제창에서 발급된 계좌로 입금하면 확인되는 즉시 마이 › 구매한 풀이에 열려요.</p>}
        </section>
        <button className="btn primary mt20" disabled={!ready || busy} onClick={pay}>{busy ? '결제창을 여는 중…' : `${won(p.price)} 결제하기`}</button>
        {!ready && !busy && <p className="faint center mt8">{need > 0 && pick.length < need ? '사주 정보를 골라 주세요' : !phoneOk(phone) ? '휴대폰 번호를 입력해 주세요' : !agree ? '안내 확인에 체크해 주세요' : ''}</p>}
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
    await apiAuth('/memories', { method: 'POST', json: { kind: 'reading', category: r.productId.startsWith('money') ? 'money' : ['love_flow', 'gunghap', 'reunion'].includes(r.productId) ? 'love' : 'growth', title: `${r.content.title} 풀이를 받음`, summary: r.content.chapters[0]?.highlight, refId: orderId, profileId: isSample ? null : profile.id } }).catch(() => {});
    setSaved(true); toast('타임라인에 새겼어요');
  };
  const openShare = useShare();
  const share = (text: string) => openShare({ title: `달새김사주 ${r?.content?.title ?? ''}`.trim(), text, path: r ? `/product/${r.productId}` : '/', contentId: `reading_${r?.productId}`, note: '고른 한 문장만 보내요. 풀이 전체와 사주 정보는 나만 볼 수 있어요.' });
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
