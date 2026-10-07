// 오늘의 운세(무료) — 오늘 지수 · 연애/재물/직장/건강 · 오늘의 키워드 · 행운 · 이번 달 미리보기
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FIELDS, FIELD_LABEL } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useMonth, useToday } from '../lib/fortune';
import { koDate, dow } from '../lib/dates';
import { Ring, Stars, Top, useToast } from '../components/ui';
import { I } from '../components/icons';
import { saveImage, shareLink, shortLink } from '../lib/share';

const FIELD_ICON = { love: I.heart, wealth: I.coin, work: I.briefcase, health: I.sprout } as const;

export default function Today() {
  const { profile, isSample } = useMain();
  const t = useToday(profile);
  const m = useMonth(profile);
  const [open, setOpen] = useState<string | null>('love');
  const card = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const share = async () => {
    const url = await shortLink('/today', 'today', '달새김 오늘의 운세', `오늘 ${t.total}점 — ${t.headline}`);
    const r = await shareLink({ title: '달새김사주 오늘의 운세', text: `오늘의 키워드는 '${t.keyword}' — ${t.headline}`, url });
    if (r === 'copied') toast('링크를 복사했어요');
  };

  return (
    <>
      <Top title="오늘의 운세" />
      <main className="screen">
        <p className="faint center">{koDate()} {dow()}요일 · {t.dayPillar.text}({t.dayPillar.hanja})일</p>
        <section className="card center mt12" ref={card} aria-label="오늘의 총운">
          <div className="center" style={{ display: 'grid', placeItems: 'center' }}><Ring value={t.total} label="오늘의 지수" /></div>
          <h2 className="h2 mt12">{t.headline}{isSample && <span className="sample-tag">예시</span>}</h2>
          <p className="muted mt8" style={{ fontSize: 15.5 }}>{t.brief}</p>
          <div className="chips mt12" style={{ justifyContent: 'center' }}>
            <span className="chip lav">오늘의 키워드 · {t.keyword}</span>
          </div>
        </section>
        {isSample && <Link to="/profile/new?next=/today" className="btn primary mt12">내 사주로 보기</Link>}

        <section className="mt20" aria-label="분야별 운세">
          <div className="list">
            {FIELDS.map((k) => {
              const f = t.fields[k];
              const Ico = FIELD_ICON[k];
              const on = open === k;
              return (
                <div key={k} className="li" style={{ display: 'block' }}>
                  <button className="between" style={{ width: '100%' }} onClick={() => setOpen(on ? null : k)} aria-expanded={on}>
                    <span className="row"><span style={{ color: 'var(--lav-2)' }}><Ico /></span><b>{FIELD_LABEL[k]}</b><Stars n={f.stars} /></span>
                    <span className="faint">{on ? '접기' : '자세히'}</span>
                  </button>
                  <p className="mt8" style={{ margin: '8px 0 0', fontWeight: 600 }}>{f.summary}</p>
                  {on && (
                    <div className="fade-in mt8">
                      {f.detail.map((x) => <p key={x} className="muted small" style={{ margin: '4px 0' }}>· {x}</p>)}
                      <div className="grid2 mt12" style={{ gap: 8 }}>
                        <div className="card gold" style={{ padding: 12 }}><div className="faint">해 보면 좋은 것</div><b className="small">{f.do}</b></div>
                        <div className="card rose" style={{ padding: 12 }}><div className="faint">피하면 좋은 것</div><b className="small">{f.avoid}</b></div>
                      </div>
                    </div>
                  )}
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

        <section className="card navy mt16" aria-label="달새김 한마디">
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>달새김 한마디</div>
          <p className="serif mt8" style={{ fontSize: 18, margin: '8px 0 0' }}>“{t.word}”</p>
        </section>

        <section className="card mt16" aria-label="이번 달 미리보기">
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
