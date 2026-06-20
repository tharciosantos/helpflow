

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UserProfile from '../components/UserProfile';
import SidebarNav from '../components/SidebarNav';
import MobileHeader from '../components/MobileHeader';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <aside className="hidden md:flex w-64 bg-gray-800 p-6 flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-10">HelpFlow</h1>
          <SidebarNav /> 
        </div>
        <div className="border-t border-gray-700 pt-4">
          <UserProfile />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader /> 
        <main className="flex-1 overflow-y-auto pt-4 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}