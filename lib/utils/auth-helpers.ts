import { createClient } from '@/utils/supabase/client';

export async function verifyOtp(email: string, otp: string) {
  const supabase = createClient();

  const isPasswordReset = sessionStorage.getItem('isPasswordReset') == 'true';

  const { data, error } = await supabase.auth.verifyOtp({
    token: otp,
    email,
    type: isPasswordReset ? 'recovery' : 'email',
  });

  if (error) throw error;

  return data;
}

export async function markProfileVerified(): Promise<void> {
  const supabase = createClient();

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userResult.user;
  if (!user) throw new Error('User not found after verification');

  // Update the user's profile row to mark as verified. This assumes a boolean column `is_verified` exists.
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) throw updateError;
}

export async function login(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function logout() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function updatePassword(password: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
}
