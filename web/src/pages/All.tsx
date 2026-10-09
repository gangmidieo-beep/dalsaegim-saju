// 전체 운세 — 무료 메뉴와 유료 풀이를 한곳에. 사랑 시리즈를 맨 위에.
import { Link } from 'react-router-dom';
import { Pic, Top, won, type PicName } from '../components/ui';
import { I } from '../components/icons';
import brand from '../../../brand.config.json';

const FREE: [string, string, string, PicName][] = [
  ['/today', '오늘의 운세', '오늘 하루의 흐름', 'today'], ['/love', '연애·재회 운세', '앞으로 12달 연애 흐름', 'love'],
  ['/path', '내 고민의 길', '고민별 가장 좋은 시기', 'path'], ['/friend', 'AI 사주친구', '하루 3번 무료 상담', 'friend'],
  ['/map', '나의 사주지도', '타고난 나와 큰 흐름', 'map'], ['/money', '돈의 흐름', '재물·사업·투자·부동산', 'money'], ['/mbti', '사주 × MBTI', '타고난 기운과 지금 성향', 'self'],
];
const SERIES: [string, string][] = [['love', '사랑 시리즈'], ['year', '올해·이번 달'], ['life', '나의 사주'], ['money', '돈의 흐름'], ['worry', '고민·성향'], ['mbti', ''], ['friend', 'AI 사주친구']];

export default function All() {
  const vis = brand.products.filter((p) => p.visible !== false && !(p as { adult?: boolean }).adult);
  return (
    <>
      <Top title="전체 운세" />
      <main className="screen">
        <h2 className="h3">무료로 보기</h2>
        <div className="list mt12">
          {FREE.map(([to, t, s, ic]) => <Link key={to} to={to} className="li"><Pic n={ic} size="s" /><div className="grow"><div className="t">{t}</div><div className="s">{s}</div></div><I.right className="chev" /></Link>)}
        </div>
        {SERIES.map(([sr, label]) => {
          const ps = vis.filter((p) => p.series === sr);
          if (!ps.length) return null;
          return (
            <section key={sr} className="mt24">
              {label && <h2 className="h3">{label}</h2>}
              <div className="stack mt12">
                {ps.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="card prod-row">
                    <span className="grow"><span className="row" style={{ gap: 6 }}><b>{p.title}</b>{p.badge && <span className="badge">{p.badge}</span>}</span><small>{p.cardCopy}</small></span>
                    <b className="price">{won(p.price)}</b>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
