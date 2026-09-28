import {readJson} from '../../../lib/http.mjs';
import {requireSession,authResponse,AuthError} from '../../../lib/auth.mjs';
import {validOrigin} from '../../../lib/request-origin.mjs';
import {maintain} from '../../../lib/maintenance-server.mjs';
import {pool,tenantTransaction} from '../../../lib/db.mjs';
import {calculate} from '../../../lib/calculate.mjs';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function number(x,label,{positive=false,integer=false}={}) {const n=Number(x);if(x===undefined||x===null||x===''||!Number.isFinite(n)||n<0||(positive&&n<=0)||(integer&&!Number.isInteger(n)))throw new Error('Valor inválido: '+label);return n;}
function text(x,label){if(typeof x!=='string'||!x.trim()||x.length>200)throw new Error('Preencha '+label);return x.trim();}
function date(x){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(Date.parse(x))||new Date(x).toISOString().slice(0,10)!==x)throw new Error('Data inválida.');return x;}
function id(x){if(typeof x!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x))throw new Error('Seleção inválida.');return x;}
async function entry(c,kind,description,amount,day,source){if(amount>0)await c.query('INSERT INTO entries(id,kind,description,amount,occurred_on,source_id) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),kind,description,amount,day,source]);}
export async function GET(req){try{const session=await requireSession(req);const data=await tenantTransaction(session,async c=>{const result={};for(const table of ['materials','equipment','quotes','jobs','sales','entries','movements','maintenance_plans','maintenance_logs','equipment_hour_logs'])result[table]=(await c.query('SELECT * FROM '+table+' ORDER BY created_at DESC')).rows;return result;});return Response.json(data,{headers:{'Cache-Control':'no-store'}});}catch(e){if(e instanceof AuthError)return authResponse(e);console.error(e.code||e.name);return Response.json({error:'Não foi possível conectar ao banco. Confira DATABASE_URL, PostgreSQL e a migração.'},{status:503});}}
export async function POST(req){
 if(!validOrigin(req))return Response.json({error:'Origem inválida.'},{status:403});
 try{const session=await requireSession(req,true);if(Number(req.headers.get('content-length'))>1048576)throw new AuthError('Pedido muito grande.',413);const body=await readJson(req,1048576); const {action,...v}=body;
 const result=await tenantTransaction(session,async c=>{
 const key=randomUUID();
 if(action==='material'||action==='materialUpdate') {
 const unit=v.unit;if(!['g','un'].includes(unit))throw new Error('Unidade inválida.');
 const trim=x=>String(x??'').trim().slice(0,200);
 const photo=String(v.imageUrl??'').trim();if(photo.startsWith('/api/images/')&&!(await c.query('SELECT id FROM uploads WHERE name=$1',[photo.split('/').at(-1)])).rows.length)throw new Error('Imagem não disponível nesta empresa.');if(photo&&!/^https:\/\//i.test(photo)&&!/^\/api\/images\/[a-f0-9-]+\.(png|jpg|webp)$/.test(photo))throw new Error('Use uma foto enviada ou um link HTTPS.');
 if(!/^#[0-9a-f]{6}$/i.test(v.colorHex??'#808080'))throw new Error('Cor inválida.');
 const args=[text(v.name,'nome'),unit,number(v.minimum,'estoque mínimo'),trim(v.brand),trim(v.color),v.colorHex||'#808080',trim(v.materialType),photo,trim(v.sku),trim(v.location),trim(v.supplier),String(v.notes??'').slice(0,2000)];
 if(action==='material')await c.query('INSERT INTO materials(name,unit,minimum,brand,color,color_hex,material_type,image_url,sku,location,supplier,notes,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[...args,key]);
 else{const old=(await c.query('SELECT * FROM materials WHERE id=$1 FOR UPDATE',[id(v.materialId)])).rows[0];if(!old)throw new Error('Material não encontrado.');if(old.unit!==unit)throw new Error('A unidade de um cadastro existente não pode mudar.');await c.query('UPDATE materials SET name=$1,unit=$2,minimum=$3,brand=$4,color=$5,color_hex=$6,material_type=$7,image_url=$8,sku=$9,location=$10,supplier=$11,notes=$12 WHERE id=$13',[...args,old.id]);}
 }

 else if(action==='openingStock') {
 const amount=number(v.quantity,'quantidade',{positive:true});
 const m=(await c.query('SELECT * FROM materials WHERE id=$1 FOR UPDATE',[id(v.materialId)])).rows[0];
 if(!m)throw new Error('Material não encontrado.');
 if(Number(m.quantity)!==0||(await c.query('SELECT id FROM movements WHERE material_id=$1 LIMIT 1',[m.id])).rows.length)throw new Error('Saldo inicial já registrado ou material já movimentado.');
 await c.query('UPDATE materials SET quantity=$1,cost_pending=true WHERE id=$2',[amount,m.id]);
 await c.query('INSERT INTO movements(id,material_id,quantity,unit_cost,reason) VALUES($1,$2,$3,0,$4)',[key,m.id,amount,'Saldo inicial']);
 }
 else if(action==='openingCost') {
 const total=number(v.total,'custo do saldo inicial',{positive:true});
 const m=(await c.query('SELECT * FROM materials WHERE id=$1 FOR UPDATE',[id(v.materialId)])).rows[0];
 if(!m?.cost_pending||Number(m.quantity)<=0)throw new Error('Este material não possui custo inicial pendente.');
 const cost=total/Number(m.quantity);
 await c.query('UPDATE materials SET unit_cost=$1,cost_pending=false WHERE id=$2',[cost,m.id]);
 await c.query('UPDATE movements SET unit_cost=$1 WHERE material_id=$2 AND reason=$3',[cost,m.id,'Saldo inicial']);
 }
 else if(action==='purchase') {const amount=number(v.quantity,'quantidade',{positive:true});const total=number(v.total,'valor',{positive:true});const material=(await c.query('SELECT * FROM materials WHERE id=$1 FOR UPDATE',[id(v.materialId)])).rows[0];if(!material)throw new Error('Material não encontrado.');if(material.cost_pending)throw new Error('Informe o custo do saldo inicial antes de registrar outra compra.');const cost=(Number(material.quantity)*Number(material.unit_cost)+total)/(Number(material.quantity)+amount);await c.query('UPDATE materials SET quantity=quantity+$1,unit_cost=$2 WHERE id=$3',[amount,cost,material.id]);await c.query('INSERT INTO movements(id,material_id,quantity,unit_cost,reason) VALUES($1,$2,$3,$4,$5)',[key,material.id,amount,total/amount,'Compra']);await entry(c,'estoque','Compra: '+material.name,total,date(v.date),key);}
 else if(action==='consume') {const quantity=number(v.quantity,'quantidade',{positive:true});if(!['Consumo de insumo','Perda avulsa'].includes(v.reason))throw new Error('Motivo inválido.');const m=(await c.query('SELECT * FROM materials WHERE id=$1 FOR UPDATE',[id(v.materialId)])).rows[0];if(m?.cost_pending)throw new Error('Informe o custo inicial antes de registrar consumo ou perda.');if(!m||Number(m.quantity)<quantity)throw new Error('Estoque insuficiente.');await c.query('UPDATE materials SET quantity=quantity-$1 WHERE id=$2',[quantity,m.id]);await c.query('INSERT INTO movements(id,material_id,quantity,unit_cost,reason,created_at) VALUES($1,$2,$3,$4,$5,$6::date)',[key,m.id,-quantity,m.unit_cost,v.reason,date(v.date)]);}
 else if(action==='equipment') {const kind=v.kind;if(!['impressora','ferramenta'].includes(kind))throw new Error('Tipo inválido.');const value=number(v.purchaseValue,'valor');await c.query('INSERT INTO equipment(id,name,kind,purchase_value,watts,life_hours) VALUES($1,$2,$3,$4,$5,$6)',[key,text(v.name,'nome'),kind,value,number(v.watts,'potência'),number(v.lifeHours,'vida útil',{positive:true})]);if(v.recordPayment===true)await entry(c,'investimento','Compra: '+v.name,value,date(v.date),key);}
 else if(action==='quote'){const result=calculate(v.input);await c.query('INSERT INTO quotes(id,name,customer,input,result,description) VALUES($1,$2,$3,$4,$5,$6)',[key,text(v.name,'projeto'),String(v.customer??'').slice(0,200),JSON.stringify(v.input),JSON.stringify(result),String(v.description??'').slice(0,5000)]);}
 else if(action==='job'){const material=(await c.query('SELECT unit FROM materials WHERE id=$1',[id(v.materialId)])).rows[0];if(!material||material.unit!=='g')throw new Error('Selecione um material em gramas.');await c.query('INSERT INTO jobs(id,quote_id,material_id,equipment_id) VALUES($1,$2,$3,$4)',[key,id(v.quoteId),id(v.materialId),v.equipmentId?id(v.equipmentId):null]);}
 else if(action==='finish') {
 const job=(await c.query('SELECT * FROM jobs WHERE id=$1 FOR UPDATE',[id(v.jobId)])).rows[0];if(!job||job.status!=='fila')throw new Error('Produção já finalizada ou não encontrada.');
 if(!['concluido','falha'].includes(v.status))throw new Error('Resultado inválido.');
 const grams=number(v.grams,'consumo'),hours=number(v.hours,'horas'),laborMinutes=number(v.laborMinutes,'trabalho manual'),extras=number(v.extras,'extras');
 const material=(await c.query('SELECT * FROM materials WHERE id=$1 FOR UPDATE',[job.material_id])).rows[0];if(material.cost_pending)throw new Error('Informe o custo inicial do filamento antes de finalizar a produção.');if(Number(material.quantity)<grams)throw new Error('Estoque insuficiente. Registre a compra antes de finalizar.');
 const quote=(await c.query('SELECT * FROM quotes WHERE id=$1',[job.quote_id])).rows[0];const input=quote.input;
 const equip=job.equipment_id?(await c.query('SELECT * FROM equipment WHERE id=$1 FOR UPDATE',[job.equipment_id])).rows[0]:null;
 const actual=calculate({...input,grams,kgPrice:Number(material.unit_cost)*1000,hours,laborMinutes,extras,failurePercent:0,discountValue:0,discountType:'percent',feePercent:0,taxPercent:0,fixedFee:0,markupPercent:0,...(equip?{watts:Number(equip.watts),machineValue:Number(equip.purchase_value),lifeHours:Number(equip.life_hours)}:{})});
 await c.query('UPDATE materials SET quantity=quantity-$1 WHERE id=$2',[grams,material.id]);
 if(grams>0)await c.query('INSERT INTO movements(id,material_id,quantity,unit_cost,reason,source_id) VALUES($1,$2,$3,$4,$5,$6)',[key,material.id,-grams,material.unit_cost,v.status==='falha'?'Falha de impressão':'Produção',job.id]);
 if(equip)await c.query('UPDATE equipment SET used_hours=used_hours+$1 WHERE id=$2',[hours,equip.id]);
 await c.query('UPDATE jobs SET status=$1,actual_grams=$2,actual_hours=$3,actual_cost=$4,finished_at=$5::date WHERE id=$6',[v.status,grams,hours,actual.totalCost,date(v.date),job.id]);
 }
 else if(action==='sale') {const job=(await c.query('SELECT * FROM jobs WHERE id=$1 FOR UPDATE',[id(v.jobId)])).rows[0];if(!job||job.status!=='concluido')throw new Error('Selecione uma produção concluída.');const amount=number(v.amount,'venda',{positive:true}),fees=number(v.fees,'taxas');if(fees>amount)throw new Error('Taxas maiores que a venda.');const day=date(v.date);await c.query('INSERT INTO sales(id,job_id,amount,fees,cost,sold_on,paid_on) VALUES($1,$2,$3,$4,$5,$6,$7)',[key,job.id,amount,fees,job.actual_cost,day,v.paid===true?day:null]);if(v.paid===true){await entry(c,'receita','Venda recebida',amount,day,key);await entry(c,'despesa','Taxas de venda',fees,day,key);}}
 else if(action==='receive'){const sale=(await c.query('SELECT * FROM sales WHERE id=$1 FOR UPDATE',[id(v.saleId)])).rows[0];if(!sale||sale.paid_on)throw new Error('Venda já recebida ou não encontrada.');const day=date(v.date);await c.query('UPDATE sales SET paid_on=$1 WHERE id=$2',[day,sale.id]);await entry(c,'receita','Venda recebida',Number(sale.amount),day,sale.id);await entry(c,'despesa','Taxas de venda',Number(sale.fees),day,sale.id);}
 else if(['maintenancePlan','maintenanceUpdate','maintenanceDone','equipmentHours'].includes(action)){await maintain(c,action,v,key);}
 else if(action==='entry') {if(!['despesa','investimento','aporte','retirada'].includes(v.kind))throw new Error('Categoria inválida.');await entry(c,v.kind,text(v.description,'descrição'),number(v.amount,'valor',{positive:true}),date(v.date),key);if(v.kind==='despesa'&&v.affectsResult===true)await c.query('UPDATE entries SET affects_result=true WHERE source_id=$1',[key]);}
 else throw new Error('Ação inválida.');
 await c.query('INSERT INTO audit_events(id,actor_id,action,entity_id) VALUES($1,$2,$3,$4)',[randomUUID(),session.user_id,action,key]);return {id:key};
 });return Response.json(result,{status:201});
 }catch(e){if(e instanceof AuthError)return authResponse(e);console.error(e.code||e.name);const message=e.code==='23505'?(e.constraint==='material_sku_unique'?'Já existe um material com este código.':'Esta produção já tem uma venda.'):e.code==='23503'?'Registro relacionado não encontrado.':e.code||!process.env.DATABASE_URL?'Não foi possível salvar. Confira a conexão com o banco.':e.message;return Response.json({error:message},{status:400});}
}
