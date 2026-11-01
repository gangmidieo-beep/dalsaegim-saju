// 상품 목록 한 줄 — 카드 전체를 누르면 상품 상세, 오른쪽 공유 아이콘 1개는 공유창(카카오톡·링크 복사·인스타·다른 앱)
// 11/1 대표님 요청: 글자 크게(상품명 17·가격 17·설명 13.5 최대 2줄·배지 12), '보기' 버튼 없이 카드 전체 클릭, 공유 아이콘 1개
import { Link } from 'react-router-dom';
import { ProdPic, won, type PicName } from './ui';
import { I } from './icons';
import { useShare } from './share';

type Prod = { id: string; title: string; price: number; cardCopy?: string; badge?: string; adult?: boolean; listPrice?: number };

export function ProdRow({ p, pic, variant = 'home', showList = false }: { p: Prod; pic?: PicName; variant?: 'home' | 'card'; showList?: boolean }) {
  const openShare = useShare();
  const share = () => openShare({
    title: `달새김사주 ${p.title}`,
    text: p.cardCopy ? `${p.title} — ${p.cardCopy}` : p.title,
    path: `/product/${p.id}`,
    contentId: `product_${p.id}`,
  });
  return (
    <div className={`prow2 ${variant === 'card' ? 'card' : ''}`}>
      <Link to={`/product/${p.id}`} className="prow2-link">
        <ProdPic id={p.id} fallback={pic} />
        <span className="grow">
          {p.adult ? <em className="pbadge adult">19세 이상</em> : p.badge ? <em className="pbadge">{p.badge}</em> : null}
          <b className="pt">{p.title}</b>
          {p.cardCopy && <small>{p.cardCopy}</small>}
        </span>
        <span className="pp">{showList && p.listPrice ? <s>{won(p.listPrice)}</s> : null}{won(p.price)}</span>
      </Link>
      <button type="button" className="psh" onClick={share} aria-label={`${p.title} 공유하기`}>
        <I.share size={20} /><span>공유</span>
      </button>
    </div>
  );
}
