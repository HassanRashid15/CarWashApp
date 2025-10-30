'use client';

import { AuthForm } from '@/components/auth/auth-form';
import { LoginForm } from '@/components/auth/login-form';
import { AdminCodeModal } from '@/components/auth/admin-code-modal';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAdmin = searchParams.get('role') === 'admin';
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [adminCode, setAdminCode] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      const savedCode = sessionStorage.getItem('adminCode');
      if (savedCode) {
        setAdminCode(savedCode);
      } else {
        setShowCodeModal(true);
      }
    }
  }, [isAdmin]);

  const handleCodeValid = (code: string) => {
    setAdminCode(code);
    setShowCodeModal(false);
    const next = searchParams.get('next');
    if (next) {
      router.push(next);
    }
  };

  if (isAdmin && !adminCode) {
    return (
      <>
        <AdminCodeModal
          isOpen={showCodeModal}
          onClose={() => setShowCodeModal(false)}
          onCodeValid={handleCodeValid}
          mode="login"
        />
        <AuthForm
          title="Admin Login"
          description="Admin code required to login as admin"
        >
          <div className="text-center text-muted-foreground">
            Please enter your admin code to continue.
          </div>
        </AuthForm>
      </>
    );
  }

  return (
    <>
      <AdminCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onCodeValid={handleCodeValid}
        mode="login"
      />
      <AuthForm
        title={isAdmin ? 'Admin Login' : 'Sign In'}
        description={
          isAdmin
            ? 'Enter your credentials to access admin dashboard'
            : 'Enter your credentials to access your account'
        }
      >
        <LoginForm isAdmin={isAdmin} adminCode={adminCode} />
      </AuthForm>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
