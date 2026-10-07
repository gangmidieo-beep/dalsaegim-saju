// 서버 통신 — 로그인 토큰, 없으면 기기 게스트 토큰. 회원가입 없이도 기록·결제가 되고, 로그인하면 합쳐진다.
import { useApp, type Profile } from '../store/app';

export const API = __API_ORIGIN__ || (import.meta.env.DEV ? 'http://localhost:8791' : '');
const GUEST = 'dalsaegim-guest';
const readGuest = (): { token?: string; deviceId?: string } => { try { return JSON.parse(localStorage.getItem(GUEST) || '{}') ?? {}; } catch { return {}; } };
export const guestToken = () => readGuest().token;
export const clearGuest = () => { try { const g = readGuest(); localStorage.setItem(GUEST, JSON.stringify({ deviceId: g.deviceId })); } catch { /* */ } };

let guestP: Promise<string> | null = null;
export async function userToken(): Promise<string> {
  const acc = useApp.getState().account;
  if (acc?.token) return acc.token;
  const g = readGuest();
  if (g.token) return g.token;
  guestP ??= (async () => {
    const r = await fetch(`${API}/auth/guest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: g.deviceId, platform: 'web' }) });
    const j = await r.json();
    try { localStorage.setItem(GUEST, JSON.stringify({ token: j.token, deviceId: j.deviceId })); } catch { /* */ }
    return j.token as string;
  })().finally(() => { guestP = null; });
  return guestP;
}
export class ApiError extends Error { code?: string; status?: number; }
export async function apiAuth<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const token = await userToken();
  const r = await fetch(`${API}${path}`, {
    ...init,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init.headers },
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && j.code === 'deleted') { useApp.getState().setAccount(null); clearGuest(); }
  if (!r.ok) throw Object.assign(new ApiError(j.error ?? '잠시 후 다시 시도해 주세요'), { code: j.code, status: r.status });
  return j as T;
}
export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}
// 사주를 서버에도 저장(같은 id) — 실패해도 화면은 계속
export async function syncProfile(p: Profile, isMain = false) {
  return apiAuth('/profiles', { method: 'POST', json: { ...p, isMain } }).catch(() => null);
}
export async function syncProfiles(ids: string[]) {
  const { profiles, mainId } = useApp.getState();
  for (const id of ids) { const x = profiles.find((p) => p.id === id); if (x) await syncProfile(x, x.id === mainId); }
}
