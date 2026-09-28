export function summarize(data,from='',to='') {
 const day=x=>String(x).slice(0,10);const inside=x=>(!from||day(x)>=from)&&(!to||day(x)<=to);
 const sum=(rows,field)=>rows.reduce((n,r)=>n+Number(r[field]||0),0);
 const sales=data.sales.filter(s=>inside(s.sold_on));
 const entries=data.entries.filter(e=>inside(e.occurred_on));
 const revenue=sum(sales,'amount'),cost=sum(sales,'cost'),fees=sum(sales,'fees');
 const loss=sum(data.jobs.filter(j=>j.status==='falha'&&inside(j.finished_at)),'actual_cost')+(data.movements||[]).filter(m=>m.reason==='Perda avulsa'&&inside(m.created_at)).reduce((n,m)=>n+Math.abs(Number(m.quantity))*Number(m.unit_cost),0);
 const overhead=sum(entries.filter(e=>e.kind==='despesa'&&e.affects_result),'amount');
 const cash=entries.reduce((n,e)=>n+(['receita','aporte'].includes(e.kind)?1:-1)*Number(e.amount),0);
 return {revenue,cost,fees,loss,overhead,profit:revenue-cost-fees-loss-overhead,cash,entries,receivable:data.sales.filter(s=>!s.paid_on).reduce((n,s)=>n+Number(s.amount)-Number(s.fees),0),stock:data.materials.reduce((n,m)=>n+Number(m.quantity)*Number(m.unit_cost),0),assets:sum(data.equipment,'purchase_value'),investment:sum(entries.filter(e=>e.kind==='investimento'),'amount')};
}

// Visão acumulada: patrimônio aplicado, financiamento e desempenho são separados.
export function investmentOverview(data) {
 const n=v=>Number(v||0), sum=rows=>rows.reduce((a,r)=>a+n(r.amount),0);
 const entries=data.entries||[], equipment=data.equipment||[], materials=data.materials||[];
 const opening=(data.movements||[]).filter(m=>m.reason==='Saldo inicial');
 const equipmentIds=new Set(equipment.map(e=>e.id));
 const equipmentPayments=entries.filter(e=>e.kind==='investimento'&&equipmentIds.has(e.source_id));
 const unpaidEquipment=equipment.filter(e=>!equipmentPayments.some(p=>p.source_id===e.id));
 const initialStock=opening.reduce((a,m)=>a+n(m.quantity)*n(m.unit_cost),0);
 const historicalAssets=unpaidEquipment.reduce((a,e)=>a+n(e.purchase_value),0);
 const equipmentValue=equipment.reduce((a,e)=>a+n(e.purchase_value),0);
 const stockPurchases=sum(entries.filter(e=>e.kind==='estoque'));
 const otherInvestments=sum(entries.filter(e=>e.kind==='investimento'&&!equipmentIds.has(e.source_id)));
 const applied=equipmentValue+initialStock+stockPurchases+otherInvestments;
 const received=sum(entries.filter(e=>e.kind==='receita'));
 const contributions=sum(entries.filter(e=>e.kind==='aporte'));
 const withdrawals=sum(entries.filter(e=>e.kind==='retirada'));
 const expenses=sum(entries.filter(e=>e.kind==='despesa'));
 const investmentsPaid=sum(entries.filter(e=>e.kind==='investimento'));
 const cashOut=expenses+stockPurchases+investmentsPaid;
 const initial=historicalAssets+initialStock;
 const balance=received-cashOut-initial;
 const totals=summarize(data);
 const profit=totals.profit;
 return {applied,received,contributions,withdrawals,expenses,cashOut,initial,balance,
 remaining:Math.max(0,-balance),surplus:Math.max(0,balance),profit,
 profitRemaining:Math.max(0,applied-profit),progress:applied>0?Math.max(0,Math.min(100,profit/applied*100)):0,
 cash:totals.cash,receivable:totals.receivable,
 pending:materials.some(m=>m.cost_pending),
 sources:[...equipment.map(e=>({id:e.id,name:e.name,kind:'Equipamento',amount:n(e.purchase_value),origin:equipmentPayments.some(p=>p.source_id===e.id)?'Pagamento no caixa':'Aquisição anterior · fora do caixa'})),
 ...opening.map(m=>({id:m.id,name:materials.find(x=>x.id===m.material_id)?.name||'Material',kind:'Estoque inicial',amount:n(m.quantity)*n(m.unit_cost),pending:materials.find(x=>x.id===m.material_id)?.cost_pending,origin:'Saldo inicial · fora do caixa'})),
 ...entries.filter(e=>e.kind==='estoque'||(e.kind==='investimento'&&!equipmentIds.has(e.source_id))).map(e=>({id:e.id,name:e.description,kind:e.kind==='estoque'?'Compra de estoque':'Outro investimento',amount:n(e.amount),origin:'Pagamento no caixa'}))]};
}
