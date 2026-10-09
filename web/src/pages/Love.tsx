// 연애·재회 운세 — 2030 여성 타깃의 중심 메뉴. 무료로 올해 연애 흐름(12달)과 인연·재회 시기를 보여 주고,
// 지금 상황(솔로·썸·연애 중·이별 후·결혼)에 맞는 고민의 길과 풀이로 이어 준다.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { nextMonths, toRanges } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useSaju, useToday } from '../lib/fortune';
import { FlowChart, FlowLegend, Pic, won } from '../components/ui';
import { I } from '../components/icons';
import brand from '../../../brand.config.json';

const SITU: [string, string, string][] = [['new', '솔로예요', '언제 인연이 올까?'], ['crush', '썸·짝사랑 중', '그 사람 마음이 궁금해'], ['partner', '연애 중이에요', '이 관계, 계속 가도 될까?'], ['ex', '헤어졌어요', '다시 만날 수 있을까?'], ['marry', '결혼 고민', '결혼 시기가 궁금해']];
const LOVE_PRODUCTS = ['love_flow', 'reunion', 'gunghap'];

export default function Love() {
  const { profile, isSample } = useMain();
  const saju = useSaju(profile);
  const t = useToday(profile);
  const nav = useNavigate();
  const f = useMemo(() => {
    const nm = nextMonths(saju, 'love', profile.id);
    const pm = nextMonths(saju, 'partner', profile.id);
    const by = (xs: typeof nm, d: 1 | -1, n: number) => [...xs].sort((a, b) => d * (b.score - a.score)).slice(0, n);
    const good = by(nm, 1, 3), careful = by(nm, -1, 2), meet = by(pm, 1, 2);
    return { nm, good, careful, meet, gi: good.map((x) => nm.indexOf(x) + 1), ci: careful.map((x) => nm.indexOf(x) + 1) };
  }, [saju, profile.id]);
  const months = (xs: { month: number }[]) => toRanges(xs.map((x) => x.month));
  return (
    <>
      <header className="night love-head">
        <div className="night-top" style={{ padding: 0 }}><button className="icon-btn" aria-label="뒤로" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}><I.back /></button><span /><span style={{ width: 40 }} /></div>
        <small>달새김 사랑 시리즈</small>
        <h2>연애·재회 운세{isSample && <span className="sample-tag">예시</span>}</h2>
        <p>그 사람과 나, 마음이 닿는 때를 사주로 읽어요.</p>
      </header>
      <main className="screen over" style={{ paddingTop: 0 }}>
        <section className="card" aria-label="올해 나의 연애 흐름">
          <div className="between"><h3 className="h3">앞으로 12달, 나의 연애 흐름</h3><span className="faint">오늘 연애 <b style={{ color: '#d0577f', fontSize: 17 }}>{t.fields.love.score}</b>점</span></div>
          <div className="mt8"><FlowChart points={f.nm.map((x) => x.score)} labels={f.nm.map((x) => `${x.month}월`)} good={f.gi} careful={f.ci} current={0} /></div>
          <FlowLegend />
          <p className="explain">그래프는 사주의 연애 기운(일간과 각 달의 기운이 만나는 정도)을 0~100으로 나타낸 거예요. 높을수록 마음이 닿기 쉬운 달이에요.</p>
          <div className="love-stats mt12">
            <div><small>인연이 들어오는 달</small><b>{months(f.meet)}</b></div>
            <div><small>마음이 닿는 달</small><b>{months(f.good)}</b></div>
            <div className="c"><small>천천히 가면 좋은 달</small><b>{months(f.careful)}</b></div>
          </div>
        </section>
        {isSample && <Link to="/profile/new?next=/love" className="btn primary mt12">내 사주로 연애 흐름 보기</Link>}

        <section className="mt20" aria-label="지금 나의 상황">
          <h3 className="h3">지금 나의 상황은?</h3>
          <div className="situ mt12">
            {SITU.map(([id, l, q]) => <Link key={id} to={`/path?cat=love&sub=${id}`}><b>{l}</b><span>{q}</span><I.right size={16} /></Link>)}
          </div>
        </section>

        <section className="mt20" aria-label="연애 풀이">
          <h3 className="h3">깊이 보는 사랑 풀이</h3>
          <div className="stack mt12">
            {LOVE_PRODUCTS.map((id) => brand.products.find((p) => p.id === id)!).map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="card prod-row">
                <Pic n={p.id === 'gunghap' ? 'family' : p.id === 'reunion' ? 'moon' : 'love'} />
                <span className="grow"><span className="row" style={{ gap: 6 }}><b>{p.title}</b>{p.badge && <span className="badge">{p.badge}</span>}</span><small>{p.cardCopy}</small></span>
                <b className="price">{won(p.price)}</b>
              </Link>
            ))}
          </div>
        </section>

        <Link to="/friend" className="card lav mt16 row" style={{ display: 'flex', gap: 12 }}>
          <img className="p-avatar" src="/img/ui/p-dalha.webp" alt="" />
          <span className="grow"><b>연애 고민, 말로 털어놓기</b><span className="faint" style={{ display: 'block' }}>달하·월화가 내 사주로 들어 드려요</span></span><I.right />
        </Link>
      </main>
    </>
  );
}
