import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider, TabBar } from './components/ui';
import { track } from './lib/track';
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

const Admin = lazy(() => import('./admin/Admin')); // 관리자는 따로 불러온다

// 하단 탭을 보여 주는 화면(홈·기록·타임라인·마이)
const TAB = ['/', '/records', '/timeline', '/me'];

export function App() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    track('page_view', { path: loc.pathname });
    if (new URLSearchParams(loc.search).get('utm_source') === 'share') track('share_link_open', { path: loc.pathname });
  }, [loc.pathname]);
  if (loc.pathname.startsWith('/admin'))
    return <Suspense fallback={null}><Routes><Route path="/admin/*" element={<Admin />} /></Routes></Suspense>;
  return (
    <ToastProvider>
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
          <Route path="/me" element={<Me />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {TAB.includes(loc.pathname) && <TabBar />}
      </div>
    </ToastProvider>
  );
}
