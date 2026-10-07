// 결제 — PayApp(카드·카카오페이·네이버페이). 서버가 상품 가격으로 금액을 정한다. 서버가 MOCK 이면 바로 결제 완료.
import { apiAuth, syncProfiles } from '../lib/api';

export type PayResult = { status: 'paid' | 'failed' | 'redirect'; orderId: string; message?: string; code?: string };
export const METHODS = [
  { id: 'card', label: '신용·체크카드' },
  { id: 'kakaopay', label: '카카오페이' },
  { id: 'naverpay', label: '네이버페이' },
];
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
    try { localStorage.setItem(PENDING, JSON.stringify({ orderId: o.id, productId, at: Date.now() })); } catch { /* */ }
    location.assign(o.payUrl); // PayApp 결제창 → 끝나면 /pay/return?order= 으로 돌아옴
    return { status: 'redirect', orderId: o.id };
  } catch (e: any) {
    return { status: 'failed', orderId: '', message: e.message, code: e.code };
  }
}

const PHONE = 'dalsaegim-pay-phone';
export const savedPhone = () => { try { return localStorage.getItem(PHONE) ?? ''; } catch { return ''; } };
export const savePhone = (v: string) => { try { localStorage.setItem(PHONE, v); } catch { /* */ } };
export const phoneOk = (v: string) => /^01[016789]\d{7,8}$/.test(v.replace(/\D/g, ''));
