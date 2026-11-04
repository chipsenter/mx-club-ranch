import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
const migrations = new URL('../../workers/training-signup/migrations/', import.meta.url);
/** In-memory stand-in for the Worker env: D1 (first/run/all/batch), EMAIL and SIGNUP_LIMIT. */
export function environment(send=async()=>({}), allowed=true) {
 const db=new DatabaseSync(':memory:');
 for (const file of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(file, migrations),'utf8'));
 const prepare = sql => ({
   bind(...args) {
     return {
       first: async () => db.prepare(sql).get(...args),
       run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
       all: async () => ({ results: db.prepare(sql).all(...args) }),
     };
   },
 });
 return {db,EMAIL:{send}, SIGNUP_LIMIT:{limit:async()=>({success:allowed})},DB:{prepare,batch:async statements=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
}
