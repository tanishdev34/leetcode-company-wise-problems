import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Simulate what getRoadmapDetail does
async function testGetRoadmapDetail(roadmapId: string) {
  try {
    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId },
      include: {
        company: { select: { name: true } },
        items: {
          include: {
            question: {
              select: { id: true, title: true, leetcodeUrl: true, difficulty: true, topics: true },
            },
          },
          orderBy: [{ plannedDate: 'asc' }, { sortOrder: 'asc' }],
        },
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!roadmap) {
      console.log('ERROR: Roadmap not found');
      return;
    }

    console.log(`Roadmap: ${roadmap.name}`);
    console.log(`Items count: ${roadmap.items.length}`);
    console.log(`Generation status: ${roadmap.generationStatus}`);

    // Check items have questions
    const itemsWithoutQuestion = roadmap.items.filter(i => !i.question);
    if (itemsWithoutQuestion.length > 0) {
      console.log(`WARNING: ${itemsWithoutQuestion.length} items without question!`);
    }

    // Check date grouping
    const dayGroups: Record<string, number> = {};
    for (const item of roadmap.items) {
      const key = new Date(item.plannedDate).toISOString().split('T')[0];
      dayGroups[key] = (dayGroups[key] || 0) + 1;
    }
    
    console.log(`Day groups: ${Object.keys(dayGroups).length}`);
    console.log(`Sample dates:`, Object.entries(dayGroups).slice(0, 5));

    // Check if filtering works
    const sampleDate = Object.keys(dayGroups)[0];
    const filtered = roadmap.items.filter(i => 
      new Date(i.plannedDate).toISOString().split('T')[0] === sampleDate
    );
    console.log(`Filter test for ${sampleDate}: ${filtered.length} items (expected ${dayGroups[sampleDate]})`);

    // Check serialization
    const serialized = JSON.stringify({ items: roadmap.items.map(i => ({ 
      id: i.id, 
      plannedDate: i.plannedDate,
      questionTitle: i.question?.title 
    })) });
    const deserialized = JSON.parse(serialized);
    
    // Check if dates still work after JSON roundtrip
    const roundtripFiltered = deserialized.items.filter((i: any) => 
      new Date(i.plannedDate).toISOString().split('T')[0] === sampleDate
    );
    console.log(`After JSON roundtrip filter for ${sampleDate}: ${roundtripFiltered.length} items`);

    console.log('\nSUCCESS: All checks passed!');
  } catch (e) {
    console.error('ERROR:', e);
  }
}

testGetRoadmapDetail('cmq6z7qa10000ofuq5v7b2t36').then(() => prisma.$disconnect());
