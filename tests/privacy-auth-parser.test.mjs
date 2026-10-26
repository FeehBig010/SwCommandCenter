import test from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage,requestPasswordReset,saveRecoveredPassword,recoveryRedirectUrl} from '../src/lib/password-recovery.js';
import {normalizeAccount,normalizeAccountAsync} from '../src/core/data.js';
import {parseSwexJson,swexImportError} from '../src/core/swex-json.js';
import {combatSpeedFromSheet,combatAttributes,simulateFirstTurns,minimumSpeedForTick} from '../src/core/speedTuner.js';
import {createDemoAccount} from '../src/core/demo-account.js';
import {readFlag,writeFlag,ONBOARDING_KEY,ONBOARDING_PENDING_KEY,finishOnboarding} from '../src/core/onboarding.js';
const raw=()=>({wizard_info:{wizard_id:42},unit_list:[1,2,3,4,5].map(n=>({unit_id:n,unit_master_id:18913,con:700,spd:102,atk:800,def:600,runes:[null,{}, {rune_id:n,slot_no:2,set_id:3,class:6,pri_eff:[8,42],sec_eff:[]}],artifacts:[null,{}]})),runes:[],artifacts:null,rune_lock_list:[null],deck_list:[{dungeon_name:'DBAH',monster_ids:[1,{},null,4,5]}]});
test('password recovery uses official auth methods and returns non-enumerating PT-BR feedback',async()=>{
 let request;const client={auth:{resetPasswordForEmail:async(...args)=>(request=args,{error:null})}};
 const redirect=recoveryRedirectUrl({origin:'https://example.com',pathname:'/'});assert.equal(redirect,'https://example.com/?auth=recovery#/portal');
 assert.match(await requestPasswordReset(client,'  user@example.com ',redirect),/^Se houver uma conta/);assert.deepEqual(request,['user@example.com',{redirectTo:redirect}]);
 client.auth.resetPasswordForEmail=async()=>({error:{code:'over_email_send_rate_limit',message:'sensitive upstream'}});await assert.rejects(requestPasswordReset(client,'a@example.com',redirect));
 assert.match(authErrorMessage({status:429},'reset'),/Muitas tentativas/);
 assert.doesNotMatch(authErrorMessage({message:'secret server stack'},'reset'),/secret|stack/);assert.match(authErrorMessage({code:'otp_expired'},'update'),/expirou/);
});
test('new passwords must match and be strong enough before authenticated updateUser is called',async()=>{
 let calls=0;const client={auth:{updateUser:async(value)=>{calls++;assert.deepEqual(value,{password:'newPassword123'});return {error:null};}}};
 await assert.rejects(saveRecoveredPassword(client,'short','short'),/8 caracteres/);await assert.rejects(saveRecoveredPassword(client,'newPassword123','different'),/coincidem/);assert.equal(calls,0);await saveRecoveredPassword(client,'newPassword123','newPassword123');assert.equal(calls,1);
});
test('SWEX parses null equipment, missing artifacts and empty positions without losing the deck',async()=>{
 const account=normalizeAccount(raw());assert.equal(account.units.length,5);assert.equal(account.runes.length,5);assert.deepEqual(account.artifacts,[]);assert.deepEqual(account.units[0].artifactIds,[]);assert.deepEqual(account.accountPresets[0].unitIds,[1,null,null,4,5]);
 const asyncAccount=await normalizeAccountAsync(raw(),{yieldControl:()=>Promise.resolve()});assert.deepEqual(asyncAccount.units,account.units);
 for(const missing of [null,undefined]){const input=raw();input.unit_list[0].artifacts=missing;assert.doesNotThrow(()=>normalizeAccount(input));}
});
test('corrupted, incomplete and unsupported imports always yield friendly Portuguese errors',()=>{
 assert.throws(()=>parseSwexJson('{ broken'),/não é um JSON válido/);assert.throws(()=>normalizeAccount(parseSwexJson('{}')),/JSON original do SWEX/);assert.match(swexImportError(new TypeError('Cannot read properties of null')),/exportação completa do SWEX/);assert.doesNotMatch(swexImportError(new TypeError('Cannot read properties of null')),/TypeError|Cannot read/);
});
test('combat SPD rounds the combined leader/tower/totem once, includes Swift only in sheet and keeps ticks integers',()=>{
 const unit={master:18913,element:3,base:{spd:102,hp:10000,atk:800,def:600}},stats={total:{...unit.base,spd:251}};
 for(const leader of [10,19,24,28,33])for(const tower of [0,15])for(const guild of [0,10]){
  const team={gameMode:'siege',towerSpd:tower,guildSpd:guild,leader:{stat:'spd',value:leader,scope:'general'}},expected=251+Math.ceil(102*(leader+tower+guild)/100);
  assert.equal(combatSpeedFromSheet(251,unit,team),expected);assert.equal(combatAttributes(unit,stats,{3:4},team).spd,expected);
 }
 assert.equal(combatSpeedFromSheet(251,unit,{gameMode:'arena',guildSpd:10,leader:{stat:'spd',scope:'guild',value:24}}),251);
 for(const spd of [143,200,250,316,350]){const [turn]=simulateFirstTurns([{key:'a',spd}]);assert.equal(turn.tick,Math.ceil(10000/(7*spd)));assert.ok(Number.isInteger(turn.tick));assert.ok(minimumSpeedForTick(turn.tick)<=spd);}
});
test('demo data is marked synthetic and isolated from SWEX onboarding completion',()=>{
 const account=createDemoAccount();assert.equal(account.isDemo,true);assert.equal(account.id,'demo');assert.ok(account.accountPresets.length>0);assert.equal(account.units.length,6);
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};assert.equal(readFlag(ONBOARDING_KEY,storage),false);writeFlag(ONBOARDING_PENDING_KEY,storage);assert.equal(readFlag(ONBOARDING_PENDING_KEY,storage),true);assert.equal(readFlag(ONBOARDING_KEY,storage),false);
});
test('onboarding completion calls only owner-scoped RPC, never accepts a user ID or role update',async()=>{
 const calls=[];await finishOnboarding({rpc:async(...args)=>(calls.push(args),{error:null})});assert.deepEqual(calls,[['complete_my_onboarding']]);
});
