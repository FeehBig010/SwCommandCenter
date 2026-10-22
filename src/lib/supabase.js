import {createClient} from '@supabase/supabase-js';
import {publicSupabaseConfig} from './supabase-config';
const config=publicSupabaseConfig(import.meta.env);
export const supabaseConfigured=config.configured;
export const supabaseConfigError=config.error;
export const supabase=config.configured?createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null;
export function authRedirectUrl(){return `${window.location.origin}${window.location.pathname}`;}
