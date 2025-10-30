import { cookies } from 'next/headers';
import { HomePageClient } from './home-page-client';

export default async function HomePage() {
  // SSR: Check role from cookie
  const cookieStore = await cookies();
  const selectedRole = cookieStore.get('userRole')?.value || null;

  return <HomePageClient initialRole={selectedRole} />;
}
