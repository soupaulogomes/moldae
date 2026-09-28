import {cookies} from 'next/headers';import {redirect} from 'next/navigation';import AuthForm from '../components/AuthForm';import {requireSession} from '../../lib/auth.mjs';
export const dynamic='force-dynamic';export const revalidate=0;
export default async function Page(){let authenticated=false;try{await requireSession(new Request('http://localhost/login',{headers:{cookie:(await cookies()).toString()}}));authenticated=true;}catch{}if(authenticated)redirect('/');return <AuthForm mode="login"/>;}
