import {randomUUID} from 'node:crypto';
import {equipmentHours} from './maintenance.mjs';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
function num(v,label,{positive=false,integer=false}={}){const n=Number(v);if(v==null||v===''||!Number.isFinite(n)||n<0||(positive&&n<=0)||(integer&&!Number.isInteger(n)))throw new Error('Valor inválido: '+label);return n;}
function uuid(v){if(typeof v!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v))throw new Error('Selecione um registro válido.');return v;}
function text(v,label,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Preencha '+label);return v.trim();}
function day(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v||v>today())throw new Error('Informe uma data válida, até hoje.');return v;}
async function equipment(c,id){const e=(await c.query('SELECT * FROM equipment WHERE id=$1 FOR UPDATE',[uuid(id)])).rows[0];if(!e||e.kind!=='impressora')throw new Error('Selecione uma impressora cadastrada.');return e;}
async function plan(c,v){const p=(await c.query('SELECT *,baseline_on::text AS baseline_on FROM maintenance_plans WHERE id=$1 FOR UPDATE',[uuid(v.planId)])).rows[0];if(!p)throw new Error('Tarefa não encontrada.');if(p.version!==num(v.version,'versão',{integer:true}))throw new Error('Esta tarefa mudou. Atualize os dados e abra novamente.');return p;}
export async function maintain(c,action,v,key){
 if(action==='equipmentHours'){const e=await equipment(c,v.equipmentId);const hours=num(v.hours,'horas adicionais',{positive:true});await c.query('UPDATE equipment SET prior_hours=prior_hours+$1 WHERE id=$2',[hours,e.id]);await c.query('INSERT INTO equipment_hour_logs(id,equipment_id,added_hours,reason) VALUES($1,$2,$3,$4)',[key,e.id,hours,text(v.reason,'motivo')]);return;}
 if(action==='maintenanceDone'){
 const p=await plan(c,v);if(!p.active)throw new Error('Reative a tarefa antes de registrar a manutenção.');const e=await equipment(c,p.equipment_id);const date=day(v.date),meter=num(v.meterHours,'horímetro'),cost=num(v.cost,'custo');
 if(date<String(p.baseline_on).slice(0,10)||meter<Number(p.baseline_hours)||meter>equipmentHours(e))throw new Error('A data e o horímetro devem estar entre a última referência e o uso atual.');
 const paid=v.recordExpense===true&&cost>0;
 await c.query('INSERT INTO maintenance_logs(id,plan_id,equipment_id,title,performed_on,meter_hours,cost,expense_recorded,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[key,p.id,e.id,p.title,date,meter,cost,paid,String(v.notes||'').slice(0,2000)]);
 await c.query('UPDATE maintenance_plans SET baseline_hours=$1,baseline_on=$2,version=version+1 WHERE id=$3',[meter,date,p.id]);
 if(paid)await c.query("INSERT INTO entries(id,kind,description,amount,occurred_on,source_id,affects_result) VALUES($1,'despesa',$2,$3,$4,$5,$6)",[randomUUID(),'Manutenção: '+p.title+' · '+e.name,cost,date,key,v.affectsResult===true]);
 return;
 }
 const previous=action==='maintenanceUpdate'?await plan(c,v):null;
 const e=await equipment(c,previous?previous.equipment_id:v.equipmentId);
 const hours=v.intervalHours==null||v.intervalHours===''?null:num(v.intervalHours,'intervalo em horas',{positive:true});
 const days=v.intervalDays==null||v.intervalDays===''?null:num(v.intervalDays,'intervalo em dias',{positive:true,integer:true});
 if(hours===null&&days===null)throw new Error('Defina um intervalo em horas, em dias ou ambos.');
 const warningHours=num(v.warnHours??0,'antecedência em horas'),warningDays=num(v.warnDays??0,'antecedência em dias',{integer:true});
 if((hours!==null&&warningHours>hours)||(days!==null&&warningDays>days))throw new Error('A antecedência não pode ultrapassar o intervalo.');
 const title=text(v.title,'nome da tarefa'),notes=String(v.notes||'').slice(0,2000);
 if(previous){await c.query('UPDATE maintenance_plans SET title=$1,interval_hours=$2,interval_days=$3,warn_hours=$4,warn_days=$5,notes=$6,active=$7,version=version+1 WHERE id=$8',[title,hours,days,warningHours,warningDays,notes,v.active===true,previous.id]);}
 else {const baseline=num(v.baselineHours,'horas na última manutenção');if(baseline>equipmentHours(e))throw new Error('A referência não pode ultrapassar as horas da impressora.');await c.query('INSERT INTO maintenance_plans(id,equipment_id,title,interval_hours,interval_days,warn_hours,warn_days,baseline_hours,baseline_on,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[key,e.id,title,hours,days,warningHours,warningDays,baseline,day(v.baselineOn),notes]);}
}
