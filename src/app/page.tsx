import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  if (!session) redirect('/login');
  if (session.user?.role === 'PENDING') redirect('/pending');

  redirect('/products');
}
