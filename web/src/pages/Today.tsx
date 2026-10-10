// 오늘의 운세(무료, 시안 4) — 밤하늘 헤더 · 전체/연애/직장/재물/건강 탭 · 오늘의 지수 4칸 · 지금의 키워드(꽃 카드) · 상세 운세
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FIELD_LABEL, type Field } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useMonth, useToday } from '../lib/fortune';
import { Pic, fullDate, type PicName } from '../components/ui';
import { I } from '../components/icons';
import { saveImage } from '../lib/share';
import { useShare } from '../components/share';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ORDER: Field[] = ['love', 'work', 'wealth', 'health'];
const PIC: Record<Field, PicName> = { love: 'love', work: 'work', wealth: 'money', health: 'health' };
const TAB_LABEL: Record<Field, string> = { love: '연애', work: '직장', wealth: '재물', health: '건강' };

export default function Today() {
  const { profile, isSample } = useMain();
  const t = useToday(profile);
  const m = useMonth(profile);
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<'all' | Field>((ORDER as string[]).includes(sp.get('tab') ?? '') ? (sp.get('tab') as Field) : 'all');
  const detail = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const best = [...ORDER].sort((a, b) => t.fields[b].score - t.fields[a].score)[0];
  const low = [...ORDER].sort((a, b) => t.fields[a].score - t.fields[b].score)[0];
  const openShare = useShare();
  // 오늘의 운세 공유 — 점수와 한 줄만(생년월일·이름 등 사주 정보는 담지 않음)
  const share = () => openShare({ title: '달새김사주 오늘의 운세', text: `오늘의 운세 ${t.total}점 — ${t.headline}`, path: '/today', contentId: 'today', note: '점수와 한 줄만 보내요. 이름·생년월일은 담기지 않아요.' });
  const fields = tab === 'all' ? ORDER : [tab];
  // 편지·부적에서 '이번 달 흐름'으로 들어오면 그 자리로
  const monthRef = useRef<HTMLElement>(null);
  useEffect(() => { if (sp.get('focus') === 'month') setTimeout(() => monthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }, []);

  return (
    <>
      <header className="night sky-head">
        <div className="night-top" style={{ padding: 0 }}>
          <button className="icon-btn" aria-label="뒤로" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}><I.back /></button>
          <span />
          <button className="icon-btn" aria-label="공유" onClick={share}><I.share /></button>
        </div>
        <div className="date">{fullDate()}</div>
        <h2>오늘의 운세{isSample && <span className="sample-tag">예시</span>}</h2>
      </header>

      <main className="screen over" style={{ paddingTop: 0 }}>
        <div className="tabs" role="tablist" aria-label="분야">
          {([['all', '전체'], ...ORDER.map((k) => [k, TAB_LABEL[k]])] as [string, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k as 'all' | Field)}>{l}</button>
          ))}
        </div>

        <section className="card mt12" ref={card} aria-label="오늘의 운세 점수">
          <div className="between"><h3 className="h3">오늘의 운세 점수</h3><span className="total-score">{t.total}<small>점</small></span></div>
          <div className="idx4 mt12">
            {ORDER.map((k) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} aria-label={`${FIELD_LABEL[k]} ${t.fields[k].score}점`}>
                <Pic n={PIC[k]} size="s" /><small>{TAB_LABEL[k]}</small><b>{t.fields[k].score}</b>
              </button>
            ))}
          </div>
          <p className="explain">점수는 {profile.name} 님의 타고난 기운(일간)과 오늘 하루의 기운(일진 <b>{t.dayPillar.text}일</b>)이 만나는 정도를 100점 만점으로 계산했어요. 70점 이상이면 기운이 좋은 날이에요.</p>
          <details className="score-basis">
            <summary>점수는 어떻게 정해지나요?</summary>
            <ul>
              <li>타고난 사주(생년월일·태어난 시간)와 오늘의 일진({t.dayPillar.text} · {t.tenGod})이 만나는 관계로 분야별 기운을 계산해요.</li>
              <li>같은 사람·같은 날짜는 몇 번을 다시 봐도 같은 점수가 나와요.{t.timeUnknown ? ' 태어난 시간을 모르면 시간 기둥 없이 계산해요.' : ''}</li>
              <li><b>88점 이상</b> 아주 좋은 흐름 · <b>80~87</b> 좋은 흐름 · <b>72~79</b> 무난한 흐름 · <b>64~71</b> 쉬어 가는 흐름 · <b>63 이하</b> 조심하는 흐름</li>
              <li>점수는 하루를 준비하는 참고예요. 좋은 날엔 해 보면 좋은 것을, 낮은 날엔 피하면 좋은 것을 먼저 보세요.</li>
            </ul>
          </details>
        </section>
        {isSample && <Link to="/profile/new?next=/today" className="btn primary mt12">내 사주로 보기</Link>}

        <section className="card mt12" aria-label="오늘의 핵심 운세">
          <h3 className="h3">오늘의 핵심 운세</h3>
          <p className="core-line">{t.headline}</p>
          <div className="core2 mt12">
            <div><small>가장 좋은 운</small><b>{TAB_LABEL[best]} {t.fields[best].score}점</b><span>{t.fields[best].do}</span></div>
            <div className="c"><small>조심할 운</small><b>{TAB_LABEL[low]} {t.fields[low].score}점</b><span>{t.fields[low].avoid}</span></div>
          </div>
        </section>

        <button className="btn blush mt16" onClick={() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>분야별 상세 운세 보기 →</button>

        <section ref={detail} className="mt24" aria-label="분야별 상세 운세" style={{ scrollMarginTop: 12 }}>
          <div className="stack">
            {fields.map((k) => {
              const f = t.fields[k];
              return (
                <div key={k} className="card">
                  <div className="between"><span className="row"><Pic n={PIC[k]} size="s" /><b style={{ fontSize: 17.5 }}>{FIELD_LABEL[k]}</b></span><b style={{ color: '#d0577f', fontSize: 18 }}>{f.score}점</b></div>
                  <p style={{ margin: '10px 0 0', fontWeight: 600 }}>{f.summary}</p>
                  {f.detail.map((x) => <p key={x} className="muted" style={{ margin: '6px 0 0', fontSize: 15.5 }}>· {x}</p>)}
                  <div className="grid2 mt12" style={{ gap: 8 }}>
                    <div className="card gold" style={{ padding: 12 }}><div className="faint">해 보면 좋은 것</div><b style={{ fontSize: 15 }}>{f.do}</b></div>
                    <div className="card rose" style={{ padding: 12 }}><div className="faint">피하면 좋은 것</div><b style={{ fontSize: 15 }}>{f.avoid}</b></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card flat mt16" aria-label="오늘의 행운">
          <div className="card-title"><h3>오늘의 행운</h3><span className="faint">채우면 좋은 기운 · {t.lucky.element}</span></div>
          <div className="metrics three">
            <div className="metric"><small>색</small><b style={{ fontSize: 15, fontFamily: 'var(--sans)' }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: t.lucky.hex, border: '1px solid #ddd', marginRight: 4 }} />{t.lucky.color}</b></div>
            <div className="metric"><small>숫자</small><b>{t.lucky.number}</b></div>
            <div className="metric"><small>방향</small><b style={{ fontSize: 15, fontFamily: 'var(--sans)' }}>{t.lucky.direction}</b></div>
          </div>
          <p className="faint mt12 center">오늘 곁에 두면 좋은 것 · {t.lucky.item}</p>
        </section>

        <section className="card mt16" aria-label="이번 달 미리보기" id="month" ref={monthRef}>
          <div className="card-title"><h3>{m.month}월의 흐름</h3><span className="chip sm gold">{m.total}점</span></div>
          <p className="small muted" style={{ margin: 0 }}>{m.line}</p>
          <Link to="/product/month_detail" className="btn line sm mt12" style={{ width: '100%' }}>이번 달 날짜별 상세운세 보기</Link>
        </section>

        <div className="grid2 mt16">
          <button className="btn line sm" style={{ width: '100%' }} onClick={share}><I.share size={18} />공유하기</button>
          <button className="btn line sm" style={{ width: '100%' }} onClick={() => card.current && saveImage(card.current, `today_${t.date}`)}><I.download size={18} />이미지 저장</button>
        </div>
        <Link to="/friend" className="btn primary mt12"><I.chat size={20} />오늘에 대해 AI 사주친구에게 묻기</Link>
      </main>
    </>
  );
}
