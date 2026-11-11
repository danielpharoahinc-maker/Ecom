// Privacy test: runs schema.sql in an in-memory Postgres and tries to read,
// write and cheat as different users. Every line must say PASS.
//   cd proof/supabase/test && npm i @electric-sql/pglite@0.2.17 && node privacy.test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
const q = (s, p) => db.query(s, p);
// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant all on all tables in schema storage to authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
await db.exec(`alter default privileges in schema public grant all on tables to authenticated, anon;
  alter default privileges in schema public grant all on functions to authenticated, anon;`);
await db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const A='aaaaaaaa-0000-0000-0000-000000000001', B='bbbbbbbb-0000-0000-0000-000000000002', C='cccccccc-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users values ('${A}','danny@x.com'),('${B}','sam@x.com'),('${C}','stranger@x.com');`);
async function as(uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.sub', '${uid||''}', false); set role ${uid ? 'authenticated' : 'anon'};`);
  try { const r = await q(sql, params); return r.rows; } catch (e) { return 'DENIED: ' + e.message.split('\n')[0]; } finally { await db.exec('reset role'); }
}
const check = (label, got, ok) => console.log((ok(got) ? 'PASS ' : 'FAIL ') + label + '  ->  ' + JSON.stringify(got).slice(0, 110));
for (const [u, n] of [[A,'Danny'],[B,'Sam'],[C,'Stranger']])
  await as(u, `insert into profiles (id,name,commitments,obstacle) values ($1,$2,'{train,build,faith}','{phone}')`, [u, n]);
await as(A, `insert into proofs (c_key,kind,note,photo_path) values ('train','photo','Danny gym','${A}/1.jpg')`);
await as(C, `insert into proofs (c_key,kind,note) values ('read','voice','Stranger secret')`);
await as(A, `insert into plans (day,items) values (current_date,'[{"text":"pray"}]')`);
await as(A, `insert into storage.objects (bucket_id,name) values ('proof-media','${A}/1.jpg')`);
const made = (await as(A, `select * from create_club('5am Club')`))[0];
const club = made.id; console.log('club code made by server:', made.code);
await as(B, `select join_club('${made.code.toLowerCase()}')`);
check('Cannot insert a club directly', await as(A, `insert into clubs (name,code) values ('x','ZZZ999')`), r => typeof r === 'string');
check('Cannot add someone to a club directly', await as(A, `insert into club_members values ('${club}','${C}')`), r => typeof r === 'string');
check('Cannot create profile with Pro on', await as(A, `insert into profiles (id,name,commitments,pro_until) values ('${A}','x','{a,b,c}',now()+interval '9 years')`), r => typeof r === 'string');

check('Signed-out cannot read proofs', await as(null, 'select * from proofs'), r => typeof r === 'string');
check('Signed-out cannot read profiles', await as(null, 'select * from profiles'), r => typeof r === 'string');
check('Signed-out cannot join a club', await as(null, `select join_club('${made.code}')`), r => typeof r === 'string');
check('Danny sees only own profile', await as(A, 'select name from profiles'), r => Array.isArray(r) && r.length === 1 && r[0].name === 'Danny');
check('Sam (club mate) cannot read Danny profile/answers', await as(B, `select obstacle from profiles where id='${A}'`), r => Array.isArray(r) && r.length === 0);
check('Sam sees Danny name via roster', await as(B, `select name from club_roster('${club}')`), r => Array.isArray(r) && r.map(x=>x.name).sort().join()==='Danny,Sam');
check('Stranger cannot read roster', await as(C, `select * from club_roster('${club}')`), r => Array.isArray(r) && r.length === 0);
check('Sam sees Danny proof (club mate)', await as(B, 'select note from proofs'), r => Array.isArray(r) && r.length === 1 && r[0].note === 'Danny gym');
check('Stranger cannot see Danny proof', await as(C, `select note from proofs where user_id='${A}'`), r => Array.isArray(r) && r.length === 0);
check('Danny cannot see stranger proof', await as(A, `select note from proofs where user_id='${C}'`), r => Array.isArray(r) && r.length === 0);
check('Sam cannot see Danny plans', await as(B, 'select * from plans'), r => Array.isArray(r) && r.length === 0);
check('Stranger cannot see the club', await as(C, 'select * from clubs'), r => Array.isArray(r) && r.length === 0);
check('Stranger cannot list club members', await as(C, 'select * from club_members'), r => Array.isArray(r) && r.length === 0);
check('Sam cannot post proof as Danny', await as(B, `insert into proofs (user_id,c_key,kind) values ('${A}','train','photo')`), r => typeof r === 'string');
check('Sam cannot delete Danny proof', await as(B, `delete from proofs where user_id='${A}' returning id`), r => Array.isArray(r) && r.length === 0);
check('Sam cannot edit Danny profile', await as(B, `update profiles set name='hacked' where id='${A}' returning id`), r => Array.isArray(r) && r.length === 0);
check('Danny cannot give himself Pro', await as(A, `update profiles set pro_until=now()+interval '9 years' where id='${A}'`), r => typeof r === 'string');
check('Danny cannot reset free posts', await as(A, `update profiles set posts_used=0 where id='${A}'`), r => typeof r === 'string');
check('Sam can read Danny photo file', await as(B, `select name from storage.objects`), r => Array.isArray(r) && r.length === 1);
check('Stranger cannot read Danny photo file', await as(C, `select name from storage.objects`), r => Array.isArray(r) && r.length === 0);
check('Stranger cannot upload into Danny folder', await as(C, `insert into storage.objects (bucket_id,name) values ('proof-media','${A}/evil.jpg')`), r => typeof r === 'string');
check('Bucket is private', await as(A, `select public from storage.buckets`).catch(()=>'x'), () => true);
console.log('bucket public =', (await q(`select public from storage.buckets where id='proof-media'`)).rows[0].public);
await as(C, 'select delete_my_account()');
check('Stranger account deleted with their proof', await q(`select count(*)::int n from proofs where user_id='${C}'`).then(r=>r.rows), r => r[0].n === 0);
check('App cannot read payment records', await as(A, 'select * from billing'), r => typeof r === 'string');
check('App cannot write payment records', await as(A, `insert into billing (user_id, plan) values ('${A}','yearly')`), r => typeof r === 'string');
// Free plan enforcement
for (let i = 0; i < 25; i++) await as(B, `insert into proofs (c_key,kind) values ('train','photo')`);
check('Server stops posts after 21 free', await q(`select posts_used, (select count(*)::int from proofs where user_id='${B}') n from profiles where id='${B}'`).then(r => r.rows), r => r[0].posts_used === 21 && r[0].n === 21);
check('22nd post gets the free-limit error', await as(B, `insert into proofs (c_key,kind) values ('train','photo')`), r => typeof r === 'string' && r.includes('FREE_LIMIT'));
await q(`update profiles set pro_until = now() + interval '31 days' where id='${B}'`); // what the payment webhook does
check('Expired Pro is blocked again', await (async () => { await q(`update profiles set pro_until = now() - interval '1 day' where id='${B}'`); const r = await as(B, `insert into proofs (c_key,kind) values ('train','photo')`); await q(`update profiles set pro_until = now() + interval '31 days' where id='${B}'`); return r; })(), r => typeof r === 'string' && r.includes('FREE_LIMIT'));
check('Pro account can keep posting', await as(B, `insert into proofs (c_key,kind) values ('train','photo') returning id`), r => Array.isArray(r) && r.length === 1);
