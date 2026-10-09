// 이벤트 추적 — MOCK_MODE 면 localStorage 로그만, 서버 연결 시 5초마다(또는 화면을 떠날 때) /events 로 묶어서 보낸다.
// 첫 방문의 utm·referrer 는 기억해 두었다가 모든 이벤트에 붙인다(유입 경로 통계).
import { API } from './api';
export type EventName = 'product_view' | 'checkout_open' | 'pay_start' | 'pay_success' | 'pay_cancel' | 'pay_fail' | 'share' | 'page_view'
  | 'share_click' | 'share_link_open' | 'content_view' | 'login' | 'profile_saved' | 'path_start' | 'path_done' | 'friend_send' | 'memory_save' | 'memory_skip' | 'memory_feedback' | 'lucky_reroll' | 'persona_pick'
  | 'letter_today_open' | 'letter_make' | 'letter_listen' | 'charm_make' | 'charm_save';
const KEY = 'dalsaegim-events';
const MOCK = !API;

const session = (() => {
  try {
    const s = sessionStorage.getItem('dalsaegim-session') ?? Math.random().toString(36).slice(2);
    sessionStorage.setItem('dalsaegim-session', s);
    return s;
  } catch { return 'nosession'; }
})();
const attribution = (() => {
  try {
    const saved = localStorage.getItem('dalsaegim-utm');
    if (saved) return JSON.parse(saved);
    const q = new URLSearchParams(location.search);
    const a = { utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'), referrer: document.referrer || null };
    localStorage.setItem('dalsaegim-utm', JSON.stringify(a));
    return a;
  } catch { return {}; }
})();

const queue: Record<string, unknown>[] = [];
function flush() {
  if (!queue.length || MOCK || !API) return;
  const events = queue.splice(0, 50);
  const token = (() => { try { return JSON.parse(localStorage.getItem('dalsaegim') || '{}').state?.account?.token ?? JSON.parse(localStorage.getItem('dalsaegim-guest') || '{}').token; } catch { return undefined; } })();
  fetch(`${API}/events`, { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ events }) }).catch(() => { queue.unshift(...events); });
}
if (!MOCK && typeof window !== 'undefined') {
  setInterval(flush, 5000);
  addEventListener('pagehide', flush);
}

export function track(name: EventName, props: Record<string, unknown> = {}) {
  const e = { name, props, at: new Date().toISOString() };
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    list.push(e);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-500)));
  } catch { /* 저장 공간 없음 — 무시 */ }
  queue.push({ ...e, sessionId: session, platform: 'web', ...attribution });
  if (import.meta.env.DEV) console.debug('[track]', name, props);
}
