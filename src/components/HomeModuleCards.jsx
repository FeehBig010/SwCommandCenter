import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, ChevronLeft, ChevronRight, Gem, Shield, Users} from 'lucide-react';
import {HOME_MODULES, homeCardFromKey} from '../core/home-modules';

const ICONS = {account: Shield, build: Gem, guild: Users};

function CardArt({module}) {
  const [failed, setFailed] = useState(false);
  return <>
    {!failed && <img className={`home-card-art art-${module.id}`} src={module.image}
      alt={module.imageAlt} decoding="async" onError={() => setFailed(true)}/>}
    <span className="home-card-shade" aria-hidden="true"/>
    {module.id === 'guild' && <img className="home-card-crest" src="/art/home/guild-crest.webp" alt="" decoding="async"/>}
    {module.id === 'build' && <span className="home-card-runes" aria-hidden="true">
      {['violent', 'swift', 'will'].map(set => <span key={set}><img src={`/game-icons/runes/${set}.png`} alt="" decoding="async"/></span>)}
    </span>}
  </>;
}

export default function HomeModuleCards({active, onSelect, onNavigate, mobile, reducedMotion, busy}) {
  const trackRef = useRef(null), cards = useRef([]), selectors = useRef([]);
  const scrollFrame = useRef(null), programmaticTarget = useRef(null);

  function centerCard(index, smooth = true) {
    const track = trackRef.current, card = cards.current[index];
    if (!mobile || !track || !card) return;
    programmaticTarget.current = index;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: smooth && !reducedMotion ? 'smooth' : 'instant',
    });
  }

  function select(index, focus = false) {
    onSelect(index);
    centerCard(index);
    if (focus) selectors.current[index]?.focus({preventScroll: true});
  }

  function onCardKey(event, index) {
    const next = homeCardFromKey(event.key, index);
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  }

  function onScroll() {
    if (!mobile || scrollFrame.current !== null) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const track = trackRef.current;
      if (!track) return;
      const viewport = track.getBoundingClientRect(), middle = viewport.left + viewport.width / 2;
      let nearest = 0, distance = Infinity;
      cards.current.forEach((card, index) => {
        if (!card) return;
        const rect = card.getBoundingClientRect(), delta = Math.abs(rect.left + rect.width / 2 - middle);
        if (delta < distance) { nearest = index; distance = delta; }
      });
      if (programmaticTarget.current !== null) {
        if (programmaticTarget.current === nearest && distance < 3) programmaticTarget.current = null;
        else return;
      }
      onSelect(nearest);
    });
  }

  useEffect(() => {
    if (mobile) centerCard(active, false);
    else programmaticTarget.current = null;
    // A breakpoint change preserves the selection without animating a re-layout.
  }, [mobile]);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  return <div className="home-card-browser">
    <div className="home-deck" aria-label="Módulos principais">
      <div className="home-card-track" ref={trackRef} onScroll={onScroll}
        onPointerDown={() => { programmaticTarget.current = null; }}
        onWheel={() => { programmaticTarget.current = null; }}>
        {HOME_MODULES.map((module, index) => {
          const selected = index === active, Icon = ICONS[module.id];
          return <article key={module.id} ref={node => { cards.current[index] = node; }}
            className={`home-module-card ${selected ? 'is-active' : ''}`}
            data-module={module.id} data-side={index < active ? 'left' : 'right'}
            style={{'--card-index': index, '--card-scale': selected ? 1 : .84,
              '--card-y': selected ? '0px' : '30px', zIndex: 4 - Math.abs(index - active)}}>
            <div className="home-card-arrival">
              <CardArt module={module}/>
              <button type="button" className="home-card-selector" ref={node => { selectors.current[index] = node; }}
                disabled={busy} aria-label={`Selecionar ${module.title}`} aria-pressed={selected}
                aria-controls="home-active-module" onClick={() => select(index)} onKeyDown={event => onCardKey(event, index)}/>
              <div className="home-card-top" aria-hidden="true"><span>{String(index + 1).padStart(2, '0')}</span><Icon size={20}/></div>
              <div className="home-card-title"><small>{selected ? 'SELECIONADO' : 'EXPLORAR'}</small><h3>{module.title}</h3></div>
              <div className="home-card-access" aria-hidden={!selected} inert={!selected}>
                <p>{module.description}</p>
                <button type="button" className="home-enter" aria-label={`Entrar em ${module.title}`}
                  disabled={busy || !selected} onClick={() => onNavigate(module.page)}>Entrar<ArrowUpRight size={18}/></button>
              </div>
            </div>
          </article>;
        })}
      </div>
    </div>
    <div className="home-card-controls">
      <button type="button" disabled={busy} className="home-step" aria-label="Cartão anterior"
        onClick={() => select((active + HOME_MODULES.length - 1) % HOME_MODULES.length)}><ChevronLeft size={19}/></button>
      <div className="home-card-dots" aria-label="Escolher cartão">{HOME_MODULES.map((module, index) =>
        <button type="button" key={module.id} disabled={busy} aria-label={`Mostrar cartão ${module.title}`}
          aria-pressed={active === index} onClick={() => select(index)}><span/></button>)}</div>
      <span className="home-card-count" aria-hidden="true">{String(active + 1).padStart(2, '0')} / 03</span>
      <button type="button" disabled={busy} className="home-step" aria-label="Próximo cartão"
        onClick={() => select((active + 1) % HOME_MODULES.length)}><ChevronRight size={19}/></button>
    </div>
  </div>;
}
