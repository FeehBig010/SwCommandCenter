export function parseSwexJson(text){
 try{return JSON.parse(text);}catch{throw new Error('O arquivo não é um JSON válido. Exporte novamente pelo SWEX e tente importar.');}
}
export function swexImportError(error){
 const message=String(error?.message||'');
 return /^(O arquivo não é um JSON válido|Escolha um JSON original do SWEX|Inventário acima do limite|Não há monstros e runas válidos)/.test(message)?message:'Não foi possível processar o inventário. Confira se o arquivo é uma exportação completa do SWEX.';
}
