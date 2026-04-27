import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SetPasswordForm } from '@/components/set-password-form';

export const dynamic = 'force-dynamic';

export default async function SetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 bg-black">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-3 h-10 bg-bayern-red" />
          <span className="font-display text-2xl tracking-tightest uppercase">Bayernshoufu</span>
        </div>
        <h1 className="font-display text-4xl uppercase tracking-tightest leading-tight mb-2">
          Set your password
        </h1>
        <p className="text-bayern-muted text-sm mb-8">
          Welcome, {user.email}. Pick a strong password to finish setup.
        </p>
        <SetPasswordForm />
      </div>
    </main>
  );
}
