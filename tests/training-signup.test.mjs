import test from 'node:test';
import assert from 'node:assert/strict';
import { environment } from './helpers/env.mjs';
import { signupEvents, acceptsSignups, nextRideDay, eventSeason, rideDay } from '../src/data/signup-events.ts';
import worker from '../workers/training-signup/index.ts';
const valid = () => ({ eventId:'chisholm-2026-11-21', requestId:crypto.randomUUID(), riderName:'Test Rider', email:'rider@example.com', phone:'+1 607 624 9173', experience:'Intermediate', bike:'250', notes:'<test>', marketingOptIn:false });
const request = (data, origin='https://clubranchmx.com') => new Request('https://clubranchmx.com/api/training-signup/', { method:'POST', headers:{ Origin:origin, 'Content-Type':'application/json' }, body:JSON.stringify(data) });
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
 for(const data of [{...valid(),email:'bad'},{...valid(),experience:'fake'},{...valid(),website:'spam'},{...valid(),notes:'x'.repeat(9000)},{...valid(),marketingOptIn:'yes'},{...valid(),waiverClaimed:'yes'},{...valid(),requestId:'bad'},{...valid(),phone:'+46 70 123 45 67'},{...valid(),phone:'123-456-7890'},{...valid(),phone:'720 245 058'},{...valid(),phone:'720-245-0588 ext 2'}])assert.ok((await worker.fetch(request(data),env)).status>=400);
 assert.equal((await worker.fetch(request(valid(),'https://example.com'),env)).status,403);
 assert.equal((await worker.fetch(request(valid()),environment(undefined,false))).status,429);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,0);
});

test('unknown and closed events cannot collect registrations', async()=>{
 const env=environment(async()=>assert.fail('Must not send'));
 assert.equal((await worker.fetch(request({...valid(),eventId:'invented-event'}),env)).status,400);
 const event=signupEvents.find(e=>e.id==='chisholm-2026-11-21');event.signupOpen=false;
 try { assert.equal((await worker.fetch(request(valid()),env)).status,409); } finally {event.signupOpen=true;}
 assert.equal(acceptsSignups(event,new Date('2026-11-24T12:00:00Z')),false);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,0);
});
test('ride days get a stable ID and readable date',()=>{
 const event=signupEvents.find(e=>e.id==='ride-day-2026-11-08');
 assert.ok(event);
 assert.equal(event.dateLabel,'Sunday, November 8, 2026');
 assert.deepEqual(event.dates,['2026-11-08']);
});

test('share link points at the soonest open ride day, never a training event',()=>{
 assert.equal(nextRideDay(new Date('2026-11-02T18:00:00Z')).id,'ride-day-2026-11-08');
 // Sunday evening in Colorado is already Monday in UTC; the ride day still counts until midnight ranch time.
 assert.equal(nextRideDay(new Date('2026-11-09T05:00:00Z')).id,'ride-day-2026-11-08');
 assert.equal(nextRideDay(new Date('2026-11-09T08:00:00Z')),undefined);
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

const pdf=Buffer.from('%PDF-1.4 signed waiver test file').toString('base64');
test('signed waiver is attached to the staff email and recorded, never stored',async()=>{
 const sent=[];const env=environment(async message=>{sent.push(message)});env.RIDER_RECEIPTS_ENABLED='true';
 const response=await worker.fetch(request({...valid(),riderName:'Jo Rider',waiver:{type:'application/pdf',data:pdf}}),env);
 assert.equal(response.status,200);assert.doesNotMatch((await response.json()).message,/paper copy/);
 assert.equal(sent[0].attachments.length,1);assert.equal(sent[0].attachments[0].filename,'waiver-2026-jo-rider.pdf');
 assert.equal(sent[0].attachments[0].content,pdf);assert.match(sent[0].subject,/signed waiver/);
 assert.match(sent[1].text,/received your signed waiver/);assert.equal(sent[1].attachments,undefined);
 const row=env.db.prepare('SELECT * FROM registrations').get();assert.equal(row.waiver_status,'emailed');assert.equal(row.notification_status,'accepted');
});
test('signup without waiver links the printable form',async()=>{
 const sent=[];const env=environment(async message=>{sent.push(message)});env.RIDER_RECEIPTS_ENABLED='true';
 await worker.fetch(request(valid()),env);
 assert.match(sent[0].text,/Signed waiver: not uploaded/);assert.match(sent[1].text,/clubranchmx-waiver-2026\.pdf/);
 assert.equal(env.db.prepare('SELECT waiver_status FROM registrations').get().waiver_status,'none');
});
test('attachment failure still notifies staff and asks the rider for paper',async()=>{
 const sent=[];const env=environment(async message=>{if(message.attachments)throw Error('E_CONTENT_TOO_LARGE');sent.push(message)});
 const response=await worker.fetch(request({...valid(),waiver:{type:'application/pdf',data:pdf}}),env);
 assert.equal(response.status,200);assert.match((await response.json()).message,/bring a signed paper copy/);
 assert.match(sent[0].text,/could not be attached/);
 const row=env.db.prepare('SELECT * FROM registrations').get();assert.equal(row.waiver_status,'failed');assert.equal(row.notification_status,'accepted');
});
test('invalid waiver files are rejected before saving',async()=>{
 const env=environment(async()=>assert.fail('Must not send'));
 const html=Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
 for(const w of [{type:'application/pdf',data:html},{type:'text/html',data:html},{type:'application/pdf',data:'not base64!'},'x',{type:'application/pdf',data:Buffer.alloc(9*1024*1024,37).toString('base64')}])
  assert.equal((await worker.fetch(request({...valid(),waiver:w}),env)).status>=400,true);
 assert.equal(env.db.prepare('SELECT COUNT(*) AS n FROM registrations').get().n,0);
});

test('US phone numbers are accepted in common formats and stored consistently',async()=>{
 for(const phone of ['7202450588','720-245-0588','(720) 245-0588','+1 720 245 0588','1.720.245.0588']){
  const env=environment();assert.equal((await worker.fetch(request({...valid(),phone}),env)).status,200,phone);
  assert.equal(env.db.prepare('SELECT phone FROM registrations').get().phone,'(720) 245-0588');
 }
});

test('claimed waiver is stored and told to staff and rider',async()=>{
 const sent=[];const env=environment(async message=>{sent.push(message)});env.RIDER_RECEIPTS_ENABLED='true';
 assert.equal((await worker.fetch(request({...valid(),waiverClaimed:true}),env)).status,200);
 assert.equal(env.db.prepare('SELECT waiver_claimed FROM registrations').get().waiver_claimed,1);
 assert.ok(sent[0].text.includes('Signed waiver: Rider says they already signed a 2026 waiver. Not verified; check the roster.'));
 assert.ok(sent[1].text.includes("You told us you already signed a 2026 waiver. If you're not sure, bring a signed copy."));
});
test('unticked claim is stored as 0',async()=>{
 const env=environment();await worker.fetch(request(valid()),env);
 assert.equal(env.db.prepare('SELECT waiver_claimed FROM registrations').get().waiver_claimed,0);
});
test('upload wins over claim in emails',async()=>{
 const sent=[];const env=environment(async message=>{sent.push(message)});
 await worker.fetch(request({...valid(),waiverClaimed:true,waiver:{type:'application/pdf',data:pdf}}),env);
 assert.match(sent[0].text,/Signed waiver: attached \(/);
 assert.equal(env.db.prepare('SELECT waiver_claimed FROM registrations').get().waiver_claimed,1);
});
test('eventSeason uses the first event date',()=>{
 assert.equal(eventSeason(rideDay('2027-01-09')),2027);
});
