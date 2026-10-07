// 관리자 8개 메뉴 화면
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi, download, dt, fileToDataUrl, session, won } from './api';

/* ---------- 공통 ---------- */
function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const reload = useCallback(() => { setErr(''); fn().then(setData).catch((e) => setErr(e.message)); }, deps);
  useEffect(reload, [reload]);
  return { data, err, reload };
}
const PERIODS = [['today', '오늘'], ['yesterday', '어제'], ['7d', '최근 7일'], ['month', '이번 달'], ['custom', '기간 선택']] as const;
function usePeriod(initial = 'today') {
  const [period, setPeriod] = useState(initial);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const qs = period === 'custom' && from && to ? `period=custom&from=${from}&to=${to}` : `period=${period === 'custom' ? '7d' : period}`;
  const ui = (
    <div className="ad-period">
      {PERIODS.map(([k, l]) => <button key={k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}
      {period === 'custom' && <><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />~<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>}
    </div>
  );
  return { qs, ui };
}
function Head({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="ad-head"><h2>{title}</h2><div className="ad-tools">{children}</div></header>;
}
function Card({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return <div className="ad-card"><small>{label}</small><b>{value}</b>{sub && <span>{sub}</span>}</div>;
}
// 선 그래프(외부 라이브러리 없이 SVG)
function Line({ rows, keys }: { rows: Record<string, any>[]; keys: { k: string; label: string; color: string }[] }) {
  const W = 760, H = 220, P = 34;
  if (!rows.length) return null;
  const max = (k: string) => Math.max(1, ...rows.map((r) => +r[k] || 0));
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, rows.length - 1);
  return (
    <figure className="ad-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="일별 그래프">
        {[0, 0.5, 1].map((t) => <line key={t} x1={P} x2={W - P} y1={P + t * (H - P * 2)} y2={P + t * (H - P * 2)} stroke="#E8DDC4" />)}
        {keys.map(({ k, color }) => (
          <polyline key={k} fill="none" stroke={color} strokeWidth={2.5} points={rows.map((r, i) => `${x(i)},${H - P - ((+r[k] || 0) / max(k)) * (H - P * 2)}`).join(' ')} />
        ))}
        {rows.map((r, i) => (i % Math.ceil(rows.length / 8) === 0 ? <text key={i} x={x(i)} y={H - 8} fontSize={11} textAnchor="middle" fill="#857B6E">{String(r.date).slice(5)}</text> : null))}
      </svg>
      <figcaption>{keys.map(({ k, label, color }) => <span key={k}><i style={{ background: color }} />{label} (최대 {max(k).toLocaleString('ko-KR')})</span>)}</figcaption>
    </figure>
  );
}
const isSuper = () => session()?.role === 'super';

/* ---------- 1 대시보드 ---------- */
export function Dashboard() {
  const { qs, ui } = usePeriod('7d');
  const { data, err } = useLoad(() => adminApi<any>(`/dashboard?${qs}`), [qs]);
  const k = data?.byKind ?? {};
  return (
    <>
      <Head title="대시보드">{ui}<button className="ad-btn line" onClick={() => download(`/dashboard?${qs}&format=csv`, 'dashboard.csv')}>CSV 받기</button></Head>
      {err && <p className="ad-err">{err}</p>}
      {data && (
        <>
          <div className="ad-cards">
            <Card label="방문자" value={data.cards.visitors.toLocaleString('ko-KR')} />
            <Card label="신규가입" value={data.cards.signups.toLocaleString('ko-KR')} />
            <Card label="AI 친구 이용권(현재)" value={data.cards.passes.toLocaleString('ko-KR')} />
            <Card label="결제건수" value={data.cards.orders.toLocaleString('ko-KR')} />
            <Card label="결제매출" value={won(data.cards.revenue)} />
          </div>
          <div className="ad-cards four">
            {[['money', '돈의 흐름'], ['year', '신년·월간'], ['love', '연애·궁합'], ['etc', '사주지도·고민·MBTI'], ['pass', 'AI 친구 이용권']].map(([key, l]) => (
              <Card key={key} label={l} value={won(k[key]?.revenue ?? 0)} sub={`${k[key]?.n ?? 0}건`} />
            ))}
          </div>
          <section className="ad-box"><h3>일별 흐름 ({data.range.from} ~ {data.range.to})</h3>
            <Line rows={data.daily} keys={[{ k: 'visitors', label: '방문자', color: '#1B1F3B' }, { k: 'signups', label: '신규가입', color: '#8F7AE6' }, { k: 'revenue', label: '매출', color: '#B8925F' }]} />
            <table className="ad-table"><thead><tr><th>날짜</th><th>방문자</th><th>신규가입</th><th>결제건수</th><th>매출</th></tr></thead>
              <tbody>{data.daily.slice().reverse().map((r: any) => <tr key={r.date}><td>{r.date}</td><td>{r.visitors}</td><td>{r.signups}</td><td>{r.orders}</td><td>{won(r.revenue)}</td></tr>)}</tbody></table>
          </section>
        </>
      )}
    </>
  );
}

/* ---------- 2 회원관리 ---------- */
export function Members() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const { data, err } = useLoad(() => adminApi<any[]>(`/members?limit=100&search=${encodeURIComponent(q)}&tier=${tier}`), [q, tier]);
  const [sel, setSel] = useState<string | null>(null);
  const detail = useLoad(() => (sel ? adminApi<any>(`/members/${sel}`) : Promise.resolve(null)), [sel]);
  return (
    <>
      <Head title="회원관리">
        <form onSubmit={(e) => { e.preventDefault(); setQ(search); }} className="ad-search"><input placeholder="이름·회원번호·이메일" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="ad-btn">검색</button></form>
        <select value={tier} onChange={(e) => setTier(e.target.value)}><option value="">전체</option><option value="free">일반</option><option value="premium">프리미엄</option></select>
      </Head>
      {err && <p className="ad-err">{err}</p>}
      <table className="ad-table click">
        <thead><tr><th>회원번호</th><th>이름·닉네임</th><th>가입일</th><th>최근 접속</th><th>등급</th><th>결제 누적액</th><th>등록 사주</th><th>로그인</th></tr></thead>
        <tbody>{data?.map((m) => (
          <tr key={m.id} onClick={() => setSel(m.id)} className={sel === m.id ? 'on' : ''}>
            <td className="mono">{m.id.slice(0, 10)}</td><td>{m.name ?? '(게스트)'}</td><td>{dt(m.created_at)}</td><td>{dt(m.last_seen_at)}</td>
            <td>{m.premium ? <span className="ad-tag gold">프리미엄</span> : '일반'}</td><td>{won(m.paid_total)}</td><td>{m.profiles}</td><td>{m.provider ?? '-'}</td>
          </tr>
        ))}</tbody>
      </table>
      {detail.data && (
        <section className="ad-drawer">
          <button className="ad-x" onClick={() => setSel(null)} aria-label="닫기">×</button>
          <h3>{detail.data.user.name ?? '(게스트)'} <small className="mono">{detail.data.user.id}</small></h3>
          <h4>등록 사주 {detail.data.profiles.length}</h4>
          <ul>{detail.data.profiles.map((p: any) => <li key={p.id}>{p.name} · {p.calendar === 'lunar' ? '음력' : '양력'} {p.birth_year}.{p.birth_month}.{p.birth_day} · {p.gender === 'F' ? '여' : '남'}</li>)}</ul>
          <h4>구매 이력</h4>
          <ul>{detail.data.orders.map((o: any) => <li key={o.id}>{dt(o.created_at)} · {o.title ?? o.product_id} · {won(o.amount)} · {o.status}</li>)}</ul>
          <h4>구독 이력</h4>
          <ul>{detail.data.subscriptions.map((s: any) => <li key={s.id}>{s.plan === 'yearly' ? '연간' : '월간'} · {s.status} · {dt(s.started_at)} ~ {dt(s.expires_at)}</li>)}</ul>
        </section>
      )}
    </>
  );
}

/* ---------- 3 콘텐츠 상품관리 ---------- */
const PRODUCT_TABS = [
  ['all', '전체', () => true], ['money', '돈의 흐름', (p: any) => p.series === 'money'], ['year', '신년·월간', (p: any) => p.series === 'year'],
  ['love', '연애·궁합', (p: any) => ['love', 'adult'].includes(p.series)], ['etc', '사주지도·고민·MBTI·이용권', (p: any) => ['life', 'worry', 'mbti', 'friend'].includes(p.series)],
] as const;
export function Products() {
  const [tab, setTab] = useState<string>('all');
  const { data, err, reload } = useLoad(() => adminApi<any[]>('/products'), []);
  const [rows, setRows] = useState<any[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const filter = PRODUCT_TABS.find((t) => t[0] === tab)![2];
  useEffect(() => { if (data) setRows(data.filter(filter as any).sort((a, b) => a.sort - b.sort)); }, [data, tab]);
  const patch = (i: number, v: Record<string, unknown>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...v, _dirty: true } : x)));
  const save = async (p: any) => {
    const body: any = { title: p.title, cardCopy: p.cardCopy, detail: p.detail, badge: p.badge || null, visible: p.visible, imageUrl: p.imageUrl,
      showDiscount: p.showDiscount };
    if (isSuper()) Object.assign(body, { price: +p.price, listPrice: p.listPrice ? +p.listPrice : null });
    try { await adminApi(`/products/${p.id}`, { method: 'PATCH', json: body }); setMsg(`${p.title} 저장 — 앱에 바로 반영돼요`); reload(); } catch (e) { setMsg((e as Error).message); }
  };
  const drop = async (to: number) => {
    if (drag == null || drag === to) return;
    const next = rows.slice();
    const [m] = next.splice(drag, 1);
    next.splice(to, 0, m);
    setRows(next);
    setDrag(null);
    await adminApi('/products/reorder', { method: 'POST', json: { ids: next.map((x) => x.id) } });
    setMsg('노출 순서를 바꿨어요');
  };
  const upload = async (i: number, f?: File) => {
    if (!f) return;
    const r = await adminApi<{ url: string }>('/upload', { method: 'POST', json: { dataUrl: await fileToDataUrl(f) } });
    patch(i, { imageUrl: r.url });
  };
  return (
    <>
      <Head title="콘텐츠 상품관리"><div className="ad-period">{PRODUCT_TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div></Head>
      {err && <p className="ad-err">{err}</p>}
      {msg && <p className="ad-ok">{msg}</p>}
      <p className="ad-muted">줄을 끌어 놓으면 노출 순서가 바뀌어요 · 가격은 최고관리자만 바꿀 수 있어요{!isSuper() && ' (지금은 운영자)'}</p>
      <table className="ad-table">
        <thead><tr><th /><th>노출</th><th>상품명 · 카드 문구 · 상세설명</th><th>가격</th><th>정가(할인 전)</th><th>배지</th><th>대표 이미지</th><th /></tr></thead>
        <tbody>{rows.map((p, i) => (
          <tr key={p.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)} className={drag === i ? 'dragging' : ''}>
            <td className="grip" title="끌어서 순서 바꾸기">⋮⋮</td>
            <td><input type="checkbox" checked={p.visible} onChange={(e) => patch(i, { visible: e.target.checked })} aria-label="노출" /></td>
            <td className="wide">
              <input value={p.title} onChange={(e) => patch(i, { title: e.target.value })} aria-label="상품명" />
              <input value={p.cardCopy ?? ''} onChange={(e) => patch(i, { cardCopy: e.target.value })} aria-label="카드 문구" />
              {p.adult && <span className="ad-muted">성인 상품 — 성인 인증 연결 전까지 노출 꺼 두세요</span>}
            </td>
            <td><input type="number" value={p.price} disabled={!isSuper()} onChange={(e) => patch(i, { price: e.target.value })} aria-label="가격" /></td>
            <td><input type="number" value={p.listPrice ?? ''} placeholder="정가(할인 전)" disabled={!isSuper()} onChange={(e) => patch(i, { listPrice: e.target.value })} aria-label="정가" />
              <label className="ad-check sm"><input type="checkbox" checked={p.showDiscount !== false} onChange={(e) => patch(i, { showDiscount: e.target.checked })} />할인율 표시</label></td>
            <td><select value={p.badge ?? ''} onChange={(e) => patch(i, { badge: e.target.value })}><option value="">없음</option><option>NEW</option><option>BEST</option><option>HOT</option><option>인기</option></select></td>
            <td>{p.imageUrl ? <img src={p.imageUrl} alt="" className="ad-thumb" /> : <span className="ad-thumb hz">☾</span>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(i, e.target.files?.[0])} aria-label="이미지 올리기" /></td>
            <td><button className={`ad-btn ${p._dirty ? 'gold' : 'line'} sm`} onClick={() => save(p)}>저장</button></td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}

/* ---------- 4 배너·팝업 ---------- */
const SLOTS = [['home', '홈 배너'], ['event_popup', '이벤트 팝업']] as const;
export function Banners() {
  const [slot, setSlot] = useState<string>('home');
  const { data, err, reload } = useLoad(() => adminApi<any[]>('/banners'), []);
  const [edit, setEdit] = useState<any | null>(null);
  const list = (data ?? []).filter((b) => b.slot === slot);
  const save = async () => { await adminApi('/banners', { method: 'POST', json: edit }); setEdit(null); reload(); };
  const del = async (id: string) => { if (confirm('이 배너를 지울까요?')) { await adminApi(`/banners/${id}`, { method: 'DELETE' }); reload(); } };
  const upload = async (f?: File) => { if (f) setEdit({ ...edit, imageUrl: (await adminApi<{ url: string }>('/upload', { method: 'POST', json: { dataUrl: await fileToDataUrl(f) } })).url }); };
  return (
    <>
      <Head title="배너·팝업 관리">
        <div className="ad-period">{SLOTS.map(([k, l]) => <button key={k} className={slot === k ? 'on' : ''} onClick={() => setSlot(k)}>{l}</button>)}</div>
        <button className="ad-btn gold" onClick={() => setEdit({ slot, title: '', copy: '', link: '/', active: true, sort: list.length })}>+ 새로 만들기</button>
      </Head>
      {err && <p className="ad-err">{err}</p>}
      <table className="ad-table">
        <thead><tr><th>순서</th><th>이미지</th><th>제목 · 문구</th><th>연결 화면·URL</th><th>노출 기간</th><th>ON</th><th /></tr></thead>
        <tbody>{list.map((b) => (
          <tr key={b.id}><td>{b.sort + 1}</td><td>{b.image_url ?? b.imageUrl ? <img className="ad-thumb" src={b.imageUrl ?? b.image_url} alt="" /> : <span className="ad-thumb hz">☾</span>}</td>
            <td><b>{b.title}</b><br /><span className="ad-muted">{b.copy}</span></td><td className="mono">{b.link}</td>
            <td>{b.startsAt ? dt(b.startsAt) : '항상'} ~ {b.endsAt ? dt(b.endsAt) : ''}</td><td>{b.active ? 'ON' : 'OFF'}</td>
            <td><button className="ad-btn line sm" onClick={() => setEdit({ ...b })}>수정</button> <button className="ad-btn line sm" onClick={() => del(b.id)}>삭제</button></td></tr>
        ))}</tbody>
      </table>
      {edit && (
        <section className="ad-drawer">
          <button className="ad-x" onClick={() => setEdit(null)} aria-label="닫기">×</button>
          <h3>{edit.id ? '배너 수정' : '새 배너'} · {SLOTS.find((s) => s[0] === edit.slot)?.[1]}</h3>
          <label>제목<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
          <label>문구<input value={edit.copy ?? ''} onChange={(e) => setEdit({ ...edit, copy: e.target.value })} /></label>
          <label>연결할 화면 또는 URL<input value={edit.link ?? ''} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="/product/newyear_2027 또는 https://…" /></label>
          <label>이미지<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files?.[0])} /></label>
          {edit.imageUrl && <img className="ad-preview" src={edit.imageUrl} alt="" />}
          <div className="ad-row2">
            <label>시작<input type="datetime-local" value={edit.startsAt?.slice(0, 16) ?? ''} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value || null })} /></label>
            <label>끝<input type="datetime-local" value={edit.endsAt?.slice(0, 16) ?? ''} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value || null })} /></label>
          </div>
          <div className="ad-row2">
            <label>노출 순서<input type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: +e.target.value })} /></label>
            <label className="ad-check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />노출 ON</label>
          </div>
          <button className="ad-btn gold" onClick={save} disabled={!edit.title}>저장</button>
        </section>
      )}
    </>
  );
}

/* ---------- 5 결제·구독 ---------- */
const PAY_TABS = [['', '전체 결제'], ['money', '돈의 흐름'], ['year', '신년·월간'], ['love', '연애·궁합'], ['pass', 'AI 친구 이용권']] as const;
export function Payments() {
  const [kind, setKind] = useState('');
  const { data, err, reload } = useLoad(() => adminApi<any[]>(`/payments?limit=300&kind=${kind}`), [kind]);
  const { qs, ui } = usePeriod('month');
  const subs = useLoad(() => (kind === 'pass' ? adminApi<any>(`/subscriptions/stats?${qs}`) : Promise.resolve(null)), [kind, qs]);
  const refund = async (id: string) => { if (confirm('환불 처리할까요? (결제사 환불은 별도로 진행)')) { await adminApi(`/payments/${id}/refund`, { method: 'POST' }); reload(); } };
  const STATUS: Record<string, string> = { paid: '결제완료', pending: '대기', failed: '실패', cancelled: '취소', refunded: '환불' };
  return (
    <>
      <Head title="결제·구독 관리">
        <div className="ad-period">{PAY_TABS.map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}</div>
        <button className="ad-btn line" onClick={() => download(`/payments?limit=1000&kind=${kind}&format=csv`, 'payments.csv')}>CSV 받기</button>
      </Head>
      {kind === 'pass' && (
        <>
          {ui}
          {subs.data && <div className="ad-cards">
            <Card label="이용 중" value={subs.data.active} /><Card label="신규" value={subs.data.new} /><Card label="연장" value={subs.data.renewed} /><Card label="이용권 매출" value={won(subs.data.revenue)} />
          </div>}
        </>
      )}
      {err && <p className="ad-err">{err}</p>}
      <table className="ad-table">
        <thead><tr><th>결제일</th><th>회원</th><th>상품</th><th>결제금액</th><th>할인금액</th><th>결제수단</th><th>결제상태</th><th>환불상태</th><th /></tr></thead>
        <tbody>{data?.map((o) => (
          <tr key={o.id}><td>{dt(o.created_at)}</td><td>{o.user_name ?? o.user_id?.slice(0, 8)}</td><td>{o.title ?? o.product_id}</td><td>{won(o.amount)}</td><td>{won(o.discount)}</td>
            <td>{o.method ?? '-'} <span className="ad-muted">({o.channel})</span></td><td>{STATUS[o.status] ?? o.status}</td><td>{o.refund_status === 'done' ? '환불완료' : o.refund_status ?? '-'}</td>
            <td>{isSuper() && o.status === 'paid' && <button className="ad-btn line sm" onClick={() => refund(o.id)}>환불</button>}</td></tr>
        ))}</tbody>
      </table>
    </>
  );
}

/* ---------- 8 통계 분석 ---------- */
const CONTENT_KO: Record<string, string> = { today: '오늘의 운세', map: '사주지도', money: '돈의 흐름', path: '고민의 길', mbti: '사주×MBTI', money_wealth: '재물운', money_business: '사업운', money_invest: '투자운', money_estate: '부동산운' };
function Bars({ rows, label, value, fmt = (n: number) => n.toLocaleString('ko-KR') }: { rows: any[]; label: string; value: string; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => +r[value]));
  return <ul className="ad-bars">{rows.map((r, i) => <li key={i}><span>{r[label] ?? '(없음)'}</span><i style={{ width: `${(+r[value] / max) * 100}%` }} /><b>{fmt(+r[value])}</b></li>)}</ul>;
}
export function Stats() {
  const { qs, ui } = usePeriod('7d');
  const { data, err } = useLoad(() => adminApi<any>(`/stats?${qs}`), [qs]);
  const funnel = useMemo(() => {
    if (!data) return [];
    const f = data.funnel;
    return [['상품 보기', f.product_view ?? 0], ['결제창 열기', f.checkout_open ?? 0], ['결제 성공', f.pay_success ?? 0], ['취소', f.pay_cancel ?? 0], ['실패', f.pay_fail ?? 0]].map(([l, n]) => ({ l, n }));
  }, [data]);
  return (
    <>
      <Head title="통계 분석">{ui}</Head>
      {err && <p className="ad-err">{err}</p>}
      {data && (
        <div className="ad-grid">
          <section className="ad-box"><h3>콘텐츠별 조회수</h3><Bars rows={data.views.map((v: any) => ({ ...v, content: CONTENT_KO[v.content] ?? v.content }))} label="content" value="n" /></section>
          <section className="ad-box"><h3>공유수 (채널별)</h3><Bars rows={data.shares} label="channel" value="n" />
            <p className="ad-muted">공유 링크 열림 {data.links.opens.toLocaleString('ko-KR')}회 · 누적 클릭 {data.links.total_clicks.toLocaleString('ko-KR')}회</p></section>
          <section className="ad-box"><h3>가입·결제 전환</h3>
            <div className="ad-cards three"><Card label="방문자" value={data.conversion.visitors} /><Card label="간편가입" value={data.conversion.signups} sub={`${((data.conversion.signups / Math.max(1, data.conversion.visitors)) * 100).toFixed(1)}%`} /><Card label="결제 회원" value={data.conversion.payers} sub={`${((data.conversion.payers / Math.max(1, data.conversion.visitors)) * 100).toFixed(1)}%`} /></div>
            <h4>결제 퍼널</h4><Bars rows={funnel} label="l" value="n" /></section>
          <section className="ad-box"><h3>상품별 매출</h3><Bars rows={data.productRevenue} label="title" value="revenue" fmt={won} /></section>
          <section className="ad-box"><h3>유입 경로</h3><Bars rows={data.sources} label="source" value="visitors" /></section>
        </div>
      )}
    </>
  );
}

/* ---------- 9 관리자 계정 — 내 비밀번호 변경 · (최고관리자) 관리자 추가·삭제 ---------- */
export function Account() {
  const me = session();
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const sup = isSuper();
  const { data, err: listErr, reload } = useLoad(() => (sup ? adminApi<any[]>('/admins') : Promise.resolve([])), [sup]);
  const [add, setAdd] = useState({ email: '', password: '', role: 'super' });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(''); setErr('');
    try { await fn(); setMsg(ok); } catch (e) { setErr((e as Error).message); }
  };
  const changePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.again) { setErr('새 비밀번호 두 칸이 서로 달라요'); return; }
    void run(async () => { await adminApi('/me/password', { method: 'POST', json: { current: pw.current, next: pw.next } }); setPw({ current: '', next: '', again: '' }); }, '비밀번호를 바꿨어요. 다음 로그인부터 새 비밀번호를 쓰세요.');
  };
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => { await adminApi('/admins', { method: 'POST', json: add }); setAdd({ email: '', password: '', role: 'super' }); reload(); }, '관리자를 추가했어요. 처음 비밀번호를 그분께 따로 전해 주세요.');
  };
  const remove = (a: any) => {
    if (!window.confirm(`${a.email} 관리자를 삭제할까요? 바로 로그인이 막혀요.`)) return;
    void run(async () => { await adminApi(`/admins/${a.id}`, { method: 'DELETE' }); reload(); }, `${a.email} 관리자를 삭제했어요.`);
  };
  return (
    <>
      <Head title="관리자 계정" />
      {err && <p className="ad-err">{err}</p>}
      {msg && <p className="ad-ok">{msg}</p>}
      <div className="ad-grid">
        <section className="ad-box">
          <h3>내 비밀번호 바꾸기</h3>
          <p className="ad-muted">{me?.email} · 10자 이상, 다른 곳에서 쓰지 않는 비밀번호로 정해 주세요.</p>
          <form onSubmit={changePw}>
            <label>지금 비밀번호<input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
            <label>새 비밀번호<input type="password" autoComplete="new-password" minLength={10} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></label>
            <label>새 비밀번호 한 번 더<input type="password" autoComplete="new-password" minLength={10} value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} required /></label>
            <button className="ad-btn gold">비밀번호 바꾸기</button>
          </form>
        </section>
        {sup && (
          <section className="ad-box">
            <h3>관리자 목록</h3>
            {listErr && <p className="ad-err">{listErr}</p>}
            <table className="ad-table">
              <thead><tr><th>이메일</th><th>권한</th><th>만든 날</th><th /></tr></thead>
              <tbody>{(data ?? []).map((a) => (
                <tr key={a.id}><td>{a.email}</td><td>{a.role === 'super' ? '최고관리자' : '운영자'}</td><td>{dt(a.createdAt)}</td>
                  <td>{a.email === me?.email ? <span className="ad-muted">나</span> : <button className="ad-btn line sm" onClick={() => remove(a)}>삭제</button>}</td></tr>
              ))}</tbody>
            </table>
            <h4>관리자 추가</h4>
            <form onSubmit={create}>
              <label>이메일<input type="email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} required /></label>
              <label>처음 비밀번호(10자 이상, 첫 로그인 뒤 바꾸게 안내)<input type="text" minLength={10} value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} required /></label>
              <label>권한<select value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>
                <option value="super">최고관리자 — 전부(가격·환불·광고·관리자 계정 포함)</option>
                <option value="operator">운영자 — 조회, 배너·푸시·상품 문구만</option>
              </select></label>
              <button className="ad-btn gold">추가</button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}

/* ---------- 운영 핵심지표 ---------- */
export function Kpi() {
  const { qs, ui } = usePeriod('7d');
  const { data, err } = useLoad(() => adminApi<any>(`/kpi?${qs}`), [qs]);
  const R: [string, string, string][] = [['freeToPaid', '무료→유료 전환율', '활동 회원 중 결제한 비율'], ['friendUse', 'AI 사주친구 사용률', '활동 회원 중 대화한 비율'], ['memorySave', '기록 저장률', '활동 회원 중 기록을 남긴 비율'],
    ['pathDone', '고민의 길 완료율', '시작한 사람 중 결과까지 본 비율'], ['revisit7', '7일 재방문율', '가입 7일 뒤에도 들어온 비율'], ['revisit30', '30일 재방문율', '가입 30일 뒤에도 들어온 비율'], ['repurchase', '재결제율', '결제 회원 중 2번 이상 결제']];
  return (
    <>
      <Head title="운영 핵심지표">{ui}</Head>
      <p className="ad-muted">기능 개수보다 ‘다시 찾아오는 이유’와 ‘실제 결제 연결’을 기준으로 봐요.</p>
      {err && <p className="ad-err">{err}</p>}
      {data && (
        <>
          <div className="ad-cards">{R.map(([k, l, sub]) => <Card key={k} label={l} value={`${data.rates[k]}%`} sub={sub} />)}</div>
          <section className="ad-box"><h3>상품별 전환율 (상품 보기 → 결제)</h3>
            <table className="ad-table"><thead><tr><th>상품</th><th>본 사람</th><th>결제</th><th>전환율</th></tr></thead>
              <tbody>{data.byProduct.map((p: any) => <tr key={p.id}><td>{p.title}</td><td>{p.views}</td><td>{p.paid}</td><td>{p.rate}%</td></tr>)}</tbody></table>
          </section>
        </>
      )}
    </>
  );
}

/* ---------- 시장 노트(투자운 "달새김이 보는 올해의 시장 이야기") ---------- */
export function Market() {
  const { data, err, reload } = useLoad(() => adminApi<any[]>('/market'), []);
  const [edit, setEdit] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const save = async () => {
    try { await adminApi('/market', { method: 'POST', json: { ...edit, flow: edit.flowText ? String(edit.flowText).split(/[ ,]+/).filter(Boolean).map(Number) : null } }); setEdit(null); setMsg('저장했어요 — 투자운 화면에 바로 반영돼요'); reload(); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <>
      <Head title="시장 노트"><button className="ad-btn gold" onClick={() => setEdit({ year: new Date().getFullYear(), title: '', body: '', flowText: '', published: false })}>+ 새 노트</button></Head>
      <p className="ad-muted">투자운의 “달새김이 보는 올해의 시장 이야기”에 들어가요. 최신 뉴스·공식 자료를 요약해 쓰고, 특정 종목·매수·매도 권유는 쓰지 마세요. 월별 흐름(0~100, 12개)을 넣으면 ‘시장과 나의 흐름이 만나는 시기’ 그래프에 시장 선이 그려져요.</p>
      {msg && <p className="ad-ok">{msg}</p>}
      {err && <p className="ad-err">{err}</p>}
      <table className="ad-table"><thead><tr><th>연도</th><th>제목</th><th>공개</th><th>수정일</th><th /></tr></thead>
        <tbody>{data?.map((n) => <tr key={n.id}><td>{n.year}{n.month ? `.${n.month}` : ''}</td><td><b>{n.title}</b><br /><span className="ad-muted">{String(n.body).slice(0, 60)}…</span></td><td>{n.published ? '공개' : '숨김'}</td><td>{dt(n.updatedAt)}</td>
          <td><button className="ad-btn line sm" onClick={() => setEdit({ ...n, flowText: (n.flow ?? []).join(', ') })}>수정</button></td></tr>)}</tbody></table>
      {edit && (
        <section className="ad-drawer">
          <button className="ad-x" onClick={() => setEdit(null)} aria-label="닫기">×</button>
          <h3>{edit.id ? '시장 노트 수정' : '새 시장 노트'}</h3>
          <div className="ad-row2"><label>연도<input type="number" value={edit.year} onChange={(e) => setEdit({ ...edit, year: +e.target.value })} /></label><label>월(선택)<input type="number" value={edit.month ?? ''} onChange={(e) => setEdit({ ...edit, month: e.target.value ? +e.target.value : null })} /></label></div>
          <label>제목<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="예) 2026 하반기, 금리와 환율의 큰 흐름" /></label>
          <label>본문 (3~6문장)<textarea rows={6} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></label>
          <label>월별 시장 흐름 1~12월 (쉼표로 12개, 0~100)<input value={edit.flowText} onChange={(e) => setEdit({ ...edit, flowText: e.target.value })} placeholder="50, 52, 55, 60, 62, 58, 55, 50, 48, 52, 56, 60" /></label>
          <label>참고 자료(내부 기록용)<input value={edit.sources ?? ''} onChange={(e) => setEdit({ ...edit, sources: e.target.value })} /></label>
          <label className="ad-check"><input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />공개</label>
          <button className="ad-btn gold" onClick={save} disabled={!edit.title || !edit.body}>저장</button>
        </section>
      )}
    </>
  );
}
