// 사주 입력 (시안 2) — 1/3 한 화면에 이름·생년월일·태어난 시간·성별 → 2/3 간편 로그인(선택) → 3/3 사주 새기는 중.
// 회원가입 없이도 시작할 수 있다(로그인은 기록을 다른 기기에서 이어 보기용).
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LUNAR_YEAR_MAX, LUNAR_YEAR_MIN, leapMonthOf } from '@dalsaegim/engine';
import { newId, useApp, type Profile } from '../store/app';
import { syncProfile } from '../lib/api';
import { Moon, Top, useToast } from '../components/ui';
import { LoginButtons } from './Me';
import { track } from '../lib/track';

// 대표 시각: 각 시진 안의 짝수 시(자시 0시, 축시 2시 …) — 30분 경계 표기와 엔진 경계 모두에 들어간다
const HOURS = [
  { h: 0, n: '자시', t: '밤 11:30 ~ 새벽 1:29' }, { h: 2, n: '축시', t: '새벽 1:30 ~ 3:29' }, { h: 4, n: '인시', t: '새벽 3:30 ~ 5:29' }, { h: 6, n: '묘시', t: '오전 5:30 ~ 7:29' },
  { h: 8, n: '진시', t: '오전 7:30 ~ 9:29' }, { h: 10, n: '사시', t: '오전 9:30 ~ 11:29' }, { h: 12, n: '오시', t: '오전 11:30 ~ 오후 1:29' }, { h: 14, n: '미시', t: '오후 1:30 ~ 3:29' },
  { h: 16, n: '신시', t: '오후 3:30 ~ 5:29' }, { h: 18, n: '유시', t: '오후 5:30 ~ 7:29' }, { h: 20, n: '술시', t: '오후 7:30 ~ 9:29' }, { h: 22, n: '해시', t: '밤 9:30 ~ 11:29' },
];
const RELS = ['나', '연인', '배우자', '가족', '친구'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: Math.min(LUNAR_YEAR_MAX, THIS_YEAR) - LUNAR_YEAR_MIN + 1 }, (_, i) => Math.min(LUNAR_YEAR_MAX, THIS_YEAR) - i);

export default function ProfileNew() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { profiles, saveProfile, account } = useApp();
  const editing = profiles.find((p) => p.id === id);
  const [first] = useState(() => profiles.length === 0); // 저장 뒤에도 첫 입력 흐름(1/3→3/3)을 유지
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Profile>(editing ?? { id: newId(), name: '', gender: 'F', year: 1997, month: 0, day: 0, calendar: 'solar', leap: false, hour: null, relation: first ? '나' : sp.get('rel') ?? '연인' });
  const [unknown, setUnknown] = useState(editing ? editing.hour == null : false);
  const toast = useToast();
  const nav = useNavigate();
  const set = (p: Partial<Profile>) => setF((x) => ({ ...x, ...p }));
  const [next] = useState(() => sp.get('next') ?? (first ? '/map' : '/me'));

  const { year: y, month: m, day: d } = f;
  const days = f.calendar === 'lunar' ? 30 : y && m ? new Date(y, m, 0).getDate() : 31;
  const dateOk = y >= LUNAR_YEAR_MIN && m >= 1 && m <= 12 && d >= 1 && d <= days;
  const hasLeap = f.calendar === 'lunar' && dateOk && leapMonthOf(y) === m;
  const ready = !!f.name.trim() && dateOk && (unknown || f.hour != null);

  const save = () => {
    const p: Profile = { ...f, name: f.name.trim(), leap: hasLeap && f.leap, hour: unknown ? null : f.hour };
    const makeMain = first || p.relation === '나';
    saveProfile(p, makeMain);
    void syncProfile(p, makeMain);
    track('profile_saved', { rel: p.relation, timeKnown: p.hour != null });
    return p;
  };
  const submit = () => {
    if (editing || !first || account) { const p = save(); toast(editing ? '사주를 고쳤어요' : `${p.name} 님의 사주를 새겼어요`); if (editing || !first) { nav(next, { replace: true }); return; } setStep(2); return; }
    save(); setStep(1);
  };
  useEffect(() => {
    if (step !== 2) return;
    const t = setTimeout(() => nav(next, { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <>
      <Top title={editing ? '사주 고치기' : '사주 입력'} />
      <main className="screen">
        {!editing && first && <div className="prog" aria-label={`3단계 중 ${step + 1}단계`}><div className="bar"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>{step + 1}/3</div>}
        {step === 0 && (
          <section className="fade-in mt16">
            <h2 className="h2">{first ? <>당신의 사주를<br />입력해 주세요.</> : '누구의 사주인가요?'}</h2>
            <p className="muted small mt8">정확한 사주 분석을 위해<br />생년월일과 태어난 시간을 입력해 주세요.</p>
            <label className="field"><span>이름</span><input className="input" value={f.name} maxLength={12} onChange={(e) => set({ name: e.target.value })} placeholder="홍길동" /></label>
            {!first && <div className="field"><span>관계</span><div className="chips">{RELS.map((r) => <button key={r} className={`chip${f.relation === r ? ' on' : ''}`} onClick={() => set({ relation: r })}>{r}</button>)}</div></div>}
            <div className="field">
              <div className="between" style={{ marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>생년월일</span>
                <div className="seg" style={{ padding: 3, width: 130 }}>{([['solar', '양력'], ['lunar', '음력']] as const).map(([v, l]) => <button key={v} style={{ minHeight: 30, fontSize: 13 }} className={f.calendar === v ? 'on' : ''} onClick={() => set({ calendar: v })}>{l}</button>)}</div>
              </div>
              <div className="sel-row">
                <select className="input" aria-label="태어난 해" value={y || ''} onChange={(e) => set({ year: +e.target.value })}>{YEARS.map((v) => <option key={v} value={v}>{v}년</option>)}</select>
                <select className="input" aria-label="태어난 달" value={m || ''} onChange={(e) => set({ month: +e.target.value })}><option value="">월</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월</option>)}</select>
                <select className="input" aria-label="태어난 날" value={d || ''} onChange={(e) => set({ day: +e.target.value })}><option value="">일</option>{Array.from({ length: days }, (_, i) => <option key={i} value={i + 1}>{i + 1}일</option>)}</select>
              </div>
              {hasLeap && <label className="check mt8"><input type="checkbox" checked={f.leap} onChange={(e) => set({ leap: e.target.checked })} />윤달이에요</label>}
            </div>
            <div className="field">
              <span>태어난 시간</span>
              <select className="input" aria-label="태어난 시간" value={unknown ? 'x' : f.hour ?? ''} onChange={(e) => { if (e.target.value === 'x') { setUnknown(true); set({ hour: null }); } else { setUnknown(false); set({ hour: +e.target.value }); } }}>
                <option value="">시간을 골라 주세요</option>
                {HOURS.map((x) => <option key={x.h} value={x.h}>{x.t} ({x.n})</option>)}
                <option value="x">태어난 시간을 몰라요</option>
              </select>
            </div>
            <div className="field"><span>성별</span><div className="seg pink">{([['F', '여성'], ['M', '남성']] as const).map(([v, l]) => <button key={v} className={f.gender === v ? 'on' : ''} onClick={() => set({ gender: v })}>{l}</button>)}</div></div>
            <p className="faint mt16">입력한 사주는 풀이와 AI 사주친구에만 쓰이고, 마이에서 언제든 지울 수 있어요.</p>
            <button className="btn primary mt16" disabled={!ready} onClick={submit}>{editing ? '저장하기' : '다음으로'}</button>
          </section>
        )}
        {step === 1 && (
          <section className="fade-in mt16">
            <h2 className="h2">기록을 잃지 않게<br />간편하게 이어 둘까요?</h2>
            <p className="muted small mt8">로그인하면 다른 기기에서도 상담 기록과 타임라인을 그대로 볼 수 있어요. 나중에 해도 괜찮아요.</p>
            <div className="mt24"><LoginButtons back={next} /></div>
            <button className="btn line mt12" onClick={() => setStep(2)}>로그인 없이 시작하기</button>
          </section>
        )}
        {step === 2 && (
          <section className="fade-in center" style={{ paddingTop: '14vh' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}><Moon size={120} /></div>
            <h2 className="h2 mt16">{f.name} 님의 사주를<br />새기고 있어요</h2>
            <p className="muted small mt8">타고난 기운과 올해의 흐름을 지도로 그리는 중이에요.</p>
          </section>
        )}
      </main>
    </>
  );
}
