import {memo, useEffect, useState} from 'react';
import {ArrowRight, CloudUpload, Gift, LockKeyhole, Swords} from 'lucide-react';
import {HOME_CARDS} from '../core/home-modules';
import {AccountEntry,CalculatorEntry} from './EntryPortal';
import CouponModule from './CouponModule';
import HomeModuleCards from './HomeModuleCards';
import './CinematicHome.css';

const SyncCard = memo(AccountEntry), CalculatorCard = memo(CalculatorEntry), CouponsCard = memo(CouponModule);
const scenes = new Map();

function prepareScene(src) {
  if (!scenes.has(src)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => typeof image.decode === 'function' ? image.decode().then(resolve, reject) : resolve();
      image.onerror = reject;
      image.src = src;
    });
    scenes.set(src, promise);
    promise.catch(() => scenes.delete(src));
  }
  return scenes.get(src);
}

function useHomeMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query), change = () => setMatches(media.matches);
    media.addEventListener('change', change);
    change();
    return () => media.removeEventListener('change', change);
  }, [query]);
  return matches;
}

function HomeScenery({active}) {
  const [visible, setVisible] = useState(null), [ready, setReady] = useState([]);
  useEffect(() => {
    let live = true, timer;
    const module = HOME_CARDS[active];
    prepareScene(module.scene).then(() => {
      if (!live) return;
      setReady(old => old.includes(active) ? old : [...old, active]);
      setVisible(active);
      // Only the next scene is prefetched. Failed images keep the existing scene.
      timer = setTimeout(() => prepareScene(HOME_CARDS[(active + 1) % HOME_CARDS.length].scene).catch(() => {}), 200);
    }).catch(() => {});
    return () => { live = false; clearTimeout(timer); };
  }, [active]);
  return <div className="home-scenery" aria-hidden="true">
    {HOME_CARDS.map((module, index) => <div key={module.id} className={`home-scene-layer ${visible === index ? 'is-visible' : ''}`}
      style={ready.includes(index) ? {backgroundImage: `url("${module.scene}")`} : undefined}/>)}
    <div className="home-scenery-shade"/>
  </div>;
}

export default function CinematicHome({onNavigate, ...portalProps}) {
  const [active, setActive] = useState(0);
  const mobile = useHomeMedia('(max-width: 760px)'), reducedMotion = useHomeMedia('(prefers-reduced-motion: reduce)');
  const module = HOME_CARDS[active];

  const tools = {calculator:<CalculatorCard onQuick={portalProps.onQuick} busy={portalProps.busy}/>,sync:<SyncCard {...portalProps} embedded/>,coupons:<CouponsCard/>};

  return <div className="cinematic-home" onDragOver={event => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  }} onDrop={event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    if (!portalProps.busy && event.dataTransfer.files.length) portalProps.onFile(event.dataTransfer.files[0]);
  }}>
    <section className="home-opening" aria-labelledby="home-title">
      <HomeScenery active={active}/>
      <header className="home-heading"><div>
        <p className="home-eyebrow">CLÃ D8STINO · EURO</p>
        <h1 id="home-title">SW Command Center</h1>
        <p className="home-subtitle">Seu próximo movimento começa aqui.</p>
      </div><span className="home-command-mark" aria-hidden="true">CENTRAL DE COMANDO</span></header>
      <div className="home-stage">
        <section className="home-module-copy" id="home-active-module" aria-live="polite" aria-atomic="true" aria-label="Módulo selecionado">
          <div key={module.id} className="home-copy-arrival"><span className="home-chapter">{String(active + 1).padStart(2, '0')} <i/> EXPLORE SUA CENTRAL</span>
            <h2>{module.title}</h2><p>{module.description}</p><small>{module.detail}</small>
            {portalProps.account && module.id === 'account' && <span className="home-account-badge"><span/>{portalProps.account.name}</span>}
          </div>
        </section>
        <HomeModuleCards active={active} onSelect={setActive} onNavigate={onNavigate} mobile={mobile}
          reducedMotion={reducedMotion} busy={portalProps.busy} tools={tools}/>
      </div>
      <div className="home-resources-bar"><span><LockKeyhole size={13}/>Seu inventário, no seu espaço.</span><div>
        <button type="button" disabled={portalProps.busy} onClick={portalProps.onQuick}><Swords size={15}/>Calculadora Livre</button>
        <button type="button" disabled={portalProps.busy} onClick={()=>setActive(4)}><CloudUpload size={15}/>Sincronizar SWEX e ver cupons<ArrowRight size={15}/></button>
        <button type="button" disabled={portalProps.busy} onClick={()=>setActive(5)}><Gift size={15}/>Códigos &amp; Eventos</button>
      </div></div>
    </section>
  </div>;
}
