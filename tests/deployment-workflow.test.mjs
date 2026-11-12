import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const workflow=readFileSync(new URL('../.github/workflows/verify.yml',import.meta.url),'utf8');
const migration=workflow.slice(workflow.indexOf('\n  migrate-supabase:'));
const condition=migration.match(/^    if: (.+)$/m)?.[1];
const allows=(event,ref='refs/heads/main',inputs={})=>Boolean(runInNewContext(condition,{github:{event_name:event,ref},inputs}));

test('frontend pushes and pull requests never run production database migrations',()=>{
 for(const event of ['push','pull_request'])assert.equal(allows(event,'refs/heads/main',{run_migrations:true}),false,event);
});
test('manual verification without explicit database consent never migrates',()=>{
 assert.equal(allows('workflow_dispatch'),false);
 assert.equal(allows('workflow_dispatch','refs/heads/main',{run_migrations:false}),false);
});
test('explicit manual migration on main remains available after verification',()=>{
 assert.equal(allows('workflow_dispatch','refs/heads/main',{run_migrations:true}),true);
 assert.match(migration,/^    needs: verify$/m);
});
test('manual migration cannot target a non-production branch',()=>{
 assert.equal(allows('workflow_dispatch','refs/heads/release/example',{run_migrations:true}),false);
});
test('migration opt-in is a boolean input disabled by default',()=>{
 const input=workflow.match(/^      run_migrations:\n((?:        .*\n)+)/m)?.[1]||'';
 assert.match(input,/^        type: boolean$/m);
 assert.match(input,/^        default: false$/m);
});
test('production protection and serialized migrations remain configured',()=>{
 assert.match(migration,/^    environment: supabase-production$/m);
 assert.match(migration,/group: supabase-production-migrations/);
 assert.match(migration,/cancel-in-progress: false/);
 assert.match(migration,/run: supabase db push/);
});
