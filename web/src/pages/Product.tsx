// 상품 상세 → 결제 → 결제 후 복귀 → 풀이. 회원가입 없이 결제 가능(기기 계정), 로그인하면 기록이 합쳐진다.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import detail from '@dalsaegim/content/data/detail.json';
import tarotData from '@dalsaegim/content/data/tarot.json';
import reading from '@dalsaegim/content/data/reading.json';
import { useApp, useMain } from '../store/app';
import { apiAuth } from '../lib/api';
import { PAY_GROUPS, PAY_METHODS, PENDING, isInAppBrowser, methodOf, phoneOk, purchase, savePhone, savedPhone } from '../platform/payments';
import { Moon, Skeleton, Top, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { saveImage } from '../lib/share';
import { useShare } from '../components/share';
import { Flow36, LuckyCard, ReportSummary, SajuTableView, type Basis, type Summary, type Visual } from '../components/report';
import { CARDS, TarotCard } from '../components/tarot';
import { dailyCard } from '@dalsaegim/content';
import { kstMonth, kstToday, kstYear } from '../lib/dates';
import brand from '../../../brand.config.json';
import { PASS_REFUND, PASS_TERMS } from '../lib/policy';

type Prod = (typeof brand.products)[number];
// 무료로 이미 볼 수 있는 것 vs 결제 후 받는 것(대표님 요청: 범위를 분명하게)
const FREE: Record<string, string[]> = {
  love: ['오늘의 연애 지수', '연애·재회 운세의 12달 흐름 그래프', '연애 고민의 길(사랑의 갈림길) 결과'],
  money: ['돈의 흐름 4종 요약 지수', '좋은 달·신중한 달 요약', '오늘의 행운번호'],
  year: ['2027 신년운세 미리보기(총운·좋은 달)', '이번 달 흐름 한 줄'],
  life: ['사주 여덟 글자·오행 균형', '분야별로 보는 나', '지금 지나는 큰 흐름(대운) 한 줄'],
  worry: ['운명의 갈림길 결과(두 선택 비교·가장 좋은 시기·추천 행동)'],
  mbti: ['사주 × MBTI 일치도와 한 줄 요약'],
  friend: [`달빛 상담사 하루 ${brand.friend.freePerDay}번 무료 상담`],
};
const findP = (id?: string) => brand.products.find((p) => p.id === id) as Prod | undefined;

type Detail = { sub: string; target: string[]; why: string; sample?: { title: string; body: string; q: string } };
export function ProductDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const p = findP(id);
  const { isSample } = useMain();
  const d = (detail as Record<string, Detail>)[id ?? ''];
  const [cards, setCards] = useState<{ id: number; rev: boolean }[]>([]);
  const nav = useNavigate();
  const ch = (reading.chapters as Record<string, string[]>)[id ?? ''];
  useEffect(() => { if (p) track('product_view', { product: p.id }); }, [p?.id]);
  if (!p || !p.visible) return <><Top title="풀이" /><main className="screen"><p>없는 상품이에요.</p><Link to="/" className="btn primary">홈으로</Link></main></>;
  const isMonth = p.id === 'month_detail', isTarot = p.id === 'tarot_some';
  const params = new URLSearchParams(sp);
  if (isMonth && !params.get('ym')) params.set('ym', thisYm());
  if (isTarot) { if (cards.length === 3) params.set('cards', cards.map((c) => `${c.id}${c.rev ? 'r' : ''}`).join(',')); else params.delete('cards'); }
  const q = params.toString();
  const go = `/checkout/${p.id}${q ? `?${q}` : ''}`;
  const ym = params.get('ym');
  const STEPS = p.kind === 'pass' ? ['상담사 선택', '내 사주 연결', '대화형 상담', '한 줄 기록'] : p.id === 'tarot_some' ? ['카드 3장', '사주 연결', '세 장 해석', '나의 기록'] : ['사주 정보', '명리 해석', '심층 결과', '나의 기록'];
  return (
    <>
      <Top title={p.title} />
      <main className="screen pd">
        <section className="pd-hero">
          <span className="pd-moon" aria-hidden />
          <small className="pd-eye">DALSAEGIM · PREMIUM READING</small>
          {p.badge && <span className="badge mt8" style={{ display: 'inline-block' }}>{p.badge}</span>}
          <h2>{p.title}</h2>
          <p>{d?.sub ?? p.cardCopy}</p>
          <div className="pd-price">
            {p.listPrice && <span className="was"><s>{won(p.listPrice)}</s><em>{Math.round((1 - p.price / p.listPrice) * 100)}% 할인</em></span>}
            <b>{won(p.price)}</b>
          </div>
        </section>

        {isMonth && <MonthPick ym={ym!} onPick={(v) => { const n = new URLSearchParams(sp); n.set('ym', v); nav(`/product/${p.id}?${n}`, { replace: true }); }} />}
        {isTarot && <TarotPick picked={cards} onChange={setCards} />}
        {p.adult && <div className="adult-box mt16"><b>19세 이상 이용 상품이에요</b><p>결제 전에 휴대폰 본인인증으로 만 19세 이상인지 한 번만 확인해요. 생년월일은 저장하지 않아요. 표현은 자극적이지 않게, 두 사람의 친밀감·속도·배려를 중심으로 풀어 드려요.</p></div>}

        <ol className="pd-steps mt16" aria-label="이용 순서">
          {STEPS.map((t, i) => <li key={t} className={i === 0 && !isSample && p.kind !== 'pass' ? 'done' : ''}><span>{i === 0 && !isSample && p.kind !== 'pass' ? '✓' : `0${i + 1}`}</span>{t}</li>)}
        </ol>

        {ch && (
          <section className="card mt16" aria-labelledby="pd-guide">
            <small className="pd-eye dark">READING GUIDE</small>
            <h3 className="h3 mt4" id="pd-guide">이 리포트에서 확인할 내용 · {ch.length}장</h3>
            <ol className="pd-toc mt12">{ch.map((c, i) => <li key={c}><span>{String(i + 1).padStart(2, '0')}</span>{c}</li>)}</ol>
          </section>
        )}

        {d?.sample && (
          <section className="pd-sample mt12" aria-labelledby="pd-sample">
            <small className="pd-eye dark">PREMIUM SAMPLE · 서술 방식</small>
            <h3 className="h3 mt4" id="pd-sample">{d.sample.title}</h3>
            <p>{d.sample.body}</p>
            <div className="pd-q"><small>나에게 남기는 질문</small><b>{d.sample.q}</b></div>
          </section>
        )}

        {d && (
          <section className="card mt12">
            <h3 className="h3">이런 분께 필요해요</h3>
            {d.target.map((t) => <p key={t} className="pd-check">{t}</p>)}
            <h3 className="h3 mt16">지금 봐야 하는 이유</h3>
            <p className="small mt8" style={{ margin: '8px 0 0' }}>{d.why}</p>
          </section>
        )}

        <section className="card mt12" aria-label="무료와 유료 비교">
          <h3 className="h3">무료와 결제 후, 무엇이 다른가요?</h3>
          <div className="cmp mt12">
            <div><small>무료로 보는 것</small>{(p.id === 'tarot_some' ? ['오늘의 타로 한 장과 메시지', '카드 3장 직접 고르기'] : FREE[p.series] ?? ['오늘의 운세', '나의 사주지도 요약']).map((x) => <p key={x}>· {x}</p>)}</div>
            <div className="paid"><small>결제 후 받는 것</small>
              {p.kind === 'pass'
                ? <>{PASS_TERMS.slice(0, 4).map((t) => <p key={t}>· {t}</p>)}</>
                : p.id === 'tarot_some' ? <><p>· 고른 카드 3장의 자리별 해석(정·역방향)</p><p>· 세 장이 함께 말하는 흐름</p><p>· 내 사주로 본 마음이 닿는 달</p><p>· 언제든 다시 보기(보관함)</p></>
                : <><p>· 내 사주 맞춤 상세 풀이 {ch?.length ?? ''}장</p><p>· 좋은 시기·조심할 시기와 그 이유</p><p>· 바로 할 수 있는 조언</p><p>· 언제든 다시 보기(보관함)</p></>}
            </div>
          </div>
        </section>

        {p.kind === 'pass' && (
          <section className="card flat mt12" aria-labelledby="pd-refund">
            <h3 className="h3" id="pd-refund">환불 기준</h3>
            {PASS_REFUND.map((t) => <p key={t} className="small" style={{ margin: '6px 0 0' }}>· {t}</p>)}
          </section>
        )}
        {p.kind !== 'pass' && (
          <section className="card flat mt12" aria-labelledby="pd-basis">
            <h3 className="h3" id="pd-basis">해석 근거 안내</h3>
            <p className="small mt8" style={{ margin: '8px 0 0' }}>{p.id === 'tarot_some' ? '78장 카드의 정·역방향 해석을 썸 상황에 맞춰 풀고, 시기는 생년월일시로 계산한 사주 흐름에서 가져와요. ' : ''}생년월일시·양력/음력·윤달·절기를 반영해 계산한 사주원국·오행·십성·대운만 근거로 씁니다. 계산하지 않은 점수·순위·수익률은 만들지 않아요. 운세는 자기 이해를 돕는 참고 정보예요.</p>
            <Link to="/refund" className="link mt8" style={{ display: 'inline-block', fontSize: 14 }}>환불정책 보기</Link>
          </section>
        )}
        <p className="notice mt12">결제 후 바로 이 사이트에서 열려요 · 회원가입 없이 결제 가능 · 보관함에서 언제든 다시 볼 수 있어요</p>
        <div className="pd-cta">
          <span><small>콘텐츠 이용금액</small><b>{won(p.price)}</b></span>
          {isTarot && cards.length < 3
            ? <button className="btn primary" disabled>카드 {3 - cards.length}장 더 고르기</button>
            : <Link to={go} className="btn primary">{p.kind === 'pass' ? '이용권 시작하기' : isTarot ? '세 장의 해석 받기' : isMonth ? `${Number(ym!.slice(5))}월 운세 받기` : '상세 풀이 받기'} →</Link>}
        </div>
      </main>
    </>
  );
}

// 포트원 본인인증 SDK — 성인 상품 결제 때만 불러온다
let portone: Promise<any> | null = null;
const loadPortOne = () => (portone ??= new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.portone.io/v2/browser-sdk.js'; s.onload = () => ok((window as any).PortOne); s.onerror = () => no(new Error('본인인증 창을 불러오지 못했어요')); document.head.appendChild(s); }));
const thisYm = () => `${kstYear()}-${String(kstMonth()).padStart(2, '0')}`;
// 월간운세 — 1~12월(지난 달은 내년 같은 달 = 앞으로 12달)
export function MonthPick({ ym, onPick }: { ym: string; onPick: (ym: string) => void }) {
  const y = kstYear(), m = kstMonth();
  return (
    <section className="card mt16" aria-label="운세를 볼 달 고르기">
      <h3 className="h3">궁금한 달을 골라 주세요</h3>
      <div className="mchips mt12">
        {Array.from({ length: 12 }, (_, i) => { const mm = i + 1; const yy = mm < m ? y + 1 : y; const v = `${yy}-${String(mm).padStart(2, '0')}`; return <button key={v} className={v === ym ? 'on' : ''} aria-pressed={v === ym} onClick={() => onPick(v)}>{mm === m && <small>이번 달</small>}{mm}월</button>; })}
      </div>
      <p className="faint mt8">{ym.slice(0, 4)}년 {Number(ym.slice(5))}월의 날짜별 흐름과 좋은 날을 풀어 드려요.</p>
    </section>
  );
}

// 썸 타로 — 섞인 카드 18장 중 3장 고르기(정·역방향은 고를 때 정해짐) + 오늘의 한 장(무료)
export function TarotPick({ picked, onChange }: { picked: { id: number; rev: boolean }[]; onChange: (x: { id: number; rev: boolean }[]) => void }) {
  const [deck] = useState(() => { const ids = CARDS.map((c) => c.id).sort(() => Math.random() - 0.5).slice(0, 18); return ids.map((id) => ({ id, rev: Math.random() < 0.3 })); });
  const [daily, setDaily] = useState<{ id: number; rev: boolean } | null>(null);
  const POS = ['그 사람의 마음', '우리 사이의 흐름', '다가올 결과와 조언'];
  const toggle = (c: { id: number; rev: boolean }) => {
    if (picked.some((x) => x.id === c.id)) onChange(picked.filter((x) => x.id !== c.id));
    else if (picked.length < 3) { onChange([...picked, c]); track('tarot_draw', { n: picked.length + 1 }); }
  };
  const drawDaily = () => { const d = dailyCard(`${kstToday()}:${guestSeed()}`); setDaily({ id: d.card.id, rev: d.rev }); track('tarot_draw', { daily: 1 }); };
  const dc = daily ? CARDS[daily.id] as (typeof CARDS)[number] & { up?: string; rv?: string; tip?: string; rtip?: string } : null;
  return (
    <>
      <section className="tr-daily mt16" aria-label="오늘의 타로 한 장">
        {daily ? <TarotCard id={daily.id} rev={daily.rev} size={96} style={{ borderRadius: 9 }} /> : <button onClick={drawDaily} aria-label="오늘의 카드 한 장 뽑기"><TarotCard id={0} back size={96} /></button>}
        <div>
          <small>오늘의 타로 · 무료</small>
          {dc ? <><b>{dc.name} {daily!.rev ? '(역방향)' : ''}</b><p>{(tarotFull[daily!.id] as any)[daily!.rev ? 'rv' : 'up']}</p></> : <><b>카드 한 장으로 오늘의 마음 보기</b><p>왼쪽 카드를 눌러 오늘의 메시지를 무료로 받아 보세요.</p></>}
        </div>
      </section>
      <section className="tr-stage mt12" aria-label="썸 타로 카드 고르기">
        <h3>마음을 떠올리며 카드 3장을 골라 주세요</h3>
        <p>그 사람을 생각하며 마음이 가는 카드를 차례로 눌러 주세요.</p>
        <div className="tr-fan">
          {deck.map((c, i) => { const n = picked.findIndex((x) => x.id === c.id); return (
            <button key={c.id} className={n >= 0 ? 'on' : ''} data-n={n >= 0 ? n + 1 : undefined} disabled={n < 0 && picked.length >= 3} aria-pressed={n >= 0} aria-label={`${i + 1}번째 카드${n >= 0 ? ` · ${POS[n]}` : ''}`} onClick={() => toggle(c)}>
              <TarotCard id={c.id} back size={60} />
            </button>); })}
        </div>
        <div className="tr-picked">{picked.length ? picked.map((_, i) => <span key={i}>{i + 1}. {POS[i]}</span>) : <span>아직 고른 카드가 없어요</span>}</div>
      </section>
    </>
  );
}
const tarotFull = (tarotData as { cards: { up: string; rv: string }[] }).cards;
const guestSeed = () => { try { return JSON.parse(localStorage.getItem('dalsaegim-guest') || '{}').deviceId ?? 'g'; } catch { return 'g'; } };

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
  const meta = Object.fromEntries(['cat', 'sub', 'q', 'mbti', 'ym', 'cards'].map((k) => [k, sp.get(k) ?? (k === 'mbti' ? profiles.find((x) => x.id === pick[0])?.mbti ?? '' : '')]).filter(([, v]) => v));
  const [adult, setAdult] = useState<{ verified: boolean; mode: string; storeId?: string | null; channelKey?: string | null } | null>(null);
  useEffect(() => { if (p?.adult) apiAuth<typeof adult>('/adult/status').then(setAdult).catch(() => setAdult({ verified: false, mode: 'off' })); }, [p?.adult]);
  const verifyAdult = async () => {
    try {
      let idv: string | undefined;
      if (adult?.mode === 'portone') {
        const PortOne = await loadPortOne();
        idv = `idv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const r = await PortOne.requestIdentityVerification({ storeId: adult.storeId, identityVerificationId: idv, channelKey: adult.channelKey, redirectUrl: location.href });
        if (r?.code) { toast(r.message ?? '본인인증을 마치지 못했어요'); return; }
      }
      const v = await apiAuth<{ verified: boolean }>('/adult/verify', { method: 'POST', json: { identityVerificationId: idv } });
      if (v.verified) { setAdult((a) => ({ ...(a ?? { mode: 'mock' }), verified: true })); toast('성인 인증을 마쳤어요'); }
    } catch (e: any) { toast(e.message ?? '성인 인증을 마치지 못했어요'); }
  };
  const ready = pick.length >= need && agree && phoneOk(phone) && !(p.id === 'mbti_deep' && !meta.mbti) && !(p.adult && !adult?.verified) && !(p.id === 'tarot_some' && !meta.cards);
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
            <div><b className="co-title">{p.title}</b><div className="faint mt4">{p.kind === 'pass' ? `질문 ${(p as any).questions ?? 10}회 · ${(p as any).days ?? 90}일 · 결제 즉시 시작` : meta.ym ? `${meta.ym.slice(0, 4)}년 ${Number(meta.ym.slice(5))}월 · 결제 후 바로 풀이가 만들어져요` : meta.cards ? '고른 카드 3장 · 결제 후 바로 해석이 열려요' : '결제 후 바로 풀이가 만들어져요'}</div></div>
            <div className="co-price">{p.listPrice ? <s>{won(p.listPrice)}</s> : null}<b>{won(p.price)}</b></div>
          </div>
        </section>
        {p.kind === 'pass' && (
          <section className="card flat mt12" aria-label="이용권 조건">
            {PASS_TERMS.slice(0, 4).map((t) => <p key={t} className="small" style={{ margin: '2px 0' }}>· {t}</p>)}
          </section>
        )}
        {p.adult && (
          <section className="adult-box mt16" aria-label="성인 인증">
            <b>{adult?.verified ? '✓ 성인 인증 완료' : '결제 전에 성인 인증이 필요해요'}</b>
            <p>{adult?.verified ? '인증을 마쳤어요. 이 기기·계정에서는 다시 하지 않아도 돼요.' : adult?.mode === 'off' ? '성인 인증 서비스를 준비하고 있어요. 조금만 기다려 주세요.' : '휴대폰 본인인증으로 만 19세 이상인지 확인해요. 생년월일은 저장하지 않아요.'}</p>
            {!adult?.verified && adult?.mode !== 'off' && <button className="btn primary sm mt12" onClick={verifyAdult}>{adult?.mode === 'mock' ? '시연용 성인 인증하기' : '휴대폰 본인인증'}</button>}
          </section>
        )}
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
            <span>{p.kind === 'pass' ? '이용권 사용 조건(질문 차감 기준·유효기간)과 환불 기준을 확인했어요.' : '디지털 콘텐츠 특성상 풀이가 열린 뒤에는 청약철회가 제한됨을 확인했어요.'} <Link to="/refund" className="link">환불정책</Link></span></label>
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
          {m?.group === 'vbank' && <p className="faint mt8">결제창에서 발급된 계좌로 입금하면 확인되는 즉시 보관함 › 구매한 운세에 열려요.</p>}
        </section>
        <button className="btn primary mt20" disabled={!ready || busy} onClick={pay}>{busy ? '결제창을 여는 중…' : `${won(p.price)} 결제하기`}</button>
        {!ready && !busy && <p className="faint center mt8">{p.adult && !adult?.verified ? '성인 인증을 먼저 해 주세요' : need > 0 && pick.length < need ? '사주 정보를 골라 주세요' : !phoneOk(phone) ? '휴대폰 번호를 입력해 주세요' : !agree ? '안내 확인에 체크해 주세요' : ''}</p>}
        <p className="notice mt12">회원가입 없이 결제할 수 있어요. 로그인하면 다른 기기에서도 풀이를 볼 수 있어요.</p>
      </main>
    </>
  );
}

export function PayReturn() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [msg, setMsg] = useState('결제를 확인하고 있어요');
  const [retry, setRetry] = useState<string | null>(null);
  useEffect(() => {
    const id = sp.get('order') ?? (() => { try { return JSON.parse(localStorage.getItem(PENDING) || '{}').orderId; } catch { return null; } })();
    if (!id) { nav('/', { replace: true }); return; }
    let n = 0;
    const tick = async () => {
      const o = await apiAuth<{ status: string; kind: string; productId: string }>(`/orders/${id}`).catch(() => null);
      if (o?.status === 'paid') { localStorage.removeItem(PENDING); track('pay_success', { product: o.productId }); nav(o.kind === 'subscription' ? '/friend' : `/reading/${id}`, { replace: true }); return; }
      if (o && ['failed', 'cancelled'].includes(o.status)) { track('pay_cancel', { product: o.productId }); setMsg('결제가 완료되지 않았어요'); setRetry(o.productId); return; }
      if (++n < 15) setTimeout(tick, 2000); else setMsg('결제 확인이 늦어지고 있어요. 하단 보관함 › 구매한 운세에서 확인해 주세요.');
    };
    void tick();
  }, []);
  return <main className="screen center" style={{ paddingTop: 120 }}><div style={{ display: 'grid', placeItems: 'center' }}><Moon size={100} /></div><p className="mt16">{msg}</p>{retry && <Link to={`/checkout/${retry}`} replace className="btn primary mt16" style={{ maxWidth: 280, margin: '16px auto 0' }}>다시 결제하기</Link>}<Link to="/box" className="link mt16" style={{ display: 'block' }}>보관함으로 가기</Link></main>;
}

type Reading = { status: 'queued' | 'generating' | 'done' | 'failed'; productId: string; content: { title: string; intro: string; visual?: Visual; summary?: Summary; chapters: { id: string; title: string; say: string; body: string; highlight: string; points?: string[]; basis?: Basis[] }[]; closing: { title: string; body: string; tips: string[] } } | null };
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
        <p className="muted small mt8">보통 1~2분이면 완성돼요. 이 화면을 닫아도 하단 보관함에서 다시 볼 수 있어요.</p>
        <div className="stack mt24"><Skeleton h={18} /><Skeleton h={18} /><Skeleton h={18} /></div>
      </main>
    </>
  );
  const c = r.content;
  return (
    <>
      <Top title={c.title} back="/box" />
      <main className="screen read">
        <section className="card navy"><div className="eyebrow" style={{ color: 'var(--gold)' }}>달새김사주 풀이</div><h1 className="h1 mt8" style={{ fontSize: 23 }}>{c.title}</h1><p className="mt8" style={{ color: '#d9d6ea', margin: '8px 0 0' }}>{c.intro}</p></section>
        {c.summary && <div className="mt16"><ReportSummary s={c.summary} title={c.title} cardsNode={c.summary.cards && (
          <div className="rs-cards">{c.summary.cards.map((x, i) => <figure key={i}><span className="tr-flip" style={{ display: "block" }}><TarotCard id={x.id} rev={x.rev} size={86} /></span><figcaption><b>{CARDS[x.id]?.name}{x.rev ? ' · 역' : ''}</b>{['그 사람의 마음', '우리 사이의 흐름', '다가올 결과'][i]}</figcaption></figure>)}</div>
        )} /></div>}
        <nav className="chips mt16" aria-label="목차">{c.chapters.map((x, i) => <a key={x.id} href={`#${x.id}`} className="chip sm">{i + 1}. {x.title}</a>)}</nav>
        {c.visual && (
          <section className="card mt16" aria-labelledby="st-full">
            <div className="eyebrow">사주원국</div>
            <h2 className="mt4" id="st-full">{profile.name} 님의 사주 구성표</h2>
            <p className="faint" style={{ marginBottom: 12 }}>시주·일주·월주·연주의 균형을 보는 기본표예요. 장마다 근거가 되는 자리를 ①②③으로 표시했어요.</p>
            <SajuTableView table={c.visual.table} full name={profile.name} />
          </section>
        )}
        {c.chapters.map((x, i) => (
          <section key={x.id} id={x.id} className="card mt16" style={{ scrollMarginTop: 70 }}>
            <div className="eyebrow">제 {i + 1}장</div>
            <h2 className="mt4">{x.title}</h2>
            {x.points && <div className="chips mt8">{x.points.map((t) => <span key={t} className="chip sm lav">{t}</span>)}</div>}
            <p className="faint" style={{ margin: '10px 0 12px' }}>{x.say}</p>
            {c.visual && x.basis && x.basis.length > 0 && <div className="mb12"><SajuTableView table={c.visual.table} basis={x.basis} /></div>}
            {c.visual?.flow && c.visual.flowAt === i && <Flow36 flow={c.visual.flow} name={profile.name} />}
            {x.body.split(/\n\n+/).map((t, k) => <p key={k}>{t}</p>)}
            {c.visual?.lucky && c.visual.luckyAt === i && <LuckyCard l={c.visual.lucky as any} />}
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
