import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ErrorBoundary } from '@/components/error-boundary';
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
  return (
    <ErrorBoundary>
      <DashboardLayout>{children}</DashboardLayout>
    </ErrorBoundary>
  );
}


