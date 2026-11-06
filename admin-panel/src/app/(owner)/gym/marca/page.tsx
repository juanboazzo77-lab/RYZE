import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { getBrand } from '@/server/gym-brand';
import { BrandEditor } from '@/features/owner/brand-editor';

export const metadata: Metadata = { title: 'Marca' };
export const dynamic = 'force-dynamic';

export default async function GymBrandPage() {
  const owner = await requireOwnerPage();
  const brand = await getBrand(owner.userId, owner.gym.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tu marca</h1>
        <p className="text-sm text-muted-foreground">Tu logo y tu color aparecen dentro de la app de tus socios, en la tarjeta de tu gimnasio.</p>
      </div>
      <BrandEditor gymName={owner.gym.name} logoUrl={brand?.logoUrl ?? null} color={brand?.color ?? null} />
    </div>
  );
}
