

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardShell from '../components/DashboardShell';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Alinhado ao middleware: toda rota autenticada leva ao login.
    redirect('/login');
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}