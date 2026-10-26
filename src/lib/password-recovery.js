export function authErrorMessage(error,context='login'){
 const code=error?.code;
 if(error?.status===429||code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(code==='email_not_confirmed')return 'Confirme seu e-mail antes de entrar.';
 if(code==='invalid_credentials')return 'E-mail ou senha incorretos.';
 if(code==='weak_password')return 'Use uma senha mais forte, com pelo menos 8 caracteres.';
 if(code==='same_password')return 'Escolha uma senha diferente da atual.';
 if(['otp_expired','flow_state_expired','bad_code_verifier','session_not_found'].includes(code))return 'O link de recuperação expirou ou já foi utilizado. Solicite um novo link.';
 return {reset:'Não foi possível enviar o link de recuperação. Tente novamente.',update:'Não foi possível atualizar a senha. Solicite um novo link e tente novamente.',signup:'Não foi possível criar a conta. Confira os dados e tente novamente.',login:'Não foi possível entrar. Confira o e-mail e a senha.'}[context]||'Não foi possível concluir a operação. Tente novamente.';
}
export function recoveryRedirectUrl(location=window.location){const url=new URL(location.pathname,location.origin);url.searchParams.set('auth','recovery');url.hash='/portal';return url.href;}
export async function requestPasswordReset(client,email,redirectTo){
 if(!client)throw new Error('O serviço de autenticação está indisponível.');
 const {error}=await client.auth.resetPasswordForEmail(String(email).trim(),{redirectTo});if(error)throw error;
 return 'Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.';
}
export async function saveRecoveredPassword(client,password,confirmation){
 if(password.length<8)throw new Error('Use uma senha com pelo menos 8 caracteres.');
 if(password!==confirmation)throw new Error('As senhas não coincidem.');
 const {error}=await client.auth.updateUser({password});if(error)throw error;
}
export const RECOVERY_SESSION_KEY='sw-password-recovery-user';
