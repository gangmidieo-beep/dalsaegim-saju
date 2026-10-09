// 달새김 기록 — 상담·고민의 길·풀이에서 고른 것 + 직접 남긴 실제 사건. 원탭 피드백(잘 풀림/비슷함/달라짐).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiAuth } from '../lib/api';
import { useMain } from '../store/app';
import { CAT_COLOR, CAT_FILTER, CAT_LABEL, CAT_LONG, CAT_PIC, inCat, Pic, Sheet, Skeleton, Top, fullDate, shrinkPhoto, useToast } from '../components/ui';
import { I } from '../components/icons';
import { kstToday, dotDate } from '../lib/dates';
import { track } from '../lib/track';

export type Memory = { id: string; kind: string; category: string; title: string; summary: string | null; happenedOn: string; sajuNote: string | null; feedback: string | null; createdAt: string; visibility?: string; photo?: string | null };
const VIS: [string, string, string][] = [['private', '비공개', '기록함에만 두고 타임라인·AI 모두 안 봐요'], ['self', '나만보기', '나의 타임라인에 보여요'], ['ai', 'AI 참고용', 'AI 사주친구가 상담할 때 참고해요']];
const KIND: Record<string, string> = { consult: 'AI 상담', path: '고민의 길', event: '실제 있었던 일', reading: '풀이', choice: '갈림길', report: '보고서' };
const FB: Record<string, string> = { good: '잘 풀렸어요', same: '비슷해요', changed: '달라졌어요' };

export function EditSheet({ m, onClose, onDone }: { m: Partial<Memory> | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<Partial<Memory>>({});
  const toast = useToast();
  const { profile, isSample } = useMain();
  useEffect(() => setF(m ? { category: 'etc', happenedOn: kstToday(), kind: 'event', visibility: 'self', ...m } : {}), [m]);
  if (!m) return null;
  const isNew = !m.id;
  const save = async () => {
    try {
      if (isNew) await apiAuth('/memories', { method: 'POST', json: { ...f, kind: 'event', profileId: isSample ? null : profile.id } });
      else await apiAuth(`/memories/${m.id}`, { method: 'PATCH', json: { title: f.title, summary: f.summary ?? '', category: f.category, happenedOn: f.happenedOn, feedback: f.feedback, visibility: f.visibility, photo: f.photo ?? null } });
      track('memory_save', { kind: isNew ? 'event' : 'edit' });
      toast(isNew ? '타임라인에 새겼어요' : '고쳤어요'); onDone();
    } catch (e: any) { toast(e.message); }
  };
  const del = async () => { await apiAuth(`/memories/${m.id}`, { method: 'DELETE' }).catch(() => {}); toast('지웠어요'); onDone(); };
  const addPhoto = async (file?: File) => {
    if (!file) return;
    try { setF((x) => ({ ...x, photo: null })); const url = await shrinkPhoto(file); setF((x) => ({ ...x, photo: url })); } catch (e: any) { toast(e.message); }
  };
  return (
    <Sheet open onClose={onClose} label="기록">
      <h2 className="h2">{isNew ? '실제 있었던 일 새기기' : '기록 편집'}</h2>
      <label className="field"><span>날짜</span><input className="input" type="date" value={f.happenedOn ?? ''} onChange={(e) => setF({ ...f, happenedOn: e.target.value })} /></label>
      <div className="field"><span>분야</span><div className="chips">{Object.entries(CAT_LONG).map(([k, l]) => <button key={k} className={`chip sm${f.category === k ? ' on' : ''}`} onClick={() => setF({ ...f, category: k })}>{l}</button>)}</div></div>
      <label className="field"><span>{isNew ? '무슨 일이 있었나요?' : '제목'}</span><input className="input" value={f.title ?? ''} maxLength={60} placeholder="예) 새 팀으로 옮김" onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label className="field"><span>내용</span><textarea className="input" value={f.summary ?? ''} maxLength={200} placeholder="현재 이직을 고민하고 있으며…" onChange={(e) => setF({ ...f, summary: e.target.value })} /></label>
      <div className="field"><span>사진 추가 (선택)</span>
        <div className="photo-add">
          {f.photo && <img className="ph" src={f.photo} alt="첨부한 사진" />}
          <label>{f.photo ? '바꾸기' : <I.plus />}<input type="file" accept="image/*" hidden onChange={(e) => addPhoto(e.target.files?.[0])} /></label>
          {f.photo && <button className="icon-btn" aria-label="사진 빼기" onClick={() => setF({ ...f, photo: null })}><I.close /></button>}
        </div>
      </div>
      <div className="field"><span>공개 설정</span>
        <div className="vis">{VIS.map(([k, l]) => <button key={k} className={(f.visibility ?? 'self') === k ? 'on' : ''} onClick={() => setF({ ...f, visibility: k })}>{l}</button>)}</div>
        <p className="faint mt4" style={{ fontSize: 12.5 }}>{VIS.find(([k]) => k === (f.visibility ?? 'self'))![2]}</p>
      </div>
      {!isNew && m.kind !== 'event' && (
        <div className="field"><span>그 뒤로 어떻게 됐나요?</span><div className="chips">{Object.entries(FB).map(([k, l]) => <button key={k} className={`chip sm${f.feedback === k ? ' on' : ''}`} onClick={() => setF({ ...f, feedback: k })}>{l}</button>)}</div></div>
      )}
      <button className="btn primary mt24" disabled={!f.title?.trim()} onClick={save}>{isNew ? '새기기' : '저장하기'}</button>
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
  const shown = (list ?? []).filter((m) => inCat(m.category, cat));
  const latest = list?.[0];
  const ask = due[0] ?? (latest && !latest.feedback && latest.kind !== 'event' ? latest : undefined);
  const months = [...new Set(shown.map((m) => m.happenedOn.slice(0, 7)))];
  return (
    <>
      <Top title="달새김 기록" back={false} right={<button className="icon-btn" aria-label="기록 추가" onClick={() => setEdit({})}><I.plus /></button>} />
      <main className="screen">
        <section aria-label="오늘의 새김">
          <div className="center"><h2 className="h2">오늘의 새김</h2><div className="faint">{fullDate()}</div></div>
          {latest ? (
            <button className="saegim mt12" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => setEdit(latest)}>
              <div className="between"><div className="cat"><Pic n={CAT_PIC[latest.category] ?? 'moon'} size="s" />{CAT_LONG[latest.category] ?? '나·성장'}</div><span className="faint" style={{ fontSize: 13 }}>{dotDate(latest.happenedOn)}</span></div>
              <p><b>{latest.title}</b>{latest.summary && !latest.summary.includes(latest.title) ? <><br />{latest.summary}</> : null}</p>
              {latest.sajuNote && <p className="small" style={{ color: 'var(--lav-2)' }}>사주 흐름 · {latest.sajuNote}</p>}
            </button>
          ) : list && (
            <p className="muted small center mt12">상담과 고민, 실제 있었던 일이 차곡차곡 새겨지는 곳이에요.</p>
          )}
        </section>
        {ask && (
          <section className="mt20" aria-label="지난 고민은 어떻게 됐나요?">
            <h3 className="h3 center">몇 주 후, 어떻게 되었나요?</h3>
            <p className="faint center mt4">{dotDate(ask.happenedOn)} · {ask.title}</p>
            <div className="fb3 mt12">
              {([['good', '잘 풀렸어요', 'health'], ['same', '비슷해요', 'today'], ['changed', '달라졌어요', 'love']] as const).map(([k, l, ic]) => <button key={k} onClick={() => fb(ask.id, k)}><Pic n={ic} size="s" />{l}</button>)}
            </div>
            {due.length > 0 && <button className="link mt8 center" style={{ display: 'block', width: '100%' }} onClick={() => apiAuth(`/memories/${ask.id}`, { method: 'PATCH', json: { snooze: true } }).then(load)}>나중에 알려 줄게요</button>}
          </section>
        )}
        <div className="chips mt16">{CAT_FILTER.map(([k, l]) => <button key={k} className={`chip sm${cat === k ? ' on' : ''}`} onClick={() => setCat(k)}>{l}</button>)}</div>
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
                  <Pic n={CAT_PIC[m.category] ?? 'moon'} size="s" />
                  <div className="grow">
                    <div className="t">{m.title}</div>
                    <div className="s">{dotDate(m.happenedOn)} · {KIND[m.kind] ?? ''} · <span style={{ color: CAT_COLOR[m.category], fontWeight: 700 }}>{CAT_LABEL[m.category]}</span>{m.feedback ? ` · ${FB[m.feedback]}` : ''}{m.visibility === 'private' ? ' · 비공개' : m.visibility === 'ai' ? ' · AI 참고' : ''}</div>
                  </div>
                  {m.photo ? <img src={m.photo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} /> : <I.right className="chev" />}
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
