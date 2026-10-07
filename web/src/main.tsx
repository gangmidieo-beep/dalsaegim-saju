import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/fonts.css';
import './styles/app.css';
import { App } from './App';
import { useApp } from './store/app';
import { apiAuth, guestToken } from './lib/api';

// 이용권 여부는 서버가 기준(만료·환불 반영). 토큰이 이미 있는 사용자만 조회
if (useApp.getState().account?.token || guestToken()) {
  apiAuth<{ premium: boolean }>('/me/entitlements').then((e) => useApp.getState().setPass(e.premium)).catch(() => {});
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
