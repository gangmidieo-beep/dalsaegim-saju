// 전체 운세 — 무료 메뉴와 유료 풀이를 한곳에. 사랑 시리즈를 맨 위에.
import { Link } from 'react-router-dom';
import { Pic, ProdPic, Top, won, type PicName } from '../components/ui';
import { GuideWidget } from '../components/Guide';
import { I } from '../components/icons';
import brand from '../../../brand.config.json';

const FREE: [string, string, string, PicName][] = [
  ['/today', '오늘의 운세', '오늘 하루의 흐름', 'today'], ['/love', '연애·재회 운세', '앞으로 12달 연애 흐름', 'love'],
  ['/path', '운명의 갈림길', '두 선택 비교 · 고민별 좋은 시기', 'path'], ['/friend', '달빛 상담사 서월', '하루 3번 무료 상담', 'friend'],
  ['/map', '나의 사주지도', '타고난 나와 큰 흐름', 'map'], ['/money', '돈의 흐름', '재물·사업·투자·부동산', 'money'], ['/mbti', '사주 × MBTI', '타고난 기운과 지금 성향', 'self'],
  ['/letter', '달빛 편지', '오늘 내게 온 편지 · 받은 편지함', 'moon'], ['/charm', '황금부적', '소망을 새긴 나만의 부적', 'future'],
];
const SERIES: [string, string][] = [['love', '사랑 시리즈'], ['year', '올해·이번 달'], ['life', '나의 사주'], ['money', '돈의 흐름'], ['work', '일과 진로'], ['worry', '고민·성향'], ['mbti', ''], ['friend', '달빛 상담']];

export default function All() {
  const vis = brand.products.filter((p) => p.visible !== false);
  return (
    <>
      <Top title="전체 운세" back={false} />
      <main className="screen">
        <h2 className="h3">무료로 보기</h2>
        <div className="list mt12">
          {FREE.map(([to, t, s, ic]) => <Link key={to} to={to} className="li"><Pic n={ic} size="s" /><div className="grow"><div className="t">{t}</div><div className="s">{s}</div></div><I.right className="chev" /></Link>)}
        </div>
        {SERIES.map(([sr, label]) => {
          const ps = vis.filter((p) => p.series === sr || (sr === 'love' && p.series === 'adult')).sort((a, b) => (a.id === 'tarot_some' ? 1 : 0) - (b.id === 'tarot_some' ? 1 : 0)); // 속궁합(19세 이상)도 사랑 시리즈에 — 썸 타로는 맨 끝
          if (!ps.length) return null;
          return (
            <section key={sr} className="mt24">
              {label && <h2 className="h3">{label}</h2>}
              <div className="stack mt12">
                {ps.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="card prod-row">
                    <ProdPic id={p.id} />
                    <span className="grow">{(p as { adult?: boolean }).adult ? <em className="pbadge adult">19세 이상</em> : p.badge ? <em className="pbadge">{p.badge}</em> : null}<b style={{ display: 'block' }}>{p.title}</b><small>{p.cardCopy}</small></span>
                    <b className="price">{won(p.price)}</b>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
      <GuideWidget />
    </>
  );
}
