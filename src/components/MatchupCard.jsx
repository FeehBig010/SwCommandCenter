import {ARENA_CONTEXTS,arenaContextOf} from '../core/arena-context';
import MonsterPortrait from './MonsterPortrait';
export function Lineup({monsters}){return <div className="matchup-lineup">{monsters.map((m,i)=><span key={i}><MonsterPortrait master={m.masterId} name={m.label} element={m.masterId%10}/><strong>{m.label}</strong></span>)}</div>;}
export default function MatchupCard({matchup,children}){
 return <article className="matchup-card"><h3>{matchup.name}</h3><span className="template-badge">{matchup.offense.gameMode==='arena'?`${ARENA_CONTEXTS[arenaContextOf(matchup.offense)]||'Arena sem classificação'} · `:''}Ofensa · {matchup.offense.configs.length} slots</span><Lineup monsters={matchup.offense.configs}/><div className="versus-divider">VS Defesa Inimiga</div><Lineup monsters={matchup.enemyDefense}/><p className="fineprint">Resultado registrado: {({win:'Vitória',loss:'Derrota',unrecorded:'Não registrado'})[matchup.outcome]} · Não é uma previsão de vitória.</p>{matchup.notes&&<p>{matchup.notes}</p>}<div className="button-group">{children}</div></article>;
}
