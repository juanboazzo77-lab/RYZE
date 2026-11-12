import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireOwnerPage } from '@/lib/owner';
import { PrintButton } from '@/features/owner/print-button';
import { listPlans } from '@/server/gym-plans';

export const metadata: Metadata = { title: 'Plantilla para anotar clientes' };
export const dynamic = 'force-dynamic';

const ROWS = 16;
const COLS = [
  { label: 'N°', cls: 'w-[8mm] text-center' },
  { label: 'Nombre y apellido', cls: 'w-[52mm]' },
  { label: 'WhatsApp (con código de área)', cls: 'w-[44mm]' },
  { label: 'Mail (opcional)', cls: 'w-[42mm]' },
  { label: 'Plan', cls: 'w-[38mm]' },
  { label: 'Cuota ($)', cls: 'w-[22mm]' },
  { label: 'Vence (día/mes/año)', cls: 'w-[32mm]' },
] as const;

/**
 * Hoja para imprimir y anotar los clientes a mano, un cliente por renglón y siempre en el mismo orden de columnas. Después
 * se le saca una foto y se sube en Clientes: la IA la lee y arma la lista para revisar y cargar.
 */
export default async function ClientSheetTemplatePage() {
  const owner = await requireOwnerPage();
  const plans = (await listPlans(owner.userId, owner.gym.id).catch(() => null)) ?? [];
  return (
    <div className="space-y-4">
      <style>{'@media print { @page { size: A4 landscape; margin: 9mm; } }'}</style>

      <div className="print:hidden">
        <Link href="/gym/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Plantilla para anotar clientes en papel</h1>
        <p className="text-sm text-muted-foreground">Si no querés estar con la compu todo el tiempo, imprimí esta hoja, anotá a tus clientes a mano y después le sacás una foto.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Imprimila en hoja A4 (se imprime acostada).</li>
          <li>Escribí un cliente por renglón, con letra clara, en este orden: nombre, WhatsApp, mail, plan, cuota y vencimiento. Lo principal es el nombre y el número de WhatsApp: el mail es opcional. En «Plan» escribí el nombre del plan tal como lo cargaste en Planes del gimnasio.</li>
          <li>Sacale una foto de frente, con buena luz y la hoja entera dentro de la imagen.</li>
          <li>
            En <strong>Clientes</strong>, tocá <strong>+ Cargar clientes</strong> y subí la foto. Revisás la lista que arma y la cargás.
          </li>
        </ol>
        <div className="mt-3">
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 text-[#161a22] print:border-0 print:p-0">
        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-lg font-bold leading-tight">{owner.gym.name}</p>
            <p className="text-xs text-[#5b6472]">Lista de clientes · un cliente por renglón, letra clara</p>
          </div>
          <p className="text-sm">
            Hoja N° <span className="inline-block w-12 border-b border-[#161a22]" />
          </p>
        </div>
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.label} className={`border border-[#161a22] bg-[#eef1f0] px-2 py-1.5 text-left text-xs font-semibold ${c.cls}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => (
              <tr key={i} className="h-[10mm]">
                <td className="border border-[#161a22] text-center text-xs text-[#5b6472]">{i + 1}</td>
                {COLS.slice(1).map((c) => (
                  <td key={c.label} className="border border-[#161a22]" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {plans.length > 0 ? (
          <p className="mt-2 text-xs">
            <strong>Planes:</strong> {plans.map((p) => p.name).join(' · ')}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-[#5b6472]">
          Ejemplo: Ana Pérez · 11 5555-1234 · ana@gmail.com · Pase libre · 25000 · 20/11/2026. Vencimiento = el día que le toca pagar. Si una hoja se llena, seguí en otra y numerala.
        </p>
      </div>
    </div>
  );
}
