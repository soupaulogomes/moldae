// Deliberate allowlist: internal inputs and costing never reach the PDF renderer.
export function customerQuote(quote,company='Moldaê'){
 const quantity=Number(quote.result?.quantity),total=Number(quote.result?.price);
 if(!Number.isInteger(quantity)||quantity<1||!Number.isFinite(total)||total<0)throw Error('Confira a quantidade e o preço final do orçamento.');
 if(!String(quote.name||'').trim())throw Error('Informe o nome do projeto antes de gerar o PDF.');
 return {company:String(company||'Moldaê').slice(0,200),reference:String(quote.id||'').slice(0,8),date:quote.created_at?new Date(quote.created_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):new Date().toLocaleDateString('pt-BR'),name:String(quote.name).slice(0,200),customer:String(quote.customer||'').slice(0,200),description:String(quote.description||'').slice(0,5000),quantity,unitPrice:total/quantity,total};
}
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
function latin(text){return Array.from(String(text).normalize('NFC')).map(c=>{const n=c.codePointAt(0);return n<=255&&n>=32?c:c==='\n'?'\n':c==='–'||c==='—'?'-':c==='’'||c==='‘'?"'":c==='“'||c==='”'?'"':'?';}).join('');}
const literal=text=>latin(text).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
function wrap(text,width=47){const lines=[];for(const paragraph of latin(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){for(let rest=word;rest.length;){const part=rest.slice(0,width);rest=rest.slice(width);if((line+' '+part).trim().length>width){lines.push(line);line='';}line+=(line?' ':'')+part;}}lines.push(line);}return lines;}
export function customerQuotePdf(publicQuote){
 // Re-project even this public DTO so callers cannot accidentally append internal fields.
 const q=customerQuote({id:publicQuote.reference,name:publicQuote.name,customer:publicQuote.customer,description:publicQuote.description,result:{quantity:publicQuote.quantity,price:publicQuote.total}},publicQuote.company);
 const rows=[...wrap('Cliente: '+(q.customer||'Não informado')),...wrap('Projeto: '+q.name),'',...wrap(q.description),'','Quantidade: '+q.quantity+' unidade(s)','Preço unitário final: '+money(q.unitPrice),'VALOR TOTAL: '+money(q.total),'','Valores finais do orçamento, com os descontos aplicados.'];
 const chunks=[];for(let i=0;i<rows.length;i+=34)chunks.push(rows.slice(i,i+34));
 const objects=['','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
 const pages=[];
 for(let i=0;i<chunks.length;i++){
 const pageId=objects.length+1,streamId=pageId+1;pages.push(pageId);
 const text=(value,x,y,size=11,bold=false)=>'BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+literal(value)+') Tj ET';
 let content='0.992 0.969 0.918 rg 0 0 595 842 re f\n0.275 0.314 0.224 rg\n'+text(q.company.slice(0,70),48,778,Math.min(22,470/(Math.min(q.company.length,70)*0.95)),true)+'\n'+text('ORÇAMENTO',48,742,14,true)+'\n'+text('Data: '+(publicQuote.date||q.date)+(q.reference?'   |   Ref.: '+q.reference:''),48,716,10)+'\n0.82 0.84 0.78 RG 48 700 m 547 700 l S\n';
 chunks[i].forEach((row,j)=>{content+=text(row,48,670-j*17,row.startsWith('VALOR TOTAL:')?14:11,row.startsWith('VALOR TOTAL:'))+'\n';});
 content+=text('Página '+(i+1)+' de '+chunks.length,48,40,9);
 objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamId+' 0 R >>');objects.push('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');
 }
 objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]='<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map(n=>n+' 0 R').join(' ')+'] >>';
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return Uint8Array.from(pdf,c=>c.charCodeAt(0));
}
