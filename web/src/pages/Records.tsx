// 달새김 기록 — 상담·고민의 길·풀이에서 고른 것 + 직접 남긴 실제 사건. 원탭 피드백(잘 풀림/비슷함/달라짐).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAuth } from '../lib/api';
import { useMain } from '../store/app';
import { CAT_COLOR, CAT_LABEL, Sheet, Skeleton, Top, useToast } from '../components/ui';
import { I } from '../components/icons';
import { kstToday, dotDate } from '../lib/dates';
import { track } from '../lib/track';

export type Memory = { id: string; kind: string; category: string; title: string; summary: string | null; happenedOn: string; sajuNote: string | null; feedback: string | null; createdAt: string };
const KIND: Record<string, string> = { consult: 'AI 상담', path: '고민의 길', event: '실제 있었던 일', reading: '풀이', choice: '갈림길', report: '보고서' };
const FB: Record<string, string> = { good: '잘 풀렸어요', same: '비슷해요', changed: '달라졌어요' };

export function EditSheet({ m, onClose, onDone }: { m: Partial<Memory> | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<Partial<Memory>>({});
  const toast = useToast();
  const { profile, isSample } = useMain();
  useEffect(() => setF(m ? { category: 'etc', happenedOn: kstToday(), kind: 'event', ...m } : {}), [m]);
  if (!m) return null;
  const isNew = !m.id;
  const save = async () => {
    try {
      if (isNew) await apiAuth('/memories', { method: 'POST', json: { ...f, kind: 'event', profileId: isSample ? null : profile.id } });
      else await apiAuth(`/memories/${m.id}`, { method: 'PATCH', json: { title: f.title, summary: f.summary ?? '', category: f.category, happenedOn: f.happenedOn, feedback: f.feedback } });
      track('memory_save', { kind: isNew ? 'event' : 'edit' });
      toast(isNew ? '타임라인에 새겼어요' : '고쳤어요'); onDone();
    } catch (e: any) { toast(e.message); }
  };
  const del = async () => { await apiAuth(`/memories/${m.id}`, { method: 'DELETE' }).catch(() => {}); toast('지웠어요'); onDone(); };
  return (
    <Sheet open onClose={onClose} label="기록">
      <h2 className="h2">{isNew ? '실제 있었던 일 새기기' : '기록 고치기'}</h2>
      {isNew && <p className="muted small mt4">한 줄이면 충분해요. 나중에 사주 흐름과 나란히 돌아볼 수 있어요.</p>}
      <label className="field"><span>무슨 일이 있었나요?</span><input className="input" value={f.title ?? ''} maxLength={60} placeholder="예) 새 팀으로 옮김" onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label className="field"><span>날짜</span><input className="input" type="date" value={f.happenedOn ?? ''} onChange={(e) => setF({ ...f, happenedOn: e.target.value })} /></label>
      <div className="field"><span>분야</span><div className="chips">{Object.entries(CAT_LABEL).map(([k, l]) => <button key={k} className={`chip sm${f.category === k ? ' on' : ''}`} onClick={() => setF({ ...f, category: k })}>{l}</button>)}</div></div>
      <label className="field"><span>메모 (선택)</span><textarea className="input" value={f.summary ?? ''} maxLength={200} onChange={(e) => setF({ ...f, summary: e.target.value })} /></label>
      {!isNew && m.kind !== 'event' && (
        <div className="field"><span>그 뒤로 어떻게 됐나요?</span><div className="chips">{Object.entries(FB).map(([k, l]) => <button key={k} className={`chip sm${f.feedback === k ? ' on' : ''}`} onClick={() => setF({ ...f, feedback: k })}>{l}</button>)}</div></div>
      )}
      <button className="btn primary mt24" disabled={!f.title?.trim()} onClick={save}>{isNew ? '새기기' : '저장'}</button>
      {!isNew && <button className="btn line mt8" onClick={del}>이 기록 지우기</button>}
    </Sheet>
  );
}

export default function Records() {
  const [list, setList] = useState<Memory[] | null>(null);
  const [due, setDue] = useState<Memory[]>([]);
  const [edit, setEdit] = useState<Partial<Memory> | null>(null);
  const [cat, setCat] = useState('all');
  const toast = useToast();
  const load = () => apiAuth<{ list: Memory[]; due: Memory[] }>('/memories').then((r) => { setList(r.list); setDue(r.due); }).catch(() => setList([]));
  useEffect(() => { void load(); }, []);
  const fb = async (id: string, f: string) => { await apiAuth(`/memories/${id}`, { method: 'PATCH', json: { feedback: f } }).catch(() => {}); track('memory_feedback', { fb: f }); toast('타임라인에 새겼어요'); void load(); };
  const shown = (list ?? []).filter((m) => cat === 'all' || m.category === cat);
  const months = [...new Set(shown.map((m) => m.happenedOn.slice(0, 7)))];
  return (
    <>
      <Top title="달새김 기록" back={false} right={<button className="icon-btn" aria-label="기록 추가" onClick={() => setEdit({})}><I.plus /></button>} />
      <main className="screen">
        <p className="muted small" style={{ margin: 0 }}>상담과 고민, 실제 있었던 일이 차곡차곡 새겨지는 곳이에요.</p>
        {due.map((m) => (
          <section key={m.id} className="card lav mt16">
            <div className="eyebrow" style={{ color: 'var(--lav-2)' }}>지난 고민은 어떻게 됐나요?</div>
            <p className="small mt4" style={{ margin: '4px 0 0' }}>{dotDate(m.happenedOn)} · {m.title}</p>
            <div className="row mt12" style={{ gap: 6 }}>{Object.entries(FB).map(([k, l]) => <button key={k} className="btn line sm" style={{ flex: 1, background: 'var(--paper)' }} onClick={() => fb(m.id, k)}>{l}</button>)}</div>
            <button className="link mt8" onClick={() => apiAuth(`/memories/${m.id}`, { method: 'PATCH', json: { snooze: true } }).then(load)}>나중에 알려 줄게요</button>
          </section>
        ))}
        <div className="chips mt16">{[['all', '전체'], ...Object.entries(CAT_LABEL)].map(([k, l]) => <button key={k} className={`chip sm${cat === k ? ' on' : ''}`} onClick={() => setCat(k)}>{l}</button>)}</div>
        {list === null && <div className="stack mt16"><Skeleton /><Skeleton /></div>}
        {list?.length === 0 && (
          <section className="card center mt16">
            <h2 className="h3">아직 새겨진 기록이 없어요</h2>
            <p className="small muted mt8">AI 사주친구와 이야기하거나 고민의 길을 걸으면 요약이 자동으로 만들어져요. 저장할지는 직접 고르면 돼요.</p>
            <div className="grid2 mt16"><Link to="/friend" className="btn primary sm" style={{ width: '100%' }}>AI 사주친구</Link><Link to="/path" className="btn line sm" style={{ width: '100%' }}>내 고민의 길</Link></div>
          </section>
        )}
        {months.map((mo) => (
          <section key={mo} className="mt20">
            <h2 className="faint" style={{ fontWeight: 700 }}>{mo.replace('-', '년 ')}월</h2>
            <div className="list mt8">
              {shown.filter((m) => m.happenedOn.startsWith(mo)).map((m) => (
                <button key={m.id} className="li" style={{ width: '100%', textAlign: 'left' }} onClick={() => setEdit(m)}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: CAT_COLOR[m.category], flex: 'none' }} />
                  <div className="grow">
                    <div className="t">{m.title}</div>
                    <div className="s">{dotDate(m.happenedOn)} · {KIND[m.kind] ?? ''} · {CAT_LABEL[m.category]}{m.feedback ? ` · ${FB[m.feedback]}` : ''}</div>
                  </div>
                  <I.right className="chev" />
                </button>
              ))}
            </div>
          </section>
        ))}
        {list && list.length > 0 && <Link to="/timeline" className="btn line mt24"><I.timeline size={20} />인생 타임라인으로 보기</Link>}
      </main>
      <EditSheet m={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void load(); }} />
    </>
  );
}
