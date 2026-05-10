import 'dotenv/config';
import { PrismaClient } from '@db';

const prisma = new PrismaClient();

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(today + 'T00:00:00.000Z');
  const end = new Date(today + 'T23:59:59.000Z');

  const ids = [
    `shift_live_dt_bar_${today}`,
    `shift_live_dt_server_${today}`,
    `shift_live_ms_bar_${today}`,
    `shift_live_nyc_bar_${today}`,
  ];

  for (const id of ids) {
    const r = await prisma.shift.updateMany({
      where: { id },
      data: { startTime: start, endTime: end },
    });
    console.log(`${id}: updated ${r.count} record(s)`);
  }

  const onDuty = await prisma.shiftAssignment.count({
    where: {
      status: { not: 'CANCELLED' },
      shift: { startTime: { lte: new Date() }, endTime: { gte: new Date() } },
    },
  });
  console.log(`✅ on-duty assignments now active: ${onDuty}`);

  // Reset test swap requests back to the state expected by test-endpoints.sh
  const swapReset = await prisma.swapRequest.updateMany({
    where: { id: { in: ['swapreq_accepted_state'] }, status: { not: 'MANAGER_REVIEW' } },
    data: { status: 'MANAGER_REVIEW' },
  });
  console.log(`✅ swap requests reset: ${swapReset.count} record(s)`);
}

main().finally(() => prisma.$disconnect());
