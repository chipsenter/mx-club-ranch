import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { signupEvents, acceptsSignups } from '../src/data/signup-events.ts';
import worker from '../workers/training-signup/index.ts';
const valid = () => ({ eventId:'chisholm-2026-11-21', requestId:crypto.randomUUID(), riderName:'Test Rider', email:'rider@example.com', phone:'+1 607 624 9173', experience:'Intermediate', bike:'250', notes:'<test>', marketingOptIn:false });
const request = (data, origin='https://clubranchmx.com') => new Request('https://clubranchmx.com/api/training-signup/', { method:'POST', headers:{ Origin:origin, 'Content-Type':'application/json' }, body:JSON.stringify(data) });
function environment(send=async()=>({}), allowed=true) {
 const db=new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../workers/training-signup/migrations/0001_rider_contacts.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../workers/training-signup/migrations/0002_rider_receipts.sql',import.meta.url),'utf8'));
 const prepare = sql => ({
   bind(...args) {
     return {
       first: async () => db.prepare(sql).get(...args),
       run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
     };
   },
 });
 return {db,EMAIL:{send}, SIGNUP_LIMIT:{limit:async()=>({success:allowed})},DB:{prepare,batch:async statements=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
}
test('registration stores all fields, excludes unchecked contacts from audience, and escapes email',async()=>{
 let sent;const env=environment(async email=>{sent=email});const data=valid();
 assert.equal((await worker.fetch(request(data),env)).status,200);
 assert.equal(sent.to,'mxjj17@gmail.com');assert.match(sent.html,/&lt;test&gt;/);
 const row=env.db.prepare('SELECT * FROM registrations').get();assert.equal(row.bike,'250');assert.equal(row.notification_status,'accepted');assert.equal(row.marketing_opt_in,0);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM event_email_audience').get().n,0);
});
test('consent recorded, email deduplicated, multiple riders retained, unsubscribe never reversed',async()=>{
 const env=environment();const first={...valid(),email:'RIDER@example.com',marketingOptIn:true};await worker.fetch(request(first),env);
 await worker.fetch(request({...valid(),riderName:'Second rider'}),env);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n,1);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,2);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM event_email_audience').get().n,1);
 assert.equal(env.db.prepare('SELECT consent_version FROM contacts').get().consent_version,'event-updates-v1');
 env.db.exec("UPDATE contacts SET marketing_status='unsubscribed', unsubscribed_at='2026-10-16'");
 await worker.fetch(request({...valid(),marketingOptIn:true}),env);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM event_email_audience').get().n,0);
});
test('retry does not duplicate registration or notification',async()=>{
 let sends=0;const env=environment(async()=>{sends++});const data=valid();
 await worker.fetch(request(data),env);await worker.fetch(request(data),env);
 assert.equal(sends,1);assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,1);
});
test('notification outage preserves the registration',async()=>{
 const env=environment(async()=>{throw Error('Unavailable')});assert.equal((await worker.fetch(request(valid()),env)).status,200);
 assert.equal(env.db.prepare('SELECT notification_status FROM registrations').get().notification_status,'failed');
});
test('storage outage fails before sending email',async()=>{
 const env=environment(async()=>assert.fail('Must not send'));env.DB.prepare=()=>{throw Error('Unavailable')};
 assert.equal((await worker.fetch(request(valid()),env)).status,503);
});
test('invalid inputs, cross-origin requests and limits never store or send',async()=>{
 const env=environment(async()=>assert.fail('Must not send'));
 for(const data of [{...valid(),email:'bad'},{...valid(),experience:'fake'},{...valid(),website:'spam'},{...valid(),notes:'x'.repeat(9000)},{...valid(),marketingOptIn:'yes'},{...valid(),requestId:'bad'}])assert.ok((await worker.fetch(request(data),env)).status>=400);
 assert.equal((await worker.fetch(request(valid(),'https://example.com'),env)).status,403);
 assert.equal((await worker.fetch(request(valid()),environment(undefined,false))).status,429);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,0);
});

test('unknown and closed events cannot collect registrations', async()=>{
 const env=environment(async()=>assert.fail('Must not send'));
 assert.equal((await worker.fetch(request({...valid(),eventId:'invented-event'}),env)).status,400);
 const event=signupEvents[0];event.signupOpen=false;
 try { assert.equal((await worker.fetch(request(valid()),env)).status,409); } finally {event.signupOpen=true;}
 assert.equal(acceptsSignups(event,new Date('2026-11-24T12:00:00Z')),false);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,0);
});
test('another event uses its own ID and email copy',async()=>{
 const event={id:'test-event',title:'Test riding day',dateLabel:'December 20, 2026',dates:['2026-12-20'],signupOpen:true};signupEvents.push(event);
 let sent;const env=environment(async message=>{sent=message});
 try {
  assert.equal((await worker.fetch(request({...valid(),eventId:event.id}),env)).status,200);
  assert.equal(env.db.prepare('SELECT event_id FROM registrations').get().event_id,event.id);
  assert.match(sent.subject,/Test riding day/);assert.match(sent.text,/December 20, 2026/);
 } finally {signupEvents.pop();}
});

test('rider receives one acknowledgment at submitted address without marketing consent',async()=>{
 const sent=[];const env=environment(async message=>{sent.push(message)});env.RIDER_RECEIPTS_ENABLED='true';
 const data={...valid(),email:'RIDER@example.com'};
 await worker.fetch(request(data),env);await worker.fetch(request(data),env);
 assert.equal(sent.length,2);assert.equal(sent[1].to,'rider@example.com');
 assert.equal(sent[1].replyTo,'post@clubranchmx.com');assert.match(sent[1].text,/place is not confirmed yet/);
 assert.match(sent[1].text,/November 21–22, 2026/);
 assert.equal(env.db.prepare('SELECT receipt_status FROM registrations').get().receipt_status,'accepted');
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM event_email_audience').get().n,0);
});
test('rider receipt failure preserves saved signup and staff notification',async()=>{
 const env=environment(async message=>{if(message.to!=='mxjj17@gmail.com')throw Error('Unavailable')});env.RIDER_RECEIPTS_ENABLED='true';
 const response=await worker.fetch(request(valid()),env);assert.equal(response.status,200);
 assert.match((await response.json()).message,/could not send your email/);
 const row=env.db.prepare('SELECT * FROM registrations').get();assert.equal(row.receipt_status,'failed');assert.equal(row.notification_status,'accepted');
});
test('staff notification failure does not prevent rider acknowledgment',async()=>{
 const env=environment(async message=>{if(message.to==='mxjj17@gmail.com')throw Error('Unavailable')});env.RIDER_RECEIPTS_ENABLED='true';
 await worker.fetch(request(valid()),env);
 const row=env.db.prepare('SELECT * FROM registrations').get();assert.equal(row.receipt_status,'accepted');assert.equal(row.notification_status,'failed');
});
