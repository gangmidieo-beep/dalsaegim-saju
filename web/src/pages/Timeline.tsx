// 나의 인생 타임라인 — 기록·실제 사건·풀이가 시간순으로. "그때 사주가 말한 흐름 VS 실제로 일어난 일"을 나란히.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAuth } from '../lib/api';
import { CAT_COLOR, CAT_LABEL, Skeleton, Top } from '../components/ui';
import { I } from '../components/icons';
import { EditSheet, type Memory } from './Records';
import { dotDate } from '../lib/dates';

type Item = { type: 'memory' | 'reading'; id: string; date: string; kind: string; category: string; title: string; summary: string | null; sajuNote: string | null; feedback: string | null };
const FB: Record<string, [string, string]> = { good: ['잘 풀렸어요', '#6F9E8A'], same: ['비슷해요', '#8A8CA0'], changed: ['달라졌어요', '#C0687B'] };

export default function Timeline() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [cat, setCat] = useState('all');
  const [edit, setEdit] = useState<Partial<Memory> | null>(null);
  const load = () => apiAuth<{ items: Item[] }>('/timeline').then((r) => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { void load(); }, []);
  const shown = (items ?? []).filter((x) => cat === 'all' || x.category === cat);
  const years = [...new Set(shown.map((x) => x.date.slice(0, 4)))];
  const compared = (items ?? []).filter((x) => x.sajuNote && x.feedback).length;
  return (
    <>
      <Top title="나의 인생 타임라인" back={false} right={<button className="icon-btn" aria-label="사건 추가" onClick={() => setEdit({})}><I.plus /></button>} />
      <main className="screen">
        <section className="card navy">
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>사주 VS 실제 인생</div>
          <p className="mt8" style={{ margin: '8px 0 0' }}>새겨진 순간 <b style={{ color: '#F2DCCB' }}>{items?.length ?? 0}</b>개 · 사주와 실제를 비교한 순간 <b style={{ color: '#F2DCCB' }}>{compared}</b>개</p>
          <p className="faint mt4">기록이 쌓일수록 나에게 맞는 흐름이 선명해져요.</p>
        </section>
        <div className="chips mt16">{[['all', '전체'], ['love', '연애'], ['work', '직장'], ['money', '재물'], ['family', '가족'], ['growth', '성장']].map(([k, l]) => <button key={k} className={`chip sm${cat === k ? ' on' : ''}`} onClick={() => setCat(k)}>{l}</button>)}</div>
        {items === null && <div className="stack mt16"><Skeleton /><Skeleton /></div>}
        {items?.length === 0 && (
          <section className="card center mt16">
            <h2 className="h3">타임라인이 아직 비어 있어요</h2>
            <p className="small muted mt8">실제로 있었던 중요한 일을 한 줄로 남겨 보세요. 예) 이직, 이사, 새로운 만남</p>
            <button className="btn primary mt16" onClick={() => setEdit({})}>첫 순간 새기기</button>
          </section>
        )}
        <div className="tl mt8">
          {years.map((y) => (
            <div key={y}>
              <div className="tl-year">{y}</div>
              {shown.filter((x) => x.date.startsWith(y)).map((x) => (
                <div key={x.id} className="tl-item" style={{ ['--c' as any]: CAT_COLOR[x.category] }}>
                  {x.type === 'reading' ? (
                    <Link to={`/reading/${x.id}`} className="card flat" style={{ display: 'block', padding: 14 }}>
                      <div className="faint">{dotDate(x.date)} · 받은 풀이</div><b>{x.title}</b>
                    </Link>
                  ) : (
                    <button className="card flat" style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14 }} onClick={() => setEdit(x as any)}>
                      <div className="between"><span className="faint">{dotDate(x.date)} · {CAT_LABEL[x.category]}</span>{x.feedback && <span className="chip sm" style={{ color: FB[x.feedback][1] }}>{FB[x.feedback][0]}</span>}</div>
                      <b style={{ display: 'block', marginTop: 2 }}>{x.title}</b>
                      {x.sajuNote && <div className="small mt8" style={{ color: 'var(--lav-2)' }}>그때 사주 · {x.sajuNote}</div>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
      <EditSheet m={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void load(); }} />
    </>
  );
}
