import { cookies } from 'next/headers';
import { Footer } from '@/components/layout/footer';
import { NavbarClient } from '@/components/layout/navbar-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AquaVance - Professional Car Care Services',
  description: 'Professional car wash and detailing services tailored to your needs',
};

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR: Get role from cookie
  const cookieStore = await cookies();
  const selectedRole = cookieStore.get('userRole')?.value || null;

  return (
    <div className="min-h-screen flex flex-col">
      <NavbarClient initialRole={selectedRole} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
