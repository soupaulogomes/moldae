export function equipmentHours(e){return Number(e.used_hours||0)+Number(e.prior_hours||0);}
export function depreciation(e){const hours=equipmentHours(e),life=Number(e.life_hours),value=Number(e.purchase_value);const fraction=life>0?Math.min(1,hours/life):0;return {hours,rate:life>0?value/life:0,usedValue:value*fraction,remainingValue:Math.max(0,value*(1-fraction)),remainingHours:Math.max(0,life-hours),percent:fraction*100};}
const dayMillis=86400000;
export function maintenanceStatus(plan,equipment,today){
 const hours=equipmentHours(equipment),remainingHours=plan.interval_hours==null?null:Number(plan.baseline_hours)+Number(plan.interval_hours)-hours;
 const nextOn=plan.interval_days==null?null:new Date(Date.parse(String(plan.baseline_on).slice(0,10)+'T00:00:00Z')+Number(plan.interval_days)*dayMillis).toISOString().slice(0,10);
 const remainingDays=nextOn==null?null:Math.round((Date.parse(nextOn+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/dayMillis);
 let state='ok';
 if(!plan.active)state='paused';
 else if((remainingHours!==null&&remainingHours<0)||(remainingDays!==null&&remainingDays<0))state='overdue';
 else if(remainingHours===0||remainingDays===0)state='due';
 else if((remainingHours!==null&&remainingHours<=Number(plan.warn_hours))||(remainingDays!==null&&remainingDays<=Number(plan.warn_days)))state='soon';
 return {state,remainingHours,remainingDays,nextOn,nextHours:plan.interval_hours==null?null:Number(plan.baseline_hours)+Number(plan.interval_hours)};
}
