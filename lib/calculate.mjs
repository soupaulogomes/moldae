export function calculate(input) {
 const names=['grams','kgPrice','hours','watts','kwh','machineValue','lifeHours','laborMinutes','hourRate','extras','failurePercent','feePercent','fixedFee','taxPercent','markupPercent','discountValue'];
 const v=Object.fromEntries(names.map(k=>[k,Number(input[k]??0)]));
 for(const [k,n] of Object.entries(v)) if(!Number.isFinite(n)||n<0) throw new Error('Valor inválido: '+k);
 const qty=Number(input.quantity??1);
 if(!Number.isInteger(qty)||qty<1||qty>100000) throw new Error('Quantidade deve ser um inteiro positivo.');
 if(v.lifeHours<=0) throw new Error('Vida útil deve ser maior que zero.');
 if(v.failurePercent>=100||v.feePercent+v.taxPercent>=100) throw new Error('Percentuais de risco ou taxas inválidos.');
 let material=v.grams*v.kgPrice/1000;if(input.materials!==undefined){if(!Array.isArray(input.materials)||!input.materials.length||input.materials.length>30)throw Error('Informe de 1 a 30 filamentos.');material=0;const seen=new Set();for(const m of input.materials){if(typeof m.materialId!=='string'||!m.materialId||seen.has(m.materialId))throw Error('Selecione filamentos diferentes.');seen.add(m.materialId);const grams=Number(m.grams),price=Number(m.kgPrice);if(!Number.isFinite(grams)||grams<0||!Number.isFinite(price)||price<0)throw Error('Consumo ou preço de filamento inválido.');material+=grams*price/1000;}}const energy=v.hours*v.watts/1000*v.kwh, depreciation=v.hours*v.machineValue/v.lifeHours,labor=v.laborMinutes/60*v.hourRate;
 const base=material+energy+depreciation+labor+v.extras;
 const reserve=base*v.failurePercent/100;
 const totalCost=base+reserve;
 const originalPrice=(totalCost*(1+v.markupPercent/100)+v.fixedFee)/(1-(v.feePercent+v.taxPercent)/100);
 const discountType=input.discountType??'percent';
 if(!['percent','fixed'].includes(discountType))throw new Error('Tipo de desconto inválido.');
 if(discountType==='percent'&&v.discountValue>100)throw new Error('Desconto não pode ultrapassar 100%.');
 const discount=discountType==='fixed'?v.discountValue:originalPrice*v.discountValue/100;
 if(discount>originalPrice)throw new Error('Desconto maior que o preço do lote.');
 const price=originalPrice-discount;
 const fees=price*(v.feePercent+v.taxPercent)/100+v.fixedFee;
 const profit=price-fees-totalCost;
 return {originalPrice,discount,unitCost:totalCost/qty,unitProfit:profit/qty,roiPieces:profit>0?Math.ceil(v.machineValue/(profit/qty)):null,quantity:qty,material,energy,depreciation,labor,extras:v.extras,reserve,totalCost,price,unitPrice:price/qty,fees,profit,margin:price?profit/price*100:0};
}
