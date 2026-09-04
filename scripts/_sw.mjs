import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const u = await p.profile.findFirst({ where: { email: 'demo@fitai.app' } });
  const start = 76.2;
  const perDay = -0.07;
  const today = new Date();
  await p.weightEntry.deleteMany({ where: { userId: u.id } });
  let n = 0;
  for (let i = 33; i >= 0; i--) {
    if (i % 7 === 3) continue;
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.35;
    const w = Math.round((start + perDay * (33 - i) + noise) * 10) / 10;
    await p.weightEntry.create({ data: { userId: u.id, date: d, weightKg: w } });
    n++;
  }
  await p.goal.updateMany({
    where: { userId: u.id, status: 'ACTIVE' },
    data: { startWeightKg: start, targetWeightKg: 72, type: 'LOSE_FAT' },
  });
  await p.profile.update({ where: { id: u.id }, data: { primaryGoal: 'LOSE_FAT' } });
  const l = await p.weightEntry.findFirst({ where: { userId: u.id }, orderBy: { date: 'desc' } });
  console.log('OK', n, 'entries; last', l.weightKg);
} catch (e) {
  console.error('FAIL:', e.message);
} finally {
  await p.$disconnect();
}
