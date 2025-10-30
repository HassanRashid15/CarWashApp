'use client';

import { AuthForm } from '@/components/auth/auth-form';
import { SignupForm } from '@/components/auth/signup-form';
import { AdminCodeModal } from '@/components/auth/admin-code-modal';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function SignupContent() {
  const searchParams = useSearchParams();
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
  };

  if (isAdmin && !adminCode) {
    return (
      <>
        <AdminCodeModal
          isOpen={showCodeModal}
          onClose={() => setShowCodeModal(false)}
          onCodeValid={handleCodeValid}
          mode="signup"
        />
        <AuthForm
          title="Create Admin Account"
          description="Admin code required to create an admin account"
        >
          <div className="text-center text-muted-foreground">
            Please enter your admin code to continue with signup.
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
        mode="signup"
      />
      <AuthForm
        title={isAdmin ? 'Create Admin Account' : 'Create an Account'}
        description={
          isAdmin
            ? 'Enter your details to create an admin account'
            : 'Enter your details to create a new account'
        }
      >
        <SignupForm isAdmin={isAdmin} adminCode={adminCode} />
      </AuthForm>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}
