// El buzón del panel de gestión, leído desde la computadora (para "revisá el buzón").
//
//   node --env-file=.env scripts/buzon.mjs                 notas pendientes (baja las capturas a .scratch/buzon/)
//   node --env-file=.env scripts/buzon.mjs todas           también las resueltas
//   node --env-file=.env scripts/buzon.mjs estado <id> <PENDING|DOING|DONE> ["qué se hizo"]
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const [cmd, id, status, ...rest] = process.argv.slice(2);

try {
  if (cmd === 'estado') {
    if (!id || !['PENDING', 'DOING', 'DONE'].includes(status)) {
      throw new Error('Uso: estado <id> <PENDING|DOING|DONE> ["qué se hizo"]');
    }
    const reply = rest.join(' ').trim();
    const res = await prisma.adminNote.updateMany({ where: { id }, data: { status, ...(reply ? { reply } : {}) } });
    console.log(res.count ? 'Actualizada.' : 'No existe una nota con ese id.');
  } else {
    const rows = await prisma.adminNote.findMany({
      where: cmd === 'todas' ? {} : { status: { not: 'DONE' } },
      orderBy: { createdAt: 'asc' },
    });
    if (rows.length === 0) console.log('No hay notas pendientes en el buzón.');

    const storage =
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
          }).storage.from('admin-notes')
        : null;
    const dir = path.resolve('.scratch/buzon');

    for (const n of rows) {
      console.log(`\n[${n.status}] ${n.kind === 'BUG' ? 'ERROR' : 'MEJORA'} · ${n.createdAt.toISOString()} · id ${n.id}`);
      console.log(n.text);
      if (n.reply) console.log(`Qué se hizo: ${n.reply}`);
      if (n.photoPath && storage) {
        const file = await storage.download(n.photoPath);
        if (file.data) {
          fs.mkdirSync(dir, { recursive: true });
          const out = path.join(dir, path.basename(n.photoPath));
          fs.writeFileSync(out, Buffer.from(await file.data.arrayBuffer()));
          console.log(`Captura: ${out}`);
        } else console.log('Captura: no se pudo bajar.');
      }
    }
  }
} finally {
  await prisma.$disconnect();
}
