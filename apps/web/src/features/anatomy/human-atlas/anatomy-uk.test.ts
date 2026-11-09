import { describe, expect, it } from 'vitest';
import { matchesAnatomyQuery, ukrainianName } from './anatomy-uk';

describe('ukrainianName', () => {
  it('translates known names and keeps the side', () => {
    expect(ukrainianName('Right femur')).toBe('Стегнова кістка (праворуч)');
    expect(ukrainianName('heart')).toBe('Серце');
    expect(ukrainianName('Left gluteus maximus')).toBe('Великий сідничний м\'яз (ліворуч)');
  });
  it('builds regular names from rules', () => {
    expect(ukrainianName('Fifth cervical vertebra')).toBe('П\'ятий шийний хребець (C5)');
    expect(ukrainianName('third rib')).toBe('Третє ребро');
    expect(ukrainianName('Proximal phalanx of thumb')).toBe('Проксимальна фаланга великого пальця кисті');
    expect(ukrainianName('upper secondary canine tooth')).toBe('Верхнє ікло');
  });
  it('falls back to English for unknown names', () => {
    expect(ukrainianName('totally unknown thing')).toBe('totally unknown thing');
  });
  it('composes vessel names with Ukrainian agreement', () => {
    expect(ukrainianName('segment of artery')).toBe('Сегмент артерії');
    expect(ukrainianName('Lateral branch of anterior basal segmental artery')).toBe('Бічна гілка передньої базальної сегментарної артерії');
    expect(ukrainianName('Posterior intercostal arteries')).toBe('Задні міжреброві артерії');
    expect(ukrainianName('right common iliac artery')).toBe('Загальна клубова артерія (праворуч)');
    expect(ukrainianName('Hepatovenous segment IX')).toBe('Печінково-венозний сегмент IX');
  });
  it('matches queries in both languages', () => {
    expect(matchesAnatomyQuery('femur', 'стегн')).toBe(true);
    expect(matchesAnatomyQuery('femur', 'fem')).toBe(true);
    expect(matchesAnatomyQuery('femur', 'серце')).toBe(false);
  });
});
