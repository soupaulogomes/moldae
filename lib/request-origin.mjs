export function validOrigin(req) {
 const origin=req.headers.get('origin'); if(!origin)return false;
 try{const source=new URL(origin), target=new URL(process.env.APP_ORIGIN||req.url);if(source.origin===target.origin)return true;
 const local=new Set(['localhost','127.0.0.1','[::1]']);return !process.env.APP_ORIGIN&&local.has(source.hostname)&&local.has(target.hostname)&&source.protocol===target.protocol&&source.port===target.port;
 }catch{return false;}
}
