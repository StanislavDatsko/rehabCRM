import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const definitions = [
  ['a5000000-0000-4000-8000-000000000001', 'pain.nrs', 'Інтенсивність болю', 'INTEGER', 'PAIN', 0, 10, 'OPTIONAL'],
  ['a5000000-0000-4000-8000-000000000002', 'rom.flexion', 'Згинання', 'NUMBER', 'RANGE_OF_MOTION', -30, 220, 'REQUIRED'],
  ['a5000000-0000-4000-8000-000000000003', 'rom.extension', 'Розгинання', 'NUMBER', 'RANGE_OF_MOTION', -90, 90, 'REQUIRED'],
  ['a5000000-0000-4000-8000-000000000004', 'strength.mrc', 'Мʼязова сила (шкала 0–5)', 'SCALE', 'STRENGTH', 0, 5, 'REQUIRED'],
  ['a5000000-0000-4000-8000-000000000005', 'mobility.timed_up_and_go', 'Timed Up and Go', 'NUMBER', 'FUNCTIONAL_TEST', 0, 600, 'NOT_APPLICABLE'],
  ['a5000000-0000-4000-8000-000000000006', 'mobility.walk_distance', 'Дистанція ходьби', 'NUMBER', 'MOBILITY', 0, 10000, 'NOT_APPLICABLE'],
] as const;
const templates = [
  ['a5100000-0000-4000-8000-000000000001', 'lower_limb.initial', 'Первинна оцінка нижньої кінцівки', [1, 2, 3, 4, 6]],
  ['a5100000-0000-4000-8000-000000000002', 'knee.assessment', 'Оцінка колінного суглоба', [1, 2, 3, 4]],
  ['a5100000-0000-4000-8000-000000000003', 'shoulder.assessment', 'Оцінка плечового суглоба', [1, 2, 3, 4]],
  ['a5100000-0000-4000-8000-000000000004', 'functional.general', 'Загальна функціональна оцінка', [1, 5, 6]],
] as const;
const exercises = [
  ['knee.quad-set', 'Ізометричне напруження квадрицепса', 'Активація квадрицепса.', 'STRENGTH', 'FOUNDATIONAL'],
  ['knee.heel-slide', 'Ковзання пʼятою', 'Рух для згинання коліна.', 'MOBILITY', 'FOUNDATIONAL'],
  ['hip.bridge', 'Сідничний місток', 'Зміцнення розгиначів кульшового суглоба.', 'STRENGTH', 'FOUNDATIONAL'],
] as const;

async function main() {
  for (const [id, code, name, valueType, category, minimumValue, maximumValue, anatomicalApplicability] of definitions) {
    await prisma.measurementDefinition.upsert({ where: { id }, update: { code, name, valueType, category, minimumValue, maximumValue, anatomicalApplicability, active: true }, create: { id, organizationId: null, code, name, description: 'Built-in reference definition.', valueType, category, minimumValue, maximumValue, anatomicalApplicability, active: true } });
  }
  for (const [index, [id, code, name, itemIndexes]] of templates.entries()) {
    await prisma.assessmentTemplate.upsert({ where: { id }, update: { code, name, active: true }, create: { id, organizationId: null, code, revision: 1, name, description: 'Built-in reference template; requires local clinical approval.', active: true, configurableSample: true } });
    for (const [order, definitionIndex] of itemIndexes.entries()) {
      const itemId = `a52${index + 1}0000-0000-4000-8000-${String(order + 1).padStart(12, '0')}`;
      await prisma.assessmentTemplateItem.upsert({ where: { id: itemId }, update: { templateId: id, measurementDefinitionId: definitions[definitionIndex - 1]![0], displayOrder: order + 1, required: order < 3 }, create: { id: itemId, templateId: id, measurementDefinitionId: definitions[definitionIndex - 1]![0], displayOrder: order + 1, required: order < 3 } });
    }
  }
  for (const [code, name, description, category, difficulty] of exercises) {
    await prisma.exerciseDefinition.upsert({ where: { id: `b6000000-0000-4000-8000-${code.replace(/[^a-z]/g, '').padEnd(12, '0').slice(0, 12)}` }, update: { name, description, category, difficulty, active: true }, create: { id: `b6000000-0000-4000-8000-${code.replace(/[^a-z]/g, '').padEnd(12, '0').slice(0, 12)}`, organizationId: null, code, name, description, instructions: description, category, difficulty, anatomicalRegionCodes: ['knee'], lateralityApplicability: ['LEFT', 'RIGHT'], targetMuscleGroupCodes: [], equipment: [], supportedDosageKinds: ['SETS_REPETITIONS'], active: true } });
  }
}

main().finally(() => prisma.$disconnect());
