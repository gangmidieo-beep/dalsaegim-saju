// 풀이 미리보기(R6 REQ-01·02·21) — 상품 카드 아래 버튼 1개 → 예시 인물로 만든 실제 결과 일부를 창으로.
// 표지 → 구성(실제 제공량) → 목차 → 본문 발췌(1개 장 + 다음 장 앞부분) → "이 상품 풀이 받기".
// 닫기: X·바깥·Esc·휴대폰 뒤로가기. 닫으면 원래 스크롤·초점으로 돌아간다.
import { useEffect, useRef, useState } from 'react';
import { API } from '../lib/api';
import { track } from '../lib/track';
import { PROD_IMG } from './ui';

type PV = {
  productId: string; title: string; who: string; intro: string; amount: string; summary?: { headline: string; lead: string } | null;
  toc: { part?: string; title: string }[]; excerpt: { no: number; title: string; say: string; body: string; locked: boolean }[]; note: string;
};

export function PreviewButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="pv-btn" onClick={() => { setOpen(true); track('content_view', { product: productId, what: 'preview' }); }}>
        <span className="pv-moon" aria-hidden />풀이 미리보기<span className="pv-chev" aria-hidden>›</span>
      </button>
      {open && <PreviewSheet productId={productId} onClose={() => setOpen(false)} />}
    </>
  );
}

function PreviewSheet({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [pv, setPv] = useState<PV | null>(null);
  const [err, setErr] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const y = window.scrollY;
    document.body.style.overflow = 'hidden';
    history.pushState({ pv: 1 }, '');
    const onPop = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') history.back(); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    fetch(`${API}/products/${productId}/preview`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('미리보기를 불러오지 못했어요')))).then(setPv).catch((e) => setErr(e.message));
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.scrollTo(0, y);
      prevFocus?.focus?.();
    };
  }, [productId]);
  const close = () => history.back(); // 뒤로가기와 같은 길로 닫기(기록이 쌓이지 않게)
  const buy = () => { close(); setTimeout(() => document.querySelector<HTMLAnchorElement>('.pd-cta .btn.primary')?.focus(), 50); };
  let lastPart = '';
  return (
    <div className="pv-wrap" role="dialog" aria-modal="true" aria-labelledby="pv-t" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="pv-sheet">
        <header className="pv-top">
          <b id="pv-t">풀이 미리보기</b>
          <button ref={closeRef} className="pv-x" aria-label="미리보기 닫기" onClick={close}>✕</button>
        </header>
        <div className="pv-body">
          {err && <p className="muted">{err}</p>}
          {!pv && !err && <p className="muted">불러오는 중…</p>}
          {pv && (<>
            <p className="pv-tag">실제 결과물 일부 · 예시</p>
            {PROD_IMG.has(pv.productId) ? (
              <figure className="pv-cover-img">
                <img src={`/img/cover/${pv.productId}.webp`} alt={`${pv.title} 결과지 표지 예시`} width={720} height={1019} />
                <figcaption>결과지 표지 예시 · 실제 결과지에는 내 이름과 생년월일이 들어가요</figcaption>
              </figure>
            ) : (
              <section className="pv-cover">
                <small>DALSAEGIM · READING</small>
                <h2>{pv.title}</h2>
                <p className="pv-who">{pv.who} 님을 위한 풀이</p>
                <p>{pv.intro}</p>
              </section>
            )}
            <p className="pv-amount"><b>구성</b> {pv.amount}</p>
            {pv.summary && <section className="pv-card"><small>핵심 요약</small><h3>{pv.summary.headline}</h3><p>{pv.summary.lead}</p></section>}
            {pv.toc.length > 0 && (
              <section className="pv-card">
                <small>목차</small>
                <ol className="pv-toc">{pv.toc.map((t, i) => { const head = t.part && t.part !== lastPart; lastPart = t.part ?? ''; return <li key={i}>{head && <b className="pv-part">{t.part}</b>}<span>{String(i + 1).padStart(2, '0')}</span>{t.title}</li>; })}</ol>
              </section>
            )}
            {pv.excerpt.map((x) => (
              <section key={x.no} className={`pv-card${x.locked ? ' locked' : ''}`}>
                <small>{pv.productId === 'friend_pass' ? x.title : `${String(x.no).padStart(2, '0')} · 본문 발췌`}</small>
                {pv.productId !== 'friend_pass' && <h3>{x.title}</h3>}
                <p className="pv-say">{x.say}</p>
                {x.body.split(/\n{2,}/).map((t, k) => <p key={k}>{t}</p>)}
                {x.locked && <div className="pv-lock">이어지는 내용은 내 사주로 받아 보세요</div>}
              </section>
            ))}
            <p className="pv-note">{pv.note}</p>
          </>)}
        </div>
        <footer className="pv-foot"><button className="btn primary" onClick={buy}>이 상품 풀이 받기 ›</button></footer>
      </div>
    </div>
  );
}
