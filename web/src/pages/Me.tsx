// 마이 — 내 사주·가족 사주, 구매한 풀이, AI 사주친구 이용권, 로그인, 설정, 약관·탈퇴
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/app';
import { API, apiAuth, clearGuest, guestToken } from '../lib/api';
import { Foot, Sheet, Top, won, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';

type Order = { id: string; productId: string; title: string; amount: number; status: string; createdAt: string };
const PROVIDERS = [
  { id: 'kakao', label: '카카오로 계속하기', bg: '#FEE500', fg: '#191919' },
  { id: 'naver', label: '네이버로 계속하기', bg: '#03C75A', fg: '#fff' },
  { id: 'google', label: 'Google로 계속하기', bg: '#fff', fg: '#1E2033' },
];

export function LoginButtons({ back = '/me' }: { back?: string }) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => { fetch(`${API}/auth/providers`).then((r) => r.json()).then((j) => setList(j.providers)).catch(() => {}); }, []);
  return (
    <div className="stack">
      {PROVIDERS.filter((p) => list.includes(p.id)).map((p) => (
        <a key={p.id} className="btn" style={{ background: p.bg, color: p.fg, boxShadow: p.id === 'google' ? 'inset 0 0 0 1.5px var(--line-2)' : undefined }}
          href={`${API}/auth/${p.id}/start?redirect=${encodeURIComponent(location.origin + back)}`} onClick={() => track('login', { provider: p.id })}>{p.label}</a>
      ))}
      {list.length === 0 && <p className="faint center">간편 로그인을 준비하고 있어요</p>}
    </div>
  );
}

export function AuthCallback() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const setAccount = useApp((s) => s.setAccount);
  const toast = useToast();
  useEffect(() => {
    const token = sp.get('token');
    if (!token) { toast('로그인하지 못했어요'); nav('/me', { replace: true }); return; }
    const g = guestToken();
    setAccount({ provider: (sp.get('provider') as any) ?? 'mock', id: sp.get('uid') ?? '', name: sp.get('name') ?? '', token });
    (async () => {
      if (g) { await fetch(`${API}/auth/merge`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ guestToken: g }) }).catch(() => {}); clearGuest(); }
      toast('로그인했어요. 기록이 이어져요');
      nav(sp.get('back') ?? '/me', { replace: true });
    })();
  }, []);
  return <main className="screen center" style={{ paddingTop: 120 }}>로그인 중…</main>;
}

export default function Me() {
  const { profiles, mainId, setMain, removeProfile, account, setAccount, pass } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [login, setLogin] = useState(false);
  const [bye, setBye] = useState(false);
  const [memAI, setMemAI] = useState(true);
  const toast = useToast();
  const nav = useNavigate();
  useEffect(() => {
    apiAuth<Order[]>('/me/orders').then(setOrders).catch(() => {});
    apiAuth<{ user: { memoryAI: boolean } }>('/me').then((r) => setMemAI(r.user.memoryAI)).catch(() => {});
  }, [account?.token]);
  const del = async (id: string) => {
    if (!confirm('이 사주를 지울까요?')) return;
    removeProfile(id);
    await apiAuth(`/profiles/${id}`, { method: 'DELETE' }).catch(() => {});
  };
  const toggleMem = async () => { const v = !memAI; setMemAI(v); await apiAuth('/me/settings', { method: 'POST', json: { memoryAI: v } }).catch(() => {}); toast(v ? 'AI 사주친구가 기록을 참고해요' : '이제 기록을 참고하지 않아요'); };
  const leave = async () => {
    await apiAuth('/me/delete', { method: 'POST', json: {} }).catch(() => {});
    localStorage.removeItem('dalsaegim'); clearGuest(); setAccount(null);
    toast('탈퇴했어요. 그동안 고마웠어요'); nav('/', { replace: true }); location.reload();
  };
  return (
    <>
      <Top title="마이" back={false} />
      <main className="screen">
        <section className="card between" style={{ display: 'flex' }}>
          <div><b>{account ? `${account.name || '회원'} 님` : '로그인 없이 이용 중'}</b><div className="faint">{account ? `${account.provider === 'kakao' ? '카카오' : account.provider === 'naver' ? '네이버' : account.provider === 'google' ? 'Google' : ''} 계정 연결됨` : '로그인하면 다른 기기에서도 기록·풀이가 이어져요'}</div></div>
          {account ? <button className="btn line sm" onClick={() => { setAccount(null); toast('로그아웃했어요'); }}>로그아웃</button> : <button className="btn primary sm" onClick={() => setLogin(true)}>로그인</button>}
        </section>

        <section className="mt20">
          <div className="between"><h2 className="h3">사주</h2><Link to="/profile/new" className="link">+ 추가</Link></div>
          <div className="list mt12">
            {profiles.length === 0 && <Link to="/profile/new" className="li"><div className="grow"><div className="t">내 사주 입력하기</div><div className="s">생년월일만 있으면 바로 시작해요</div></div><I.right className="chev" /></Link>}
            {profiles.map((p) => (
              <div key={p.id} className="li">
                <button aria-label="대표 사주로" onClick={() => setMain(p.id)} style={{ color: p.id === mainId ? 'var(--gold-2)' : 'var(--line-2)', fontSize: 18 }}>★</button>
                <div className="grow"><div className="t">{p.name} <span className="faint">· {p.relation ?? '나'}{p.mbti ? ` · ${p.mbti}` : ''}</span></div><div className="s">{p.calendar === 'lunar' ? '음력' : '양력'} {p.year}.{p.month}.{p.day}{p.hour == null ? ' · 시간 모름' : ''}</div></div>
                <Link to={`/profile/${p.id}/edit`} className="icon-btn" aria-label="고치기"><I.edit size={18} /></Link>
                <button className="icon-btn" aria-label="지우기" onClick={() => del(p.id)}><I.close size={18} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt20">
          <h2 className="h3">나의 달빛 우체통</h2>
          <div className="list mt12">
            <Link to="/mailbox" className="li"><div className="grow"><div className="t">받은 달빛 편지·황금 부적</div><div className="s">다시 읽고, 다시 듣고, 다시 저장해요 · 카카오톡 도착 알림 설정</div></div><I.right className="chev" /></Link>
            <Link to="/letter/new" className="li"><div className="grow"><div className="t">나만의 달빛 편지 받기</div><div className="s">상담사가 이름을 불러 주며 쓰는 편지</div></div><I.right className="chev" /></Link>
          </div>
        </section>

        <section className="mt20">
          <h2 className="h3">구매한 풀이</h2>
          <div className="list mt12">
            {orders.length === 0 && <div className="li faint">아직 받은 풀이가 없어요</div>}
            {orders.map((o) => (
              <Link key={o.id} to={o.productId === 'friend_pass' ? '/friend' : `/reading/${o.id}`} className="li">
                <div className="grow"><div className="t">{o.title}</div><div className="s">{new Date(o.createdAt).toLocaleDateString('ko-KR')} · {won(o.amount)}{o.status === 'refunded' ? ' · 환불됨' : ''}</div></div><I.right className="chev" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt20">
          <h2 className="h3">설정</h2>
          <div className="list mt12">
            <div className="li"><div className="grow"><div className="t">AI 사주친구 이용권</div><div className="s">{pass ? '이용 중 · 하루 제한 없음' : '하루 3번 무료'}</div></div>{!pass && <Link to="/product/friend_pass" className="link">알아보기</Link>}</div>
            <button className="li" style={{ width: '100%', textAlign: 'left' }} onClick={toggleMem}>
              <div className="grow"><div className="t">AI 사주친구가 내 기록 참고하기</div><div className="s">최근 기록 5개를 참고해 더 나에게 맞게 답해요</div></div>
              <span className={`chip sm${memAI ? ' on' : ''}`}>{memAI ? '켜짐' : '꺼짐'}</span>
            </button>
            <Link to="/terms" className="li"><div className="grow t">이용약관</div><I.right className="chev" /></Link>
            <Link to="/privacy" className="li"><div className="grow t">개인정보처리방침</div><I.right className="chev" /></Link>
            <Link to="/refund" className="li"><div className="grow t">환불정책</div><I.right className="chev" /></Link>
            <button className="li faint" style={{ width: '100%', textAlign: 'left' }} onClick={() => setBye(true)}>회원 탈퇴</button>
          </div>
        </section>
      </main>
      <Foot />
      <Sheet open={login} onClose={() => setLogin(false)} label="로그인">
        <h2 className="h2">로그인하고 기록 이어 가기</h2>
        <p className="muted small mt8">지금까지의 사주·기록·풀이가 그대로 합쳐져요.</p>
        <div className="mt16"><LoginButtons /></div>
      </Sheet>
      <Sheet open={bye} onClose={() => setBye(false)} label="회원 탈퇴">
        <h2 className="h2">정말 탈퇴할까요?</h2>
        <p className="muted small mt8">사주·상담·기록·풀이가 바로 지워지고 되돌릴 수 없어요. 결제 기록은 전자상거래법에 따라 5년 동안 개인 식별 정보 없이 보관돼요.</p>
        <button className="btn primary mt16" onClick={leave}>탈퇴하기</button>
        <button className="btn line mt8" onClick={() => setBye(false)}>취소</button>
      </Sheet>
    </>
  );
}
