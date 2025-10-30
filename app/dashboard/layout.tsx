import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - CarWash',
  description: 'Your CarWash dashboard',
};

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


