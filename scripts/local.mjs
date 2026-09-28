import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
const root=fileURLToPath(new URL('../',import.meta.url));
const local=root+'.local';await mkdir(local,{recursive:true,mode:0o700});
let config;try{config=JSON.parse(await readFile(local+'/config.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;config={user:'atelier',password:randomBytes(24).toString('hex'),port:55432};await writeFile(local+'/config.json',JSON.stringify(config),{mode:0o600,flag:'wx'});}
const pg=new EmbeddedPostgres({...config,databaseDir:local+'/postgres',persistent:true,authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1','-c','unix_socket_directories='+local],onLog:m=>{if(String(m).includes('ready to accept'))console.log('PostgreSQL pronto.');},onError:m=>console.error(String(m))});
let child,stopping=false,started=false;
async function stop(code=0){if(stopping)return;stopping=true;if(child&&!child.killed){child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,5000).unref();});}if(started)await pg.stop();process.exit(code);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
try{
 try{await access(local+'/postgres/PG_VERSION');}catch{await pg.initialise();}
 await pg.start();started=true;
 const client=pg.getPgClient();await client.connect();const exists=await client.query("SELECT 1 FROM pg_database WHERE datname='atelier3d'");if(!exists.rows.length)await client.query('CREATE DATABASE atelier3d');await client.end();
 const url='postgres://'+config.user+':'+config.password+'@127.0.0.1:'+config.port+'/atelier3d';
 try{await writeFile(root+'.env','DATABASE_URL='+url+'\n',{mode:0o600,flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
 process.env.ADMIN_DATABASE_URL=url;await import('./migrate.mjs');
 try{await access(local+'/runtime.json');}catch{await import('./provision-security.mjs');}const runtime=JSON.parse(await readFile(local+'/runtime.json','utf8'));const appUrl=new URL(url);appUrl.username='moldae_app';appUrl.password=runtime.password;process.env.DATABASE_URL=appUrl.toString();delete process.env.ADMIN_DATABASE_URL;
 console.log('Moldaê: http://127.0.0.1:3000');
 child=spawn(process.execPath,[root+'node_modules/next/dist/bin/next',process.argv.includes('--production')?'start':'dev','--hostname','127.0.0.1','--port','3000'],{cwd:root,env:process.env,stdio:'inherit'});
 child.on('exit',code=>{child=null;stop(code??0);});child.on('error',e=>{console.error(e.message);stop(1);});
}catch(e){console.error(e.message);await stop(1);}
