// Reminder timing test. Every line must say PASS.
//   cd proof/supabase/test && npm i esbuild@0.24.0
//   npx esbuild ../functions/_shared/reminders.ts --format=esm --outfile=rem.mjs && node reminders.test.mjs
import { dueReminders } from './rem.mjs';
const at = (local) => new Date(local + '+02:00'); // Johannesburg time
const base = { tz: 'Africa/Johannesburg', times: ['07:30', '18:30'], streak_saver: true, plan_items: [{ at: '06:30', text: 'Gym' }, { at: '16:00', text: 'Call clients' }], plan_day: '2026-11-12', last_posted_on: null, sent: {} };
const ok = (label, cond, info = '') => console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${info ? '  -> ' + info : ''}`);
const tags = (r) => r.due.map((d) => d.tag).join(',') || 'nothing';

let r = dueReminders(base, at('2026-11-12T07:30'));
ok('7:30 check-in fires at 7:30', tags(r) === 'checkin', tags(r));
r = dueReminders(base, at('2026-11-12T07:34'));
ok('...and still at 7:34 (cron delay)', tags(r) === 'checkin', tags(r));
r = dueReminders(base, at('2026-11-12T07:40'));
ok('...but not at 7:40', tags(r) === 'nothing', tags(r));
r = dueReminders({ ...base, sent: { '2026-11-12|checkin|07:30': true } }, at('2026-11-12T07:32'));
ok('Never sent twice', tags(r) === 'nothing', tags(r));
r = dueReminders({ ...base, last_posted_on: '2026-11-12' }, at('2026-11-12T18:30'));
ok('No check-in if already posted today', tags(r) === 'nothing', tags(r));
r = dueReminders({ ...base, last_posted_on: '2026-11-11' }, at('2026-11-12T18:30'));
ok('Posted yesterday still gets today\'s check-in', tags(r) === 'checkin', tags(r));
r = dueReminders(base, at('2026-11-12T20:00'));
ok('8pm streak saver if nothing posted', tags(r) === 'streak', r.due[0]?.body);
r = dueReminders({ ...base, last_posted_on: '2026-11-12' }, at('2026-11-12T20:00'));
ok('No streak saver if posted', tags(r) === 'nothing', tags(r));
r = dueReminders({ ...base, streak_saver: false }, at('2026-11-12T20:00'));
ok('Streak saver can be turned off', tags(r) === 'nothing', tags(r));
r = dueReminders(base, at('2026-11-12T06:20'));
ok('Plan "Gym at 06:30" reminds at 06:20', tags(r) === 'plan-06:30', r.due[0]?.title);
r = dueReminders({ ...base, last_posted_on: '2026-11-12' }, at('2026-11-12T15:50'));
ok('Plan reminders still come after posting', tags(r) === 'plan-16:00', r.due[0]?.title);
r = dueReminders(base, at('2026-11-13T06:20'));
ok('Yesterday\'s plan doesn\'t remind today', tags(r) === 'nothing', tags(r));
r = dueReminders({ ...base, times: ['23:00', '05:00'] }, at('2026-11-12T23:00'));
ok('Quiet hours: no 11pm check-in', tags(r) === 'nothing', tags(r));
r = dueReminders({ ...base, tz: 'Europe/London' }, new Date('2026-11-12T07:31:00Z'));
ok('Works in other time zones (London 7:31)', tags(r) === 'checkin', tags(r));
