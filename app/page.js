import {cookies} from 'next/headers';import {redirect} from 'next/navigation';import Workspace from './components/Workspace';import {requireSession} from '../lib/auth.mjs';
export const dynamic='force-dynamic';export const revalidate=0;
export default async function Page(){let s;try{s=await requireSession(new Request('http://localhost/',{headers:{cookie:(await cookies()).toString()}}));}catch{redirect('/login');}return <Workspace identity={{user:{id:s.user_id,name:s.name,email:s.email},company:{id:s.tenant_id,name:s.company,status:s.status,plan:s.plan},role:s.role}}/>;}
