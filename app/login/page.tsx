import { LoginForm } from '@/components/login-form';
import { BannerCarousel } from '@/components/banner-carousel';
import { HashAuthHandler } from '@/components/hash-auth-handler';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: banners } = await supabase
    .from('banners')
    .select('id, caption')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['banner_interval_seconds', 'banner_fade_ms']);

  const intervalSec =
    Number(settings?.find((s) => s.key === 'banner_interval_seconds')?.value ?? 6);
  const fadeMs = Number(settings?.find((s) => s.key === 'banner_fade_ms')?.value ?? 1200);

  return (
    <main className="min-h-dvh w-full grid lg:grid-cols-2 bg-black">
      <HashAuthHandler />
      {/* Left: form */}
      <section className="flex items-center justify-center px-6 py-12 lg:px-16 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-3 h-10 bg-bayern-red" />
            <span className="font-display text-2xl tracking-tightest uppercase">
              Bayernshoufu
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tightest leading-[0.95] mb-3">
            Welcome
            <br />
            <span className="text-bayern-red">Mia san mia.</span>
          </h1>
          <p className="text-bayern-muted text-sm mb-10">
            A private archive for FC Bayern jerseys. Sign in with the credentials sent to you.
          </p>

          <LoginForm redirectTo={searchParams.redirect} initialError={searchParams.error} />

          <p className="mt-8 text-xs text-bayern-muted leading-relaxed">
            This site is a non-commercial fan archive and is not affiliated with FC Bayern München AG.
            All marks and content are the property of their respective owners.
          </p>
        </div>
      </section>

      {/* Right: banner carousel */}
      <section className="relative h-[40vh] lg:h-auto lg:min-h-dvh order-1 lg:order-2 overflow-hidden">
        <BannerCarousel
          bannerIds={(banners ?? []).map((b) => b.id)}
          captions={(banners ?? []).map((b) => b.caption ?? '')}
          intervalMs={intervalSec * 1000}
          fadeMs={fadeMs}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black via-black/30 to-transparent lg:from-black lg:via-black/40 lg:to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-bayern-red" />
      </section>
    </main>
  );
}
