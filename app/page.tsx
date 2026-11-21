import { redirect } from 'next/navigation';
import { principal } from '@/lib/security';

export const dynamic = 'force-dynamic';

export default async function IndexPage() {
  const p = await principal();
  if (p?.role === 'user' || p?.role === 'admin') {
    redirect('/home');
  }
  redirect('/auth');
}
