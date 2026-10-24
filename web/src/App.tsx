import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ToastProvider, TabBar } from './components/ui';
import { track } from './lib/track';
import { apiAuth } from './lib/api';
import { clearPending, pendingPay } from './platform/payments';
import { ShareProvider } from './components/share';
import Home from './pages/Home';
import ProfileNew from './pages/ProfileNew';
import Today from './pages/Today';
import Love from './pages/Love';
import All from './pages/All';
import SajuMap from './pages/SajuMap';
import PathPage from './pages/Path';
import Friend from './pages/Friend';
import Records from './pages/Records';
import Timeline from './pages/Timeline';
import { MoneyHub, MoneyResult } from './pages/Money';
import Mbti from './pages/Mbti';
import { Checkout, PayReturn, ProductDetail, ReadingPage } from './pages/Product';
import Me, { AuthCallback } from './pages/Me';
import { Privacy, Refund, Terms } from './pages/Legal';
import { Mailbox, NewLetter, TodayLetter } from './pages/Letter';
import CharmPage from './pages/Charm';

const Admin = lazy(() => import('./admin/Admin')); // 관리자는 따로 불러온다

// 하단 탭을 보여 주는 화면(홈·기록·타임라인·마이)
const TAB = ['/', '/all', '/records', '/box', '/me', '/timeline'];

export function App() {
  const loc = useLocation();
  // R6 REQ-23 — 뒤로가기(POP)면 보던 위치로, 새 화면(PUSH)이면 맨 위로
  const navType = useNavigationType();
  useEffect(() => { try { history.scrollRestoration = 'manual'; } catch { /* 일부 브라우저 */ } }, []);
  // 결제창에서 '돌아가기'를 누르지 않고 사이트로 다시 들어온 경우 — 결제가 끝났으면 풀이로 바로 안내
  const nav = useNavigate();
  useEffect(() => {
    const pend = pendingPay(120);
    if (!pend || /^\/(pay\/return|checkout|admin)/.test(loc.pathname)) return;
    apiAuth<{ status: string }>(`/orders/${pend.orderId}`).then((o) => {
      if (o?.status === 'paid') nav(`/pay/return?order=${pend.orderId}`, { replace: true });
      else if (o && o.status !== 'pending') clearPending();
    }).catch(() => {});
  }, []);
  useEffect(() => {
    const key = `scroll:${loc.key}`;
    if (navType === 'POP') {
      let y = 0;
      try { y = Number(sessionStorage.getItem(key) ?? 0); } catch { /* 저장소 막힘 */ }
      // 늦게 그려지는 화면(지연 로딩·목록)도 있어 높이가 찰 때까지 잠깐 다시 시도
      let n = 0;
      const go = () => { window.scrollTo(0, y); if (Math.abs(window.scrollY - y) > 2 && n++ < 20) setTimeout(go, 50); };
      requestAnimationFrame(go);
    } else window.scrollTo(0, 0);
    const save = () => { try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch { /* 저장소 막힘 */ } };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [loc.key]);
  useEffect(() => {
    track('page_view', { path: loc.pathname });
    if (new URLSearchParams(loc.search).get('utm_source') === 'share') track('share_link_open', { path: loc.pathname });
  }, [loc.pathname]);
  if (loc.pathname.startsWith('/admin'))
    return <Suspense fallback={null}><Routes><Route path="/admin/*" element={<Admin />} /></Routes></Suspense>;
  return (
    <ToastProvider>
      <ShareProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/new" element={<ProfileNew />} />
          <Route path="/profile/:id/edit" element={<ProfileNew />} />
          <Route path="/today" element={<Today />} />
          <Route path="/love" element={<Love />} />
          <Route path="/all" element={<All />} />
          <Route path="/map" element={<SajuMap />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/friend" element={<Friend />} />
          <Route path="/records" element={<Records />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/money" element={<MoneyHub />} />
          <Route path="/money/:kind" element={<MoneyResult />} />
          <Route path="/mbti" element={<Mbti />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/pay/return" element={<PayReturn />} />
          <Route path="/reading/:orderId" element={<ReadingPage />} />
          <Route path="/letter" element={<TodayLetter />} />
          <Route path="/letter/new" element={<NewLetter />} />
          <Route path="/mailbox" element={<Mailbox />} />
          <Route path="/box" element={<Mailbox box />} />
          <Route path="/mailbox/:id" element={<Mailbox />} />
          <Route path="/charm" element={<CharmPage />} />
          <Route path="/me" element={<Me />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {TAB.includes(loc.pathname) && <TabBar />}
      </div>
      </ShareProvider>
    </ToastProvider>
  );
}
