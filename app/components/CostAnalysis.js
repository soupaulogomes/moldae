'use client';
import {useEffect,useRef,useState} from 'react';
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const number=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4}).format(n);
function getItems(result,input){
 const v=k=>Number(input[k]||0);
 const energyKwh=v('watts')*v('hours')/1000;
 const base=result.totalCost-result.reserve;
 return [
 {id:'material',label:'Filamento',value:result.material,color:'#14967c',quantity:number(v('grams'))+' g',formula:money(v('kgPrice'))+' / kg ÷ 1.000 × '+number(v('grams'))+' g',note:'Material previsto para todo o lote, incluindo suportes e purga informados no peso.'},
 {id:'energy',label:'Energia elétrica',value:result.energy,color:'#c58913',quantity:number(energyKwh)+' kWh',formula:number(v('watts'))+' W × '+number(v('hours'))+' h ÷ 1.000 × '+money(v('kwh'))+' / kWh',note:'Consumo estimado pela potência média e pelo tempo de impressão.'},
 {id:'depreciation',label:'Amortização',value:result.depreciation,color:'#8c62c5',quantity:number(v('hours'))+' h de máquina',formula:money(v('machineValue'))+' ÷ '+number(v('lifeHours'))+' h × '+number(v('hours'))+' h',note:'Parcela do valor da impressora distribuída pelas horas de vida útil estimadas. Não é um pagamento deste lote.'},
 {id:'labor',label:'Trabalho manual',value:result.labor,color:'#347fc4',quantity:number(v('laborMinutes'))+' min',formula:number(v('laborMinutes'))+' min ÷ 60 × '+money(v('hourRate'))+' / h',note:'Tempo informado de preparação, acabamento e embalagem, separado do tempo automático da impressora.'},
 {id:'extras',label:'Custos adicionais',value:result.extras,color:'#1999a6',quantity:'Valor informado',formula:money(result.extras)+' em extras do lote',note:'Total informado para embalagens, acessórios e consumíveis. Esta versão não discrimina a quantidade de cada acessório.'},
 {id:'reserve',label:'Reserva de falhas',value:result.reserve,color:'#d27636',quantity:number(v('failurePercent'))+'% do custo base',formula:money(base)+' × '+number(v('failurePercent'))+'%',note:'Reserva preventiva sobre os custos, sem taxas. Não representa material já perdido nem consumo confirmado.'},
 {id:'commission',label:'Comissão de venda',value:result.price*v('feePercent')/100,color:'#ce567e',quantity:number(v('feePercent'))+'% da venda',formula:money(result.price)+' × '+number(v('feePercent'))+'%',note:'Aplicada ao valor de venda do lote após o desconto.'},
 {id:'tax',label:'Imposto de venda',value:result.price*v('taxPercent')/100,color:'#ac5260',quantity:number(v('taxPercent'))+'% da venda',formula:money(result.price)+' × '+number(v('taxPercent'))+'%',note:'Estimativa a partir do percentual que você informou para a venda.'},
 {id:'fixed',label:'Taxa fixa',value:v('fixedFee'),color:'#697b8f',quantity:'Uma vez por lote',formula:money(v('fixedFee'))+' por venda do lote',note:'Valor fixo informado, sem multiplicação pela quantidade de peças.'}
 ];
}
function Donut({items,total,large=false}){
 let offset=0;
 return <svg className={large?'analysis-donut large':'analysis-donut'} viewBox="0 0 180 180" role="img" aria-label={'Composição dos custos, total '+money(total)}>
 <circle cx="90" cy="90" r="69" fill="none" stroke="#e9ecdf" strokeWidth="23"/>
 {items.filter(i=>i.value>0).map(item=>{const percent=total?item.value/total*100:0;const start=offset;offset+=percent;return <circle key={item.id} cx="90" cy="90" r="69" fill="none" stroke={item.color} strokeWidth="23" pathLength="100" strokeDasharray={percent+' '+(100-percent)} strokeDashoffset={-start} transform="rotate(-90 90 90)"><title>{item.label+': '+money(item.value)+' ('+number(percent)+'%)'}</title></circle>;})}
 <text x="90" y="84" textAnchor="middle" fontSize="11" fill="#737967">CUSTOS + TAXAS</text><text x="90" y="105" textAnchor="middle" fontSize={money(total).length>13?'12':'17'} fontWeight="600" fill="#303b26">{money(total)}</text>
 </svg>;
}
export default function CostAnalysis({result,input,projectName,material}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState('material');
 const dialog=useRef(null);
 const items=getItems(result,input),total=result.totalCost+result.fees;
 const current=items.find(i=>i.id===selected)||items[0];
 useEffect(()=>{if(!open)return;const el=dialog.current,overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;};},[open]);
 function expand(id='material'){setSelected(id);setOpen(true);}
 return <>
 <section className="panel cost-analysis colorful-analysis"><div className="panel-heading"><h2>Custos e lucro do lote</h2><button className="analysis-expand" onClick={()=>expand()} aria-label="Ampliar análise de custos" title="Ampliar análise">⤢</button></div>
 <div className="analysis-mini"><Donut items={items} total={total}/><div className="analysis-legend">{items.map(item=><button key={item.id} onClick={()=>expand(item.id)} aria-label={'Detalhar '+item.label}><span><i style={{background:item.color}}/>{item.label}</span><b>{money(item.value)}</b></button>)}</div></div>
 <div className={'analysis-profit '+(result.profit<0?'is-loss':'')}><span>{result.profit<0?'Prejuízo previsto':'Lucro previsto'}<small>Depois dos custos e taxas</small></span><strong>{money(result.profit)}</strong></div>
 <button className="secondary analysis-details-button" onClick={()=>expand()}>Ampliar e ver detalhes <span aria-hidden="true">⤢</span></button>
 </section>
 <dialog ref={dialog} className="analysis-dialog" aria-labelledby="analysis-title" onClose={()=>setOpen(false)} onCancel={()=>setOpen(false)}>
 {open&&<><header className="analysis-dialog-header"><div><p className="eyebrow">MOLDAÊ · COMPOSIÇÃO DO ORÇAMENTO</p><h2 id="analysis-title">Cada custo, em detalhe</h2><p>{projectName||'Orçamento atual'} · {result.quantity} {result.quantity===1?'peça':'peças'} no lote</p></div><button className="close" autoFocus onClick={()=>setOpen(false)} aria-label="Fechar detalhamento de custos">×</button></header>
 <div className="analysis-dialog-content"><div className="analysis-summary"><div><span>Venda após desconto</span><strong>{money(result.price)}</strong><small>{money(result.unitPrice)} / peça</small></div><div><span>Custos + taxas</span><strong>{money(total)}</strong><small>{money(total/result.quantity)} / peça</small></div><div className={result.profit<0?'is-loss':'profit-card'}><span>{result.profit<0?'Prejuízo previsto':'Lucro previsto'}</span><strong>{money(result.profit)}</strong><small>Margem de {number(result.margin)}%</small></div></div>
 <div className="analysis-explorer"><Donut items={items} total={total} large/><section className="analysis-selected" style={{'--item-color':current.color}}><div className="analysis-selected-title"><h3><i style={{background:current.color}}/>{current.label}</h3><strong>{money(current.value)}</strong></div><p className="analysis-quantity">{current.quantity}</p><p className="analysis-formula">{current.formula} = <b>{money(current.value)}</b></p><p>{current.note}</p>{current.id==='material'&&material&&<small>{[material.brand,material.material_type,material.color].filter(Boolean).join(' · ')}</small>}<small>{total?number(current.value/total*100):'0'}% dos custos e taxas do lote</small></section></div>
 <p className="analysis-help">Selecione um componente para conferir o cálculo. Os valores por peça são rateados pela quantidade do lote.</p>
 <div className="table-scroll"><table className="analysis-table"><thead><tr><th>Componente</th><th>Quantidade / base do lote</th><th>Por peça</th><th>Total do lote</th><th>Participação*</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className={selected===item.id?'selected':''}><td><button onClick={()=>setSelected(item.id)} aria-pressed={selected===item.id}><i style={{background:item.color}}/>{item.label}</button></td><td>{item.quantity}</td><td>{money(item.value/result.quantity)}</td><td><b>{money(item.value)}</b></td><td><span>{total?number(item.value/total*100):'0'}%</span><div className="analysis-bar"><i style={{width:(total?item.value/total*100:0)+'%',background:item.color}}/></div></td></tr>)}</tbody><tfoot><tr><th colSpan="2">Total de custos e taxas</th><td>{money(total/result.quantity)}</td><td>{money(total)}</td><td>{total?'100%':'0%'}</td></tr></tfoot></table></div>
 <p className="analysis-help">*Participação sobre custos + taxas, sem incluir lucro. Consumos são estimativas do orçamento; a baixa do estoque acontece na finalização da produção. Valores exibidos são arredondados.</p>
 <div className="analysis-reconciliation"><span>Preço antes do desconto <b>{money(result.originalPrice)}</b></span><span>Desconto do lote <b>− {money(result.discount)}</b></span><span>Venda final <b>{money(result.price)}</b></span></div>
 </div><footer className="analysis-dialog-footer"><button className="primary" onClick={()=>setOpen(false)}>Voltar ao orçamento</button></footer></>}
 </dialog>
 </>;
}
