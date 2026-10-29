// 마음 보내기 — 소중한 사람에게 '내가 쓴' 부적·편지를 이미지 그대로 보낸다(10/29 대표님 요청).
// 나에게 오는 달빛 편지(상담사가 써 줌)·나만의 부적과 분리: 여기서는 보내는 사람·받는 사람·전할 내용을 고객이 직접 정한다.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CHARMS, type CharmType } from '@dalsaegim/content';
import { Top, useToast } from '../components/ui';
import { useMain } from '../store/app';
import { cardOf, drawCharm } from './Charm';
import { LETTER_THEMES, canShareFile, downloadData, drawLetterCard, fileOf, inKakao, sendImage, uploadGift, type LetterTheme } from '../lib/gift';
import { track } from '../lib/track';

type Kind = 'charm' | 'letter';
/** 호칭 — '진순숙 사장님'처럼 이미 '님'으로 끝나면 다시 붙이지 않는다 */
const nim = (n: string) => { const t = n.trim(); return /님$/.test(t) ? t : `${t}님`; };

export default function GiftPage() {
  const [sp] = useSearchParams();
  const { profile, isSample } = useMain();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>(sp.get('k') === 'letter' ? 'letter' : 'charm');
  const [to, setTo] = useState('');
  const [from, setFrom] = useState(isSample ? '' : profile.name);
  const [type, setType] = useState<CharmType>(CHARMS.find((x) => x.id === sp.get('type'))?.id ?? 'wish');
  const [wish, setWish] = useState('');
  const [theme, setTheme] = useState<LetterTheme>('cheer');
  const [body, setBody] = useState('');
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [save, setSave] = useState<string | null>(null); // 저장 안내 창(링크)
  useEffect(() => { setImg(null); setFile(null); }, [kind, to, from, type, wish, theme, body]);
  const c = CHARMS.find((x) => x.id === type)!;
  const th = LETTER_THEMES.find((t) => t.id === theme)!;
  const content = kind === 'charm' ? wish.trim() : body.trim();
  const ok = to.trim() && from.trim() && content.length >= 2;
  const missing = !to.trim() ? '받는 사람 이름을 적어 주세요' : !from.trim() ? '보내는 사람 이름을 적어 주세요' : content.length < 2 ? (kind === 'charm' ? '전할 소망을 적거나 골라 주세요' : '편지 내용을 적거나 골라 주세요') : '';

  const make = async () => {
    if (!ok) { toast(missing); return; }
    setBusy(true);
    try {
      const data = kind === 'charm' ? await drawCharm(type, to.trim(), wish.trim(), { to: to.trim(), from: from.trim() }) : await drawLetterCard({ to: to.trim(), from: from.trim(), body: body.trim(), theme });
      setImg(data); setFile(fileOf(data, kind === 'charm' ? `달새김_${c.name}_${to.trim()}.png` : `달새김_마음편지_${to.trim()}.jpg`));
      track('gift_make', { kind });
      setTimeout(() => document.getElementById('gift-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch { toast('이미지를 만들지 못했어요. 다시 시도해 주세요'); } finally { setBusy(false); }
  };
  const info = () => ({ kind, title: kind === 'charm' ? c.name : `${th.label} 편지`, fromName: from.trim(), toName: to.trim() });
  const send = async () => {
    if (!img || !file || busy) return;
    setBusy(true); track('gift_send', { kind, how: canShareFile(file) ? 'share' : inKakao() ? 'kakao' : 'save' });
    try {
      const r = await sendImage(file, img, info());
      if (r.mode === 'save') setSave(r.url ?? '');
      if (r.mode === 'external') toast('외부 브라우저에서 [이미지로 보내기]를 눌러 주세요');
    } catch (e) { toast((e as Error).message || '잠시 후 다시 보내 주세요'); } finally { setBusy(false); }
  };
  const link = async () => {
    if (!img || busy) return;
    setBusy(true);
    try {
      const r = await uploadGift(img, info());
      const text = `${nim(to)}께, ${nim(from)}이 보낸 ${kind === 'charm' ? c.name : `${th.label} 편지`}`;
      if (navigator.share && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) { try { await navigator.share({ title: text, text, url: r.url }); return; } catch { /* 취소 */ } }
      await navigator.clipboard?.writeText(`${text}\n${r.url}`); toast('링크를 복사했어요. 대화창에 붙여 넣으면 이미지가 함께 보여요');
    } catch (e) { toast((e as Error).message || '잠시 후 다시 시도해 주세요'); } finally { setBusy(false); }
  };

  return (
    <>
      <Top title="마음 보내기" />
      <main className={`screen gift-page ${kind}`}>
        <section className="gift-intro">
          <h2 className="h2">소중한 사람에게<br />내 마음을 보내요</h2>
          <p className="muted small mt8">내가 쓴 부적·편지를 <b>이미지 그대로</b> 카카오톡·라인·인스타·문자로 보내요.</p>
          <p className="faint mt4" style={{ margin: '4px 0 0', fontSize: 13 }}>나에게 오는 편지는 <Link to="/letter/new" className="link">달빛 편지</Link>, 나를 위한 부적은 <Link to="/charm" className="link">나만의 황금부적</Link>에서 받아요.</p>
        </section>

        <div className="seg gift-seg mt16" role="tablist">
          {([['charm', '황금부적 보내기'], ['letter', '마음 편지 보내기']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
        </div>

        <section className="gift-box mt16" aria-labelledby="g1">
          <h3 className="h3" id="g1"><span className="gstep">1</span>누가, 누구에게 보내나요?</h3>
          <div className="gift-who mt12">
            <label className="field"><span>보내는 사람 (나)</span><input className="input" maxLength={12} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="예) 큰딸, 지훈" /></label>
            <span className="gift-arrow" aria-hidden>→</span>
            <label className="field"><span>받는 사람</span><input className="input" maxLength={12} value={to} onChange={(e) => setTo(e.target.value)} placeholder="예) 엄마, 민지" /></label>
          </div>
        </section>

        {kind === 'charm' ? (
          <section className="gift-box mt12" aria-labelledby="g2">
            <h3 className="h3" id="g2"><span className="gstep">2</span>어떤 부적을 보낼까요?</h3>
            <div className="gift-types mt12">
              {CHARMS.map((x) => (
                <button key={x.id} className={type === x.id ? 'on' : ''} aria-pressed={type === x.id} onClick={() => { setType(x.id); setWish(''); }}>
                  <span className="gt-img" style={{ backgroundImage: `url(${cardOf(x.id)})` }}><i style={{ color: x.tint }}>{x.mark}</i></span>
                  <b>{x.label}</b>
                </button>
              ))}
            </div>
            <h3 className="h3 mt20"><span className="gstep">3</span>{to.trim() || '받는 분'}께 전할 소망</h3>
            <div className="gift-ex mt8">{c.wishes.map((w) => <button key={w} className={wish === w ? 'on' : ''} onClick={() => setWish(w)}>“{w}”</button>)}</div>
            <input className="input mt8" maxLength={40} value={wish} onChange={(e) => setWish(e.target.value)} placeholder="골라도 되고, 직접 써도 돼요 (40자 이내)" />
          </section>
        ) : (
          <section className="gift-box mt12" aria-labelledby="g2">
            <h3 className="h3" id="g2"><span className="gstep">2</span>어떤 마음인가요?</h3>
            <div className="qchips mt8">{LETTER_THEMES.map((t) => <button key={t.id} className={theme === t.id ? 'on' : ''} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</button>)}</div>
            <h3 className="h3 mt20"><span className="gstep">3</span>{to.trim() || '받는 분'}께 쓰는 편지</h3>
            <div className="gift-ex mt8">{th.ex.map((w) => <button key={w} onClick={() => setBody((b) => (b.trim() ? `${b.trim()}\n${w}` : w))}>+ {w}</button>)}</div>
            <textarea className="input mt8" rows={6} maxLength={220} value={body} onChange={(e) => setBody(e.target.value)} placeholder="문장을 눌러 넣거나, 직접 써 주세요 (220자 이내)" />
            <p className="faint mt4" style={{ margin: '4px 0 0', textAlign: 'right', fontSize: 12.5 }}>{body.length}/220 · AI가 아니라 내가 쓴 글이 그대로 들어가요</p>
          </section>
        )}

        <button className="btn gold-lux mt16" onClick={make} disabled={busy}>{busy && !img ? '만드는 중…' : img ? '다시 만들기' : '이미지 만들기'}</button>
        {!ok && <p className="faint center mt8" style={{ fontSize: 13 }}>{missing}</p>}

        {img && (
          <section id="gift-preview" className="gift-preview mt20" aria-label="보낼 이미지">
            <p className="gp-head"><b>{nim(to)}</b>께 보낼 {kind === 'charm' ? '부적' : '편지'}이에요</p>
            <img src={img} alt={`${nim(to)}께 보내는 ${kind === 'charm' ? c.name : '편지'}`} />
            <button className="btn gold-lux gift-send mt12" onClick={send} disabled={busy}>{busy ? '준비하는 중…' : '이미지로 보내기'}<small>카카오톡 · 라인 · 인스타 · 문자</small></button>
            {inKakao() && !canShareFile(file) && <p className="faint mt8" style={{ fontSize: 13, textAlign: 'center' }}>카카오톡 안에서는 사진 보내기 창이 열리지 않아, 버튼을 누르면 휴대폰 브라우저로 옮겨서 보내요.</p>}
            <div className="grid2 mt8">
              <button className="btn line sm" onClick={() => downloadData(img, file?.name ?? 'dalsaegim.png')}>이미지 저장</button>
              <button className="btn line sm" onClick={link} disabled={busy}>링크로 보내기</button>
            </div>
          </section>
        )}
      </main>

      {save !== null && img && (
        <div className="gift-save" role="dialog" aria-modal="true" aria-label="이미지 저장 안내" onClick={(e) => { if (e.target === e.currentTarget) setSave(null); }}>
          <div className="gs-box">
            <b>이 화면에서는 사진 보내기 창이 열리지 않아요</b>
            <p>이미지를 <b>길게 눌러 저장</b>하거나 아래 [이미지 저장]을 누른 뒤, 카카오톡 대화방에서 <b>사진</b>으로 보내 주세요.</p>
            <img src={img} alt="" />
            <div className="grid2 mt8">
              <button className="btn primary sm" onClick={() => downloadData(img, file?.name ?? 'dalsaegim.png')}>이미지 저장</button>
              <button className="btn line sm" onClick={() => { void navigator.clipboard?.writeText(save).then(() => toast('링크를 복사했어요')); }}>링크 복사</button>
            </div>
            <button className="btn line sm mt8" onClick={() => setSave(null)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
