export function publicSupabaseConfig(env={}){
 const url=String(env.VITE_SUPABASE_URL||'').trim(),key=String(env.VITE_SUPABASE_ANON_KEY||'').trim();
 if(!url||!key)return {configured:false,url:null,key:null,error:'Nuvem não configurada.'};
 try{
  const parsed=new URL(url);if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)))throw new Error();
  if(parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error();
  if(key.startsWith('sb_secret_'))throw new Error();
  if(key.split('.').length===3){let role;try{role=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;}catch{}if(role==='service_role')throw new Error();}
  return {configured:true,url:parsed.href.replace(/\/$/,''),key,error:''};
 }catch{return {configured:false,url:null,key:null,error:'Configuração pública do Supabase inválida. Use a URL do projeto e a chave anon/publishable.'};}
}
