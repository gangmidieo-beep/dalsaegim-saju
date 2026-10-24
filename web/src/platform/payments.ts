// 결제 — PayApp(카드·간편결제·계좌이체·무통장·휴대폰). 서버가 상품 가격으로 금액을 정한다. 서버가 MOCK 이면 바로 결제 완료.
import { apiAuth, syncProfiles } from '../lib/api';
import brandCfg from '../../../brand.config.json';

export type PayResult = { status: 'paid' | 'failed' | 'redirect'; orderId: string; message?: string; code?: string; payUrl?: string };
/** 결제창으로 떠난 주문(돌아오기를 못 눌렀거나 앱 전환 뒤 돌아온 경우 이어서 확인) */
export function pendingPay(maxMin = 120): { orderId: string; productId: string; at: number; payUrl?: string } | null {
  try { const v = JSON.parse(localStorage.getItem(PENDING) || 'null'); return v?.orderId && Date.now() - (v.at ?? 0) < maxMin * 60_000 ? v : null; } catch { return null; }
}
export const clearPending = () => { try { localStorage.removeItem(PENDING); } catch { /* */ } };
// 결제수단 — brand.config.json payMethods (PayApp 가맹 후 열린 수단만 on)
export type PayMethod = { id: string; group: string; label: string; open: string; on: boolean; desc?: string; mark?: string; color?: string; ink?: string };
const PM = (brandCfg as any).payMethods as { groups: [string, string][]; list: PayMethod[] };
export const PAY_METHODS: PayMethod[] = PM.list.filter((m) => m.on);
export const PAY_GROUPS = PM.groups.filter(([g]) => PAY_METHODS.some((m) => m.group === g));
export const METHODS = PAY_METHODS.map((m) => ({ id: m.id, label: m.label }));
export const methodOf = (id: string) => PAY_METHODS.find((m) => m.id === id);
// 카카오톡·인스타그램 안 브라우저는 카드 결제창이 막혀서 카카오페이로 연다
export const isInAppBrowser = () => /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NAVER\(inapp/i.test(navigator.userAgent);
export const PENDING = 'dalsaegim-pay-pending';

export async function purchase(productId: string, profileIds: string[], opts: { method?: string; phone?: string; meta?: Record<string, string> } = {}): Promise<PayResult> {
  try {
    await syncProfiles(profileIds);
    const o = await apiAuth<{ id: string; amount: number; payUrl?: string; status: string }>('/orders', {
      method: 'POST',
      json: { productId, profileId: profileIds.join('+') || undefined, method: opts.method, phone: opts.phone, inApp: isInAppBrowser(), meta: opts.meta },
    });
    if (o.status === 'paid') return { status: 'paid', orderId: o.id };
    if (!o.payUrl) return { status: 'failed', orderId: o.id, message: '결제창을 열지 못했어요' };
    try { localStorage.setItem(PENDING, JSON.stringify({ orderId: o.id, productId, at: Date.now(), payUrl: o.payUrl })); } catch { /* */ }
    location.assign(o.payUrl); // PayApp 결제창 → 끝나면 /pay/return?order= 으로 돌아옴
    return { status: 'redirect', orderId: o.id, payUrl: o.payUrl };
  } catch (e: any) {
    return { status: 'failed', orderId: '', message: e.message, code: e.code };
  }
}

const PHONE = 'dalsaegim-pay-phone';
export const savedPhone = () => { try { return localStorage.getItem(PHONE) ?? ''; } catch { return ''; } };
export const savePhone = (v: string) => { try { localStorage.setItem(PHONE, v); } catch { /* */ } };
export const phoneOk = (v: string) => /^01[016789]\d{7,8}$/.test(v.replace(/\D/g, ''));
