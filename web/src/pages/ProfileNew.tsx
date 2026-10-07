// 사주 입력 — 3단계(이름·성별 → 생년월일 → 태어난 시간). 회원가입 없이 바로 시작.
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LUNAR_YEAR_MAX, LUNAR_YEAR_MIN, leapMonthOf } from '@dalsaegim/engine';
import { newId, useApp, type Profile } from '../store/app';
import { syncProfile } from '../lib/api';
import { Top, useToast } from '../components/ui';
import { track } from '../lib/track';

// 대표 시각: 각 시진 안의 짝수 시(자시 0시, 축시 2시 …) — 30분 경계 표기와 엔진 경계 모두에 들어간다
const HOURS = [
  { h: 0, n: '자시', t: '23:30~01:29' }, { h: 2, n: '축시', t: '01:30~03:29' }, { h: 4, n: '인시', t: '03:30~05:29' }, { h: 6, n: '묘시', t: '05:30~07:29' },
  { h: 8, n: '진시', t: '07:30~09:29' }, { h: 10, n: '사시', t: '09:30~11:29' }, { h: 12, n: '오시', t: '11:30~13:29' }, { h: 14, n: '미시', t: '13:30~15:29' },
  { h: 16, n: '신시', t: '15:30~17:29' }, { h: 18, n: '유시', t: '17:30~19:29' }, { h: 20, n: '술시', t: '19:30~21:29' }, { h: 22, n: '해시', t: '21:30~23:29' },
];
const RELS = ['나', '연인', '배우자', '가족', '친구'];

export default function ProfileNew() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { profiles, saveProfile } = useApp();
  const editing = profiles.find((p) => p.id === id);
  const first = profiles.length === 0;
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Profile>(editing ?? { id: newId(), name: '', gender: 'F', year: 0, month: 0, day: 0, calendar: 'solar', leap: false, hour: null, relation: first ? '나' : sp.get('rel') ?? '연인' });
  const [date, setDate] = useState(editing ? `${editing.year}${String(editing.month).padStart(2, '0')}${String(editing.day).padStart(2, '0')}` : '');
  const [unknown, setUnknown] = useState(editing ? editing.hour == null : false);
  const toast = useToast();
  const nav = useNavigate();
  const set = (p: Partial<Profile>) => setF((x) => ({ ...x, ...p }));

  const digits = date.replace(/\D/g, '').slice(0, 8);
  const y = +digits.slice(0, 4), m = +digits.slice(4, 6), d = +digits.slice(6, 8);
  const dateOk = digits.length === 8 && y >= LUNAR_YEAR_MIN && y <= Math.min(LUNAR_YEAR_MAX, new Date().getFullYear()) && m >= 1 && m <= 12 && d >= 1 && d <= 31 && (f.calendar === 'lunar' || new Date(y, m - 1, d).getDate() === d);
  const hasLeap = f.calendar === 'lunar' && dateOk && leapMonthOf(y) === m;
  const pretty = digits.length > 4 ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}${digits.length > 6 ? `.${digits.slice(6)}` : ''}` : digits;

  const done = async () => {
    const p: Profile = { ...f, name: f.name.trim(), year: y, month: m, day: d, leap: hasLeap && f.leap, hour: unknown ? null : f.hour };
    const makeMain = first || p.relation === '나';
    saveProfile(p, makeMain);
    void syncProfile(p, makeMain);
    track('profile_saved', { rel: p.relation, timeKnown: p.hour != null });
    toast(editing ? '사주를 고쳤어요' : `${p.name} 님의 사주를 새겼어요`);
    nav(sp.get('next') ?? (first ? '/map' : '/me'), { replace: true });
  };

  return (
    <>
      <Top title={editing ? '사주 고치기' : '사주 입력'} />
      <main className="screen">
        <div className="steps" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        {step === 0 && (
          <section className="fade-in">
            <h2 className="h2">{first ? '먼저 이름을 알려 주세요' : '누구의 사주인가요?'}</h2>
            <p className="muted small mt4">부르고 싶은 이름이면 충분해요.</p>
            <label className="field"><span>이름</span><input className="input" value={f.name} maxLength={12} onChange={(e) => set({ name: e.target.value })} placeholder="예) 김달님" autoFocus /></label>
            <div className="field"><span>성별</span><div className="seg">{([['F', '여성'], ['M', '남성']] as const).map(([v, l]) => <button key={v} className={f.gender === v ? 'on' : ''} onClick={() => set({ gender: v })}>{l}</button>)}</div></div>
            {!first && <div className="field"><span>관계</span><div className="chips">{RELS.map((r) => <button key={r} className={`chip${f.relation === r ? ' on' : ''}`} onClick={() => set({ relation: r })}>{r}</button>)}</div></div>}
            <button className="btn primary mt32" disabled={!f.name.trim()} onClick={() => setStep(1)}>다음</button>
          </section>
        )}
        {step === 1 && (
          <section className="fade-in">
            <h2 className="h2">생년월일을 알려 주세요</h2>
            <div className="field"><div className="seg">{([['solar', '양력'], ['lunar', '음력']] as const).map(([v, l]) => <button key={v} className={f.calendar === v ? 'on' : ''} onClick={() => set({ calendar: v })}>{l}</button>)}</div></div>
            <label className="field"><span>생년월일 8자리</span><input className="input" inputMode="numeric" value={pretty} onChange={(e) => setDate(e.target.value)} placeholder="예) 1996.04.02" autoFocus /></label>
            {digits.length === 8 && !dateOk && <p className="small mt8" style={{ color: '#c0687b' }}>날짜를 다시 확인해 주세요</p>}
            {hasLeap && <label className="check mt12"><input type="checkbox" checked={f.leap} onChange={(e) => set({ leap: e.target.checked })} />윤달이에요</label>}
            <div className="row mt32" style={{ gap: 8 }}>
              <button className="btn line" style={{ flex: 1 }} onClick={() => setStep(0)}>이전</button>
              <button className="btn primary" style={{ flex: 2 }} disabled={!dateOk} onClick={() => setStep(2)}>다음</button>
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="fade-in">
            <h2 className="h2">태어난 시간을 알려 주세요</h2>
            <p className="muted small mt4">몰라도 괜찮아요. 시간을 알면 더 정확해져요.</p>
            <div className="hour-grid mt16" style={{ opacity: unknown ? 0.4 : 1 }}>
              {HOURS.map((x) => <button key={x.h} className={!unknown && f.hour === x.h ? 'on' : ''} onClick={() => { setUnknown(false); set({ hour: x.h }); }}>{x.n}<small>{x.t}</small></button>)}
            </div>
            <label className="check mt16"><input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} />태어난 시간을 몰라요</label>
            <p className="faint mt12">입력한 사주는 풀이와 AI 사주친구에만 쓰이고, 마이에서 언제든 지울 수 있어요.</p>
            <div className="row mt24" style={{ gap: 8 }}>
              <button className="btn line" style={{ flex: 1 }} onClick={() => setStep(1)}>이전</button>
              <button className="btn primary" style={{ flex: 2 }} disabled={!unknown && f.hour == null} onClick={done}>{editing ? '저장하기' : '사주 새기기'}</button>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
