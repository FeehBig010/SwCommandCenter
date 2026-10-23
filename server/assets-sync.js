import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {access,mkdir,readdir,readFile,rename,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {ASSET_REPOSITORY,ASSET_BRANCH,IMAGE_TREE,FIXTURE,PROJECT_ROOT,assetPaths,safeImageFilename} from './asset-paths.js';

const exec=promisify(execFile);
export async function runGit(args,cwd){
 const {stdout,stderr}=await exec('git',args,{cwd,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},timeout:300000,maxBuffer:4*1024*1024});
 return {stdout:stdout.trim(),stderr:stderr.trim()};
}
const exists=async target=>{try{await access(target);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};

// Keep Git metadata local. Only the artwork tree and generated ID manifest are public.
export async function writeImageManifest(root=PROJECT_ROOT,git=runGit){
 const paths=assetPaths(root),records=JSON.parse(await readFile(paths.fixture,'utf8'));
 const filenames=new Set(await readdir(path.join(paths.imageRoot,'monsters'))),monsters={};
 for(const row of records){
  const unit=row.model==='bestiary.monster'&&row.fields,id=Number(unit?.com2us_id),filename=unit?.image_filename;
  if(Number.isSafeInteger(id)&&id>=10000&&safeImageFilename(filename)&&filenames.has(filename))monsters[id]=filename;
 }
 if(!Object.keys(monsters).length)throw new Error('O bestiário não contém retratos locais válidos; o manifesto anterior foi preservado.');
 const {stdout:revision}=await git(['rev-parse','HEAD'],paths.checkout);
 const manifest={version:1,source:ASSET_REPOSITORY,revision,updatedAt:new Date().toISOString(),monsters};
 const temp=`${paths.manifest}.${process.pid}.tmp`;
 await writeFile(temp,`${JSON.stringify(manifest)}\n`);await rename(temp,paths.manifest);
 return manifest;
}

export function createAssetUpdater({root=PROJECT_ROOT,logger=console,git=runGit}={}){
 let inFlight;
 async function perform(pull){
  const {checkout,publicDir}=assetPaths(root),start=Date.now();
  logger.info(`[SW Assets] ${new Date().toISOString()} ${pull?'Iniciando atualização':'Preparando imagens locais'}: ${ASSET_REPOSITORY}`);
  try{
   if(!await exists(checkout)){
    await mkdir(path.dirname(checkout),{recursive:true});
    await git(['clone','--depth=1','--filter=blob:none','--sparse','--branch',ASSET_BRANCH,ASSET_REPOSITORY,checkout],publicDir);
   }
   // Never run git pull in the parent application repo when a checkout is missing.
   if(!await exists(path.join(checkout,'.git')))throw new Error(`A pasta ${checkout} não é o clone de imagens. Nenhum pull foi executado.`);
   const [top,origin,branch]=await Promise.all([
    git(['rev-parse','--show-toplevel'],checkout),git(['remote','get-url','origin'],checkout),git(['branch','--show-current'],checkout)
   ]);
   if(await realpath(top.stdout)!==await realpath(checkout)||origin.stdout!==ASSET_REPOSITORY||branch.stdout!==ASSET_BRANCH)throw new Error('Origem, diretório ou branch do clone de imagens não corresponde ao SWARFARM esperado.');
   await git(['sparse-checkout','set','--no-cone',`/${IMAGE_TREE}/`,`/${FIXTURE}`,'/LICENSE*'],checkout);
   let output='Clone local pronto.';
   if(pull){const result=await git(['pull','--ff-only','origin',ASSET_BRANCH],checkout);output=[result.stdout,result.stderr].filter(Boolean).join('\n');}
   const manifest=await writeImageManifest(root,git);
   logger.info(`[SW Assets] Sucesso: ${Object.keys(manifest.monsters).length} retratos indexados · revisão ${manifest.revision.slice(0,12)} · ${Date.now()-start}ms. ${output}`);
   return manifest;
  }catch(error){
   const detail=[error.message,error.stderr].filter(Boolean).join('\n').slice(0,6000);
   logger.error(`[SW Assets] Falha ao ${pull?'atualizar':'preparar'} imagens. Confira rede, Git e permissões. Código: ${error.code||'n/a'}. ${detail}`);
   throw error;
  }
 }
 return {
  sync({pull=true}={}){
   if(inFlight){logger.info('[SW Assets] Atualização já em andamento; reutilizando a execução atual.');return inFlight;}
   inFlight=perform(pull).finally(()=>{inFlight=null;});return inFlight;
  },
  get busy(){return !!inFlight;}
 };
}
