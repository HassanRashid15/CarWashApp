import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - CarWash',
  description: 'Sign in to your CarWash account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      {children}
    </div>
  );
}


