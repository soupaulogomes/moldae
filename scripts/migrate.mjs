import pg from 'pg';import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';import {randomBytes,createHash} from 'node:crypto';
const adminUrl=process.env.ADMIN_DATABASE_URL||process.env.DATABASE_URL;if(!adminUrl)throw new Error('Informe ADMIN_DATABASE_URL.');
const db=new pg.Client({connectionString:adminUrl});await db.connect();
try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(890102)');await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz DEFAULT now())');for(const name of ['001_initial.sql','002_tenants.sql']){if((await db.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rows.length)continue;await db.query(await readFile(new URL('../db/'+name,import.meta.url),'utf8'));await db.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);}
 await db.query('COMMIT');console.log('Migrações concluídas.');}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
