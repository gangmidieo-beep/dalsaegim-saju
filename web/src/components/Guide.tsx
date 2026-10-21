// 고민 길잡이 — 사주를 잘 모르는 사람이 "어떤 고민이 있으세요?"에 한 줄로 답하면 맞는 상품을 바로 안내한다.
// 대표님 요청(10/19): 결정이 어려운 사람에게 다이렉트로. 정해진 규칙으로 고르고(AI 비용 0) 입력은 서버로 보내지 않는다.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { I } from './icons';
import { won } from './ui';
import { track } from '../lib/track';
import brand from '../../../brand.config.json';

type Rec = { to: string; title: string; copy: string; price?: number };
type Intent = { id: string; words: RegExp; reply: string; items: string[]; ask?: [string, string][] };

// 위에서부터 먼저 맞는 것을 고른다(구체적인 고민 → 넓은 고민 순)
const INTENTS: Intent[] = [
  { id: 'crisis', words: /죽고\s*싶|자해|사라지고\s*싶|살기\s*싫|극단/, reply: '많이 힘드시군요. 지금 마음이 많이 무거우시다면 혼자 견디지 마시고 24시간 상담전화 109(자살예방상담)에 이야기해 주세요. 달새김은 곁에서 천천히 들어 드릴게요.', items: ['@friend', '@letter'] },
  { id: 'adult', words: /속궁합|스킨십|잠자리|밤궁합/, reply: '두 사람의 친밀감과 표현 방식이 궁금하시군요. 성인 인증 후 볼 수 있는 풀이와 함께 두 사람의 기본 궁합을 추천드려요.', items: ['adult_gunghap', 'gunghap'] },
  { id: 'some', words: /썸|짝사랑|고백|좋아하는\s*사람|관심\s*있는|밀당|연락이\s*(없|안)/, reply: '마음이 오가는 시기라 더 궁금하시죠. 지금 관계의 흐름과 그 사람과의 결을 함께 보는 걸 추천드려요.', items: ['tarot_some', 'love_flow', 'gunghap'] },
  { id: 'reunion', words: /헤어|이별|재회|전\s*(남친|여친|남자친구|여자친구|애인)|다시\s*만|잊지\s*못|차였|돌아올/, reply: '마음이 많이 아프셨겠어요. 다시 닿을 수 있는 시기와 지금 마음을 정리하는 방법부터 살펴보세요.', items: ['reunion', 'love_flow', '@friend'] },
  { id: 'marriage', words: /결혼|배우자|상견례|청혼|프러포즈|예비\s*(신랑|신부)|혼인/, reply: '평생을 함께할 인연에 대한 고민이시군요. 결혼의 시기와 두 사람의 합을 함께 보시는 걸 추천드려요.', items: ['marriage', 'gunghap'] },
  { id: 'match', words: /궁합|우리\s*사이|커플|잘\s*맞|남편|아내|부부/, reply: '두 사람의 관계가 궁금하시군요. 두 사주가 만나는 방식부터 보시면 좋아요.', items: ['gunghap', 'marriage'] },
  { id: 'love', words: /연애|남친|여친|남자친구|여자친구|애인|소개팅|인연|외로|만남|솔로/, reply: '좋은 인연이 언제 들어오는지, 내 연애 흐름부터 살펴보세요.', items: ['love_flow', 'tarot_some', 'gunghap'] },
  // 직장·이직과 창업·사업이 한 문장에 함께 있으면 먼저 어느 쪽인지 되묻는다(R5 E5)
  { id: 'mixed', words: /(?=.*(취업|이직|퇴사|직장|회사))(?=.*(창업|사업|가게|장사|자영업))/, reply: '직장·이직과 창업·사업 이야기가 함께 있네요. 지금 더 궁금한 쪽을 골라 주시면 거기에 맞는 풀이를 찾아 드릴게요.', items: [], ask: [['직장·이직 쪽이에요', '이직을 고민 중이야'], ['창업·사업 쪽이에요', '창업을 준비 중이야']] },
  { id: 'exam', words: /시험|합격|수능|자격증|공부|공무원|고시|입시|수험/, reply: '준비하신 만큼 좋은 결과가 있기를 바라요. 합격을 약속할 수는 없지만, 집중이 잘 되는 시기와 오늘의 공부 순서를 상담사와 함께 정리해 보세요.', items: ['@friend', '@charm', 'newyear_2027'] },
  { id: 'promo', words: /승진|진급|인사\s*평가|고과|보직/, reply: '인정받고 한 단계 올라서는 시기가 궁금하시군요. 결과를 보장하진 않지만, 나에게 맞는 일의 방향과 움직이기 좋은 때를 함께 살펴보세요.', items: ['career', '@friend', 'newyear_2027'] },
  { id: 'career', words: /취업|이직|퇴사|직장|회사|면접|진로|적성|알바|상사|일이\s*안/, reply: '일과 진로에 대한 고민이시군요. 나에게 맞는 일의 방향과 움직이기 좋은 시기를 추천드려요.', items: ['career', 'path_deep', '@friend'] },
  { id: 'business', words: /사업|창업|가게|장사|매출|손님|프리랜서|자영업/, reply: '사업의 흐름이 궁금하시군요. 확장·시작하기 좋은 시기와 재물 흐름을 함께 보세요.', items: ['money_business', 'money_wealth', 'money_pack'] },
  { id: 'invest', words: /투자|주식|코인|펀드|재테크/, reply: '투자는 예측이 아니라 나의 흐름을 참고하는 용도로 보시면 좋아요. 내 투자 성향과 신중할 시기를 함께 살펴보세요.', items: ['money_invest', 'money_wealth'] },
  { id: 'estate', words: /집|이사|전세|월세|매매|부동산|청약|아파트/, reply: '집과 자리에 대한 고민이시군요. 움직이기 좋은 시기와 계약할 때 조심할 달을 살펴보세요.', items: ['money_estate', 'money_wealth'] },
  { id: 'money', words: /돈|재물|부자|빚|대출|월급|수입|금전|돈복|로또/, reply: '돈이 들어오고 모이는 흐름이 궁금하시군요. 나의 재물 그릇과 좋은 시기부터 보세요.', items: ['money_wealth', 'money_pack', 'money_business'] },
  { id: 'choice', words: /선택|결정|고민|갈림길|어떡|할까|말까|망설/, reply: '두 갈래 사이에서 고민 중이시군요. 두 선택을 사주 흐름으로 나란히 비교해 보세요.', items: ['path_deep', '@path', '@friend'] },
  { id: 'month', words: /이번\s*달|다음\s*달|월운|한\s*달|\d{1,2}\s*월/, reply: '궁금한 달의 흐름을 날짜별로 살펴보세요. 원하는 달을 골라 볼 수 있어요.', items: ['month_detail', 'newyear_2027'] },
  { id: 'year', words: /올해|내년|새해|신년|2027|한\s*해/, reply: '한 해의 큰 흐름부터 잡아 두면 마음이 편해져요. 2027 신년운세를 추천드려요.', items: ['newyear_2027', 'month_detail'] },
  { id: 'self', words: /성격|나는\s*어떤|사주|운명|평생|타고난|mbti|엠비티아이/i, reply: '타고난 나를 먼저 알면 다른 고민도 쉬워져요. 사주 전체 풀이와 MBTI를 함께 보는 풀이를 추천드려요.', items: ['lifetime', 'mbti_deep'] },
  { id: 'mind', words: /우울|힘들|불안|지쳐|외롭|답답|속상|위로/, reply: '요즘 마음이 많이 지치셨군요. 사주를 아는 상담 친구에게 편하게 이야기하거나, 오늘의 마음을 편지로 남겨 보세요.', items: ['@friend', '@letter', 'newyear_2027'] },
];
const FREE: Record<string, Rec> = {
  '@friend': { to: '/friend', title: '달빛 상담사 서월', copy: '내 사주를 아는 상담사 · 하루 3번 무료' },
  '@letter': { to: '/letter', title: '달빛편지', copy: '지금의 마음을 편지로 남기고 다시 읽기 · 무료' },
  '@charm': { to: '/charm', title: '나만의 황금부적', copy: '합격·소망을 담은 나만의 부적 · 무료' },
  '@path': { to: '/path', title: '운명의 갈림길', copy: '두 선택을 사주 흐름으로 비교 · 무료' },
};
const CHIPS: [string, string][] = [['연애·새 인연', '새로운 인연을 만나고 싶어'], ['재회·이별', '헤어진 사람이 자꾸 생각나'], ['궁합·결혼', '결혼 상대와 잘 맞을까'], ['재물·사업', '돈이 언제 들어올까'], ['진로·이직', '이직을 고민 중이야'], ['승진·시험', '승진 시험을 준비 중이야'], ['신년운세', '내년 운세가 궁금해']];
const DEFAULT = ['newyear_2027', 'love_flow', 'money_wealth'];

const products = brand.products as { id: string; title: string; cardCopy: string; price: number; visible?: boolean; adult?: boolean }[];
function recOf(id: string): Rec | null {
  if (id.startsWith('@')) return FREE[id] ?? null;
  const p = products.find((x) => x.id === id);
  if (!p || p.visible === false) return null;
  return { to: `/product/${p.id}`, title: p.title, copy: p.cardCopy, price: p.price };
}
export function recommend(text: string) {
  const it = INTENTS.find((x) => x.words.test(text));
  const ids = it ? it.items : DEFAULT;
  const recs = ids.map(recOf).filter((r): r is Rec => !!r).slice(0, 3);
  return { intent: it?.id ?? 'none', ask: it?.ask, reply: it ? it.reply : '말씀해 주셔서 고마워요. 지금 많은 분들이 가장 먼저 보는 풀이부터 안내해 드릴게요. 조금 더 구체적으로 적어 주시면 더 잘 맞는 풀이를 찾아 드려요.', recs };
}

type Msg = { who: 'bot' | 'me'; text: string; recs?: Rec[]; ask?: [string, string][] };
const HELLO: Msg = { who: 'bot', text: '안녕하세요, 달새김 운세 길잡이예요. 요즘 어떤 고민이 있으세요? 한 줄로 편하게 적어 주시면 지금 나에게 맞는 풀이를 바로 찾아 드릴게요.' };

export function GuideWidget() {
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('gd-hide') === '1'; } catch { return false; } });
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<Msg[]>([HELLO]);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const [mini, setMini] = useState(false); // 스크롤하면 사진만 남게 작게(상품 카드를 가리지 않게 · R5 N5)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [log, open]);
  useEffect(() => {
    // 좁은 화면(360px 이하)은 처음부터 사진만, 넓은 화면은 맨 위에서만 문구를 보여 준다
    // 넓은 화면도 4초 뒤에는 사진만 남겨 상품 카드를 가리지 않는다
    let late = false;
    const on = () => setMini(late || innerWidth <= 360 || scrollY > 120);
    on();
    const t = setTimeout(() => { late = true; on(); }, 4000);
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { clearTimeout(t); removeEventListener('scroll', on); removeEventListener('resize', on); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open]);
  const ask = (q: string) => {
    const t = q.trim();
    if (!t) return;
    const r = recommend(t);
    track('guide_ask', { intent: r.intent });
    setLog((l) => [...l, { who: 'me', text: t }, { who: 'bot', text: r.reply, recs: r.recs, ask: r.ask }]);
    setText('');
  };
  if (hidden && !open) return null;
  return (
    <>
      {!open && (
        <div className={`gd-fab${mini ? ' mini' : ''}`} role="group" aria-label="고민 길잡이">
          <button className="row" style={{ gap: 10, textAlign: 'left' }} aria-label="고민 길잡이 열기" onClick={() => { setOpen(true); track('guide_open'); }}>
            <img src="/img/ui/guide.webp" alt="" />
            <span><b>어떤 고민이 있으세요?</b><small>맞춤 운세 찾기 · 무료</small></span>
          </button>
          <button className="x" aria-label="길잡이 닫기" onClick={() => { setHidden(true); try { sessionStorage.setItem('gd-hide', '1'); } catch { /* */ } }}><I.close size={16} /></button>
        </div>
      )}
      {open && (
        <div className="gd-panel" role="dialog" aria-modal="true" aria-label="달새김 운세 길잡이" onClick={() => setOpen(false)}>
          <div className="gd-box" onClick={(e) => e.stopPropagation()}>
            <div className="gd-head">
              <img src="/img/ui/guide.webp" alt="" />
              <span><b>달새김 운세 길잡이</b><small>고민에 맞는 풀이를 함께 찾아 드려요</small></span>
              <button className="icon-btn" aria-label="닫기" onClick={() => setOpen(false)}><I.close /></button>
            </div>
            <div className="gd-log" aria-live="polite">
              {log.map((m, i) => (
                <div key={i} className="stack" style={{ display: 'grid', gap: 8 }}>
                  <div className={`gd-msg ${m.who}`}>{m.text}</div>
                  {m.ask && i === log.length - 1 && <div className="gd-ask">{m.ask.map(([l, q]) => <button key={l} onClick={() => ask(q)}>{l}</button>)}</div>}
                  {m.recs && m.recs.length > 0 && (
                    <div className="gd-recs">
                      {m.recs.map((r) => (
                        <Link key={r.to} to={r.to} className="prow" onClick={() => { setOpen(false); track('guide_pick', { to: r.to }); }}>
                          <span className="grow"><b>{r.title}</b><small>{r.copy}</small></span>
                          {r.price ? <span className="pp">{won(r.price)}</span> : <span className="soon" style={{ background: '#e8f0ec', color: '#3f6d5a' }}>무료</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="gd-chips">{CHIPS.map(([l, q]) => <button key={l} onClick={() => ask(q)}>{l}</button>)}</div>
            <p className="gd-note">입력한 고민은 저장하거나 서버로 보내지 않아요. 연락처 같은 개인정보는 적지 마세요.</p>
            <form className="gd-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="예) 여자친구랑 헤어졌어요" maxLength={80} aria-label="고민 입력" />
              <button type="submit" aria-label="보내기"><I.send /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
