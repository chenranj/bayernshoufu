import { requireAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/server';
import { createBanner, updateBanner, deleteBanner, updateBannerSettings } from '../_actions';

export const dynamic = 'force-dynamic';

export default async function BannersAdmin() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: banners }, { data: settings }] = await Promise.all([
    admin.from('banners').select('*').order('sort_order'),
    admin.from('site_settings').select('key, value'),
  ]);
  const interval = Number(settings?.find((s) => s.key === 'banner_interval_seconds')?.value ?? 6);
  const fade = Number(settings?.find((s) => s.key === 'banner_fade_ms')?.value ?? 1200);

  return (
    <div>
      <h1 className="font-display text-3xl uppercase tracking-tightest mb-6">Login Banners</h1>

      <form
        action={updateBannerSettings}
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
      >
        <div>
          <label className="label">Carousel interval (seconds)</label>
          <input
            name="banner_interval_seconds"
            type="number"
            min={2}
            defaultValue={interval}
            className="input"
          />
        </div>
        <div>
          <label className="label">Fade duration (ms)</label>
          <input
            name="banner_fade_ms"
            type="number"
            min={200}
            step={100}
            defaultValue={fade}
            className="input"
          />
        </div>
        <button type="submit" className="btn-ghost uppercase tracking-widest text-xs">
          Save settings
        </button>
      </form>

      <form
        action={createBanner}
        encType="multipart/form-data"
        className="bg-bayern-surface border border-bayern-border p-5 mb-8 grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        <div className="md:col-span-5">
          <label className="label">Image</label>
          <input name="image" type="file" accept="image/*" required className="input" />
        </div>
        <div className="md:col-span-5">
          <label className="label">Caption (optional)</label>
          <input name="caption" className="input" placeholder="Mia san mia" />
        </div>
        <div className="md:col-span-1">
          <label className="label">Sort</label>
          <input name="sort_order" type="number" defaultValue={0} className="input" />
        </div>
        <div className="md:col-span-1 flex items-end">
          <label className="flex items-center gap-2 text-xs pb-3">
            <input type="checkbox" name="active" defaultChecked /> Active
          </label>
        </div>
        <button type="submit" className="btn-primary uppercase tracking-widest text-sm md:col-span-12">
          Add banner
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(banners ?? []).map((b) => (
          <form
            key={b.id}
            action={updateBanner}
            encType="multipart/form-data"
            className="bg-bayern-surface border border-bayern-border p-4 space-y-3"
          >
            <input type="hidden" name="id" value={b.id} />
            <div className="aspect-[16/9] overflow-hidden border border-bayern-border bg-black">
              <img
                src={`/api/image/banners/${b.id}`}
                alt={b.caption ?? ''}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <div>
              <label className="label">Caption</label>
              <input name="caption" defaultValue={b.caption ?? ''} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Sort</label>
                <input name="sort_order" type="number" defaultValue={b.sort_order} className="input" />
              </div>
              <div className="col-span-2 flex items-end">
                <label className="flex items-center gap-2 text-xs pb-3">
                  <input type="checkbox" name="active" defaultChecked={b.active} /> Active
                </label>
              </div>
            </div>
            <div>
              <label className="label">Replace image</label>
              <input name="image" type="file" accept="image/*" className="input" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-ghost uppercase tracking-widest text-xs">Save</button>
              <button
                type="submit"
                formAction={deleteBanner}
                className="border border-bayern-red/40 hover:bg-bayern-red text-bayern-red hover:text-white px-3 text-xs uppercase tracking-widest transition-colors"
              >
                Delete
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
