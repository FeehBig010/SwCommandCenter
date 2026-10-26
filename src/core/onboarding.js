export const ONBOARDING_KEY='has_completed_onboarding';
export const ONBOARDING_PENDING_KEY='onboarding_first_upload_pending';
export const ENERGY_KEY='dim_hole_alert_dismissed';
export function readFlag(key,storage){try{return (storage??globalThis.localStorage)?.getItem(key)==='true';}catch{return false;}}
export function writeFlag(key,valueOrStorage=true){try{const storage=typeof valueOrStorage==='object'?valueOrStorage:globalThis.localStorage;storage?.setItem(key,valueOrStorage===false?'false':'true');return true;}catch{return false;}}
export async function readOnboarding(client,userId){if(!client||!userId)return false;const {data,error}=await client.from('profiles').select('has_completed_onboarding').eq('id',userId).maybeSingle();if(error)throw new Error('Não foi possível verificar o tour na nuvem.');return data?.has_completed_onboarding===true;}
export async function finishOnboarding(client){if(!client)return;const {error}=await client.rpc('complete_my_onboarding');if(error)throw new Error('Tour concluído neste dispositivo; sincronização pendente.');}
export async function saveOwnProfile(client,name){const displayName=String(name||'').trim();if(displayName.length<2||displayName.length>80)throw new Error('Use um nome de 2 a 80 caracteres.');if(client){const {error}=await client.rpc('save_my_display_profile',{new_display_name:displayName});if(error)throw new Error('Não foi possível salvar o perfil. Confira a migration 007.');}return displayName;}
