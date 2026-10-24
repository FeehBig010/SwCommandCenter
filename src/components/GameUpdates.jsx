import {useEffect,useState} from 'react';
import {Newspaper,RefreshCw,ExternalLink,CalendarDays,Search,WifiOff} from 'lucide-react';
import {HIVE_NEWS_URL,NEWS_CATEGORIES,NEWS_FALLBACK,NEWS_STALE_MS} from '../core/game-updates';
import {cachedGameUpdates,fetchGameUpdates} from '../lib/game-updates';
import './GameUpdates.css';

const dateFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
function NewsCard({item}){
 const [failed,setFailed]=useState(false);
 return <article className="game-news-card" aria-label={item.title}>
  <div className={`game-news-image ${!item.thumbnail||failed?'is-fallback':''}`}><img src={failed||!item.thumbnail?NEWS_FALLBACK:item.thumbnail} alt="" loading="lazy" width="640" height="360" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/><span className={`game-news-category category-${item.category}`}>{NEWS_CATEGORIES[item.category]}</span></div>
  <div className="game-news-content"><time dateTime={item.publishedAt||undefined}><CalendarDays size={13}/>{item.publishedAt?dateFormat.format(new Date(item.publishedAt)):'Data não informada'}</time><h2>{item.title}</h2><a className="button small game-news-read" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Ler mais: ${item.title} (nova aba)`}>Ler Mais<ExternalLink size={14}/></a></div>
 </article>;
}
export default function GameUpdates(){
 const [feed,setFeed]=useState(cachedGameUpdates),[loading,setLoading]=useState(true),[error,setError]=useState(''),[category,setCategory]=useState('all'),[query,setQuery]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setError('');
  fetchGameUpdates({signal:controller.signal}).then(setFeed).catch(error=>{if(!controller.signal.aborted)setError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[revision]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')setRevision(n=>n+1);},300000);return()=>clearInterval(timer);},[]);
 const stale=feed&&Date.now()-Date.parse(feed.fetchedAt)>NEWS_STALE_MS;
 const filtered=(feed?.items||[]).filter(item=>(category==='all'||item.category===category)&&item.title.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
 return <section className="game-updates" aria-labelledby="game-updates-title">
  <header className="game-updates-header"><div><span className="eyebrow">SUMMONERS WAR · SKY ARENA</span><h1 id="game-updates-title"><Newspaper size={28}/>Atualizações do Jogo</h1><p>Notícias, eventos e notas oficiais da Com2uS.</p></div><div className="button-group"><button type="button" className="button small" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={15} className={loading?'spin':undefined}/>{loading?'Atualizando…':'Atualizar'}</button><a className="button small outline" href={HIVE_NEWS_URL} target="_blank" rel="noopener noreferrer">Abrir Hive<ExternalLink size={14}/></a></div></header>
  <div className="game-news-toolbar"><div className="game-news-filters" role="group" aria-label="Categorias de notícias">{[['all','Todas'],...Object.entries(NEWS_CATEGORIES)].map(([key,label])=><button type="button" key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{label}</button>)}</div><label className="game-news-search"><Search size={16}/><span className="screen-reader-only">Buscar notícias</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar notícias…"/></label></div>
  {feed&&<div className="game-news-sync"><span>Fonte: WithHive / Com2uS</span><span>Sincronizado em {dateFormat.format(new Date(feed.fetchedAt))}</span></div>}
  {(error||stale||feed?.partial)&&<div className="game-news-warning" role="status"><WifiOff size={16}/><span>{error||(feed?.partial?'Uma das listagens da Hive está indisponível. As notícias já sincronizadas foram mantidas.':'A última sincronização tem mais de 6 horas. Consulte a Hive para novidades mais recentes.')}{error&&feed?' Exibindo a última versão salva.':''}</span></div>}
  {loading&&!feed?<div className="game-news-grid" role="status" aria-label="Carregando notícias oficiais">{Array.from({length:6},(_,i)=><div key={i} className="game-news-skeleton" aria-hidden="true"><div/><span/><span/></div>)}</div>:filtered.length?<div className="game-news-grid" aria-label="Notícias oficiais">{filtered.map(item=><NewsCard key={`${item.id}:${item.thumbnail}`} item={item}/>)}</div>:<div className="game-news-empty"><Newspaper size={38}/><h2>{feed?.items.length?'Nenhuma notícia encontrada':'Notícias temporariamente indisponíveis'}</h2><p>{feed?.items.length?'Ajuste a busca ou escolha outra categoria.':'Tente novamente ou acompanhe as publicações no site oficial da Hive.'}</p>{!feed?.items.length&&<button type="button" className="button small" disabled={loading} onClick={()=>setRevision(n=>n+1)}>Tentar novamente</button>}</div>}
 </section>;
}
