// Database test: runs schema.sql + migration-2.sql in an in-memory Postgres and
// tries to read, write and cheat as different people. Every line must say PASS.
//   cd proof/supabase/test && npm i @electric-sql/pglite@0.2.17 && node privacy.test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
const q = (s, p) => db.query(s, p);
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
  alter default privileges in schema public grant all on tables to authenticated, anon;
  alter default privileges in schema public grant all on functions to authenticated, anon;
`);
await db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
await db.exec(fs.readFileSync(new URL('../migration-2.sql', import.meta.url), 'utf8'));
await db.exec(fs.readFileSync(new URL('../migration-2.sql', import.meta.url), 'utf8')); // twice: must be safe to re-run

const A = 'aaaaaaaa-0000-0000-0000-000000000001', B = 'bbbbbbbb-0000-0000-0000-000000000002', C = 'cccccccc-0000-0000-0000-000000000003';
await db.exec(`insert into auth.users values ('${A}','danny@x.com'),('${B}','sam@x.com'),('${C}','stranger@x.com');`);
async function as(uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.sub', '${uid || ''}', false); set role ${uid ? 'authenticated' : 'anon'};`);
  try { return (await q(sql, params)).rows; } catch (e) { return 'DENIED: ' + e.message.split('\n')[0]; } finally { await db.exec('reset role'); }
}
let fails = 0, passes = 0;
const check = (label, got, ok) => { const good = ok(got); good ? passes++ : fails++; console.log((good ? 'PASS ' : 'FAIL ') + label + '  ->  ' + JSON.stringify(got).slice(0, 100)); };
const rows = (r, n) => Array.isArray(r) && (n === undefined || r.length === n);
const denied = (r) => typeof r === 'string';
const noon = (daysAgo) => `(((now() at time zone 'Africa/Johannesburg')::date - ${daysAgo} + time '12:00') at time zone 'Africa/Johannesburg')`;

/* ---------- profiles: goals 1 to 6 ---------- */
check('Profile with 3 goals', await as(A, `insert into profiles (id,name,commitments,obstacle) values ($1,'Danny','{train,build,faith}','{phone}')`, [A]), rows);
check('Profile with 6 goals', await as(B, `insert into profiles (id,name,commitments) values ($1,'Sam','{a,b,c,d,e,f}')`, [B]), rows);
check('Profile with 1 goal', await as(C, `insert into profiles (id,name,commitments) values ($1,'Stranger','{read}')`, [C]), rows);
check('Profile with 7 goals is refused', await as(C, `update profiles set commitments='{a,b,c,d,e,f,g}' where id=$1`, [C]), denied);
check('Profile with 0 goals is refused', await as(C, `update profiles set commitments='{}' where id=$1`, [C]), denied);
check('Goal history and time zone can be saved', await as(A, `update profiles set goal_log='[{"ts":1,"keys":["train"]}]', tz='Africa/Johannesburg' where id=$1 returning id`, [A]), rows);

/* ---------- trial and access ---------- */
check('New profile gets 30 days free (cards not required)', (await q(`select round(extract(epoch from (pro_until - now())) / 86400)::int d from profiles where id='${A}'`)).rows, (r) => r[0].d === 30);
check('Cannot give yourself more access', await as(A, `update profiles set pro_until = now() + interval '9 years' where id=$1`, [A]), denied);
check('Cannot create a profile with access set', await as(C, `insert into profiles (id,name,commitments,pro_until) values (gen_random_uuid(),'x','{a}', now() + interval '9 years')`), denied);
check('Payment records are closed to the app', await as(A, 'select * from billing'), denied);
await q(`insert into billing (user_id, plan, status, charge_on) values ('${A}','monthly','trial', now() + interval '30 days')`);
check('You can see your own billing status, only yours', await as(A, 'select status, plan from my_billing()'), (r) => rows(r, 1) && r[0].status === 'trial');
check('...and a stranger sees nothing', await as(B, 'select * from my_billing()'), (r) => rows(r, 0));

/* ---------- clubs ---------- */
const made = (await as(A, `select * from create_club('5am Club')`))[0];
const club = made.id;
await as(B, `select join_club('${made.code.toLowerCase()}')`);
check('Cannot create a club directly', await as(A, `insert into clubs (name,code) values ('x','ZZZ999')`), denied);
check('Cannot add someone to a club directly', await as(A, `insert into club_members values ('${club}','${C}')`), denied);
check('Signed-out cannot join a club', await as(null, `select join_club('${made.code}')`), denied);
check('Stranger cannot see the club', await as(C, 'select * from clubs'), (r) => rows(r, 0));
check('Stranger cannot list club members', await as(C, 'select * from club_members'), (r) => rows(r, 0));
check('Club mate sees names via roster, stranger does not', [await as(B, `select name from club_roster('${club}')`), await as(C, `select * from club_roster('${club}')`)], ([m, s]) => rows(m, 2) && rows(s, 0));
check('Club mate cannot read your answers', await as(B, `select obstacle from profiles where id='${A}'`), (r) => rows(r, 0));

/* ---------- proof: posting, privacy, backdating ---------- */
check('Post a proof', await as(A, `insert into proofs (c_key,kind,note,photo_path,client_id) values ('train','photo','Danny gym','${A}/1.jpg','c1') returning id`), (r) => rows(r, 1));
const pid = (await q(`select id from proofs where user_id='${A}' limit 1`)).rows[0].id;
check('Same device proof sent twice is stored once', await as(A, `insert into proofs (user_id,c_key,kind,client_id) values ($1,'train','photo','c1') on conflict (user_id, client_id) do nothing returning id`, [A]), (r) => rows(r, 0));
check('Club mate sees it', await as(B, 'select note from proofs'), (r) => rows(r, 1) && r[0].note === 'Danny gym');
check('Stranger does not', await as(C, `select note from proofs where user_id='${A}'`), (r) => rows(r, 0));
check('Cannot post as someone else', await as(B, `insert into proofs (user_id,c_key,kind) values ('${A}','train','photo')`), denied);
check('Cannot delete someone else\'s proof', await as(B, `delete from proofs where user_id='${A}' returning id`), (r) => rows(r, 0));
check('Cannot see someone else\'s plan', await as(B, 'select * from plans'), (r) => rows(r, 0));
check('Backdating 10 days is clamped to now', (await as(A, `insert into proofs (c_key,kind,created_at) values ('read','photo', now() - interval '10 days') returning created_at > now() - interval '1 minute' as fresh`)), (r) => rows(r, 1) && r[0].fresh === true);
check('A proof from yesterday (offline) keeps its time', (await as(A, `insert into proofs (c_key,kind,created_at) values ('build','photo', now() - interval '1 day') returning created_at < now() - interval '23 hours' as old`)), (r) => rows(r, 1) && r[0].old === true);

/* ---------- access ends / starts ---------- */
await q(`update profiles set pro_until = now() - interval '1 day' where id='${C}'`);
check('Trial over: posting is refused', await as(C, `insert into proofs (c_key,kind) values ('read','photo')`), (r) => denied(r) && r.includes('ACCESS_ENDED'));
await q(`update profiles set pro_until = now() + interval '31 days' where id='${C}'`); // what the payment webhook does
check('Paid (access set by the server): posting works', await as(C, `insert into proofs (c_key,kind) values ('read','photo') returning id`), (r) => rows(r, 1));
await q(`update app_settings set require_card = true`);
await q(`insert into auth.users values ('dddddddd-0000-0000-0000-000000000004','late@x.com')`);
await as('dddddddd-0000-0000-0000-000000000004', `insert into profiles (id,name,commitments) values ('dddddddd-0000-0000-0000-000000000004','Late','{a,b}')`);
check('Cards required: a new profile starts with no access', (await q(`select pro_until from profiles where id='dddddddd-0000-0000-0000-000000000004'`)).rows, (r) => r[0].pro_until === null);
check('...and cannot post until the card is confirmed', await as('dddddddd-0000-0000-0000-000000000004', `insert into proofs (c_key,kind) values ('a','photo')`), (r) => denied(r) && r.includes('ACCESS_ENDED'));
await q(`update app_settings set require_card = false`);

/* ---------- respect ---------- */
check('Club mate gives respect', await as(B, `insert into respects (proof_id) values ($1) returning proof_id`, [pid]), (r) => rows(r, 1));
check('Cannot respect the same proof twice', await as(B, `insert into respects (proof_id) values ($1)`, [pid]), denied);
check('Cannot respect your own proof', await as(A, `insert into respects (proof_id) values ($1)`, [pid]), denied);
check('Stranger cannot respect a proof they cannot see', await as(C, `insert into respects (proof_id) values ($1)`, [pid]), denied);
check('Stranger cannot see respects', await as(C, 'select * from respects'), (r) => rows(r, 0));
check('The owner sees the respect on their proof', await as(A, 'select user_id from respects where proof_id = $1', [pid]), (r) => rows(r, 1));
check('Cannot give respect as someone else', await as(B, `insert into respects (proof_id, user_id) values ($1, '${C}')`, [pid]), denied);
check('Can take back your respect', await as(B, `delete from respects where proof_id=$1 returning proof_id`, [pid]), (r) => rows(r, 1));

/* ---------- club board: the half-your-goals streak rule ---------- */
await q(`delete from proofs`);
const ins = (u, key, days) => q(`insert into proofs (user_id,c_key,kind,created_at) values ('${u}','${key}','photo', ${noon(days)})`);
// Danny: 3 goals => needs 2. Today train+faith (ok), yesterday train+build (ok), 2 days ago only train (not ok)
for (const [k, d] of [['train', 0], ['faith', 0], ['train', 1], ['build', 1], ['train', 2]]) await ins(A, k, d);
// Sam: 6 goals => needs 3. Today only 2 (not yet), yesterday 3 (ok), 2 days ago 3 (ok), 3 days ago 0
for (const [k, d] of [['a', 0], ['b', 0], ['a', 1], ['b', 1], ['c', 1], ['a', 2], ['d', 2], ['e', 2]]) await ins(B, k, d);
// Moments never count
await ins(B, 'moment', 0); await ins(B, 'moment', 0);
const board = await as(A, `select name, goals, done_today, streak from club_board('${club}') order by name`);
check('Board: Danny 2 of 3 today, streak 2', board, (r) => rows(r, 2) && r[0].name === 'Danny' && r[0].done_today === 2 && r[0].streak === 2);
check('Board: Sam 2 of 6 today (moments ignored), streak 2 from yesterday back', board, (r) => r[1].name === 'Sam' && r[1].goals === 6 && r[1].done_today === 2 && r[1].streak === 2);
check('A stranger gets nothing from the board', await as(C, `select * from club_board('${club}')`), (r) => rows(r, 0));
check('Signed-out gets nothing from the board', await as(null, `select * from club_board('${club}')`), denied);

/* ---------- storage and accounts ---------- */
await q(`insert into storage.objects (bucket_id,name) values ('proof-media','${A}/1.jpg')`);
check('Club mate can read a photo', await as(B, 'select name from storage.objects'), (r) => rows(r, 1));
check('Stranger cannot read a photo', await as(C, 'select name from storage.objects'), (r) => rows(r, 0));
check('Stranger cannot upload into your folder', await as(C, `insert into storage.objects (bucket_id,name) values ('proof-media','${A}/evil.jpg')`), denied);
check('Bucket is private', (await q(`select public from storage.buckets where id='proof-media'`)).rows, (r) => r[0].public === false);
check('Signed-out cannot read proofs or profiles', [await as(null, 'select * from proofs'), await as(null, 'select * from profiles')], ([a, b]) => denied(a) && denied(b));
await as(C, 'select delete_my_account()');
check('Deleting an account removes their proof', (await q(`select count(*)::int n from proofs where user_id='${C}'`)).rows, (r) => r[0].n === 0);

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
