import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@taskcanvas.app' },
    update: {},
    create: {
      email: 'demo@taskcanvas.app',
      password: hashedPassword,
    },
  });

  console.log(`Created demo user: ${user.email}`);

  // Create some demo tasks
  const tasks = [
    {
      title: 'Review quarterly report',
      description: 'Analyze Q4 performance metrics and prepare summary for leadership.',
      quadrant: 'do_first' as const,
      positionX: 20,
      positionY: 30,
    },
    {
      title: 'Schedule team building event',
      description: 'Research venues and activities for the upcoming team building day.',
      quadrant: 'schedule' as const,
      positionX: 30,
      positionY: 20,
    },
    {
      title: 'Respond to vendor emails',
      description: 'Several non-urgent vendor inquiries waiting for response.',
      quadrant: 'delegate' as const,
      positionX: 40,
      positionY: 40,
    },
    {
      title: 'Unsubscribe from newsletters',
      description: 'Clean up inbox by unsubscribing from unused newsletters.',
      quadrant: 'eliminate' as const,
      positionX: 25,
      positionY: 35,
    },
    {
      title: 'Read new framework documentation',
      description: 'Check out the new features in the latest framework release.',
      quadrant: 'backlog' as const,
      positionX: null,
      positionY: null,
    },
  ];

  for (const taskData of tasks) {
    await prisma.task.create({
      data: {
        ...taskData,
        userId: user.id,
      },
    });
  }

  console.log(`Created ${tasks.length} demo tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
