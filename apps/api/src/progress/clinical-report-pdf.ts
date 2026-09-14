import { Injectable } from '@nestjs/common';
import type { BodyAnnotationProgressResponse, GoalProgressResponse, MeasurementTrendsResponse, PlanHistoryItem, ProgressSummaryResponse } from '@repo/contracts';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

pdfMake.addVirtualFileSystem(pdfFonts);

export type ClinicalReportDocument = {
  organizationName: string;
  patientName: string;
  period: { from: string; to: string };
  generatedAt: Date;
  generatedBy: string;
  professionalSummary: string | null;
  sections: string[];
  summary: ProgressSummaryResponse;
  measurements: MeasurementTrendsResponse;
  goals: GoalProgressResponse;
  planHistory: PlanHistoryItem[];
  annotations: BodyAnnotationProgressResponse;
};

const date = (value: string) => new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeZone: 'Europe/Kyiv' }).format(new Date(value));
const number = (value: number) => new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value);
const heading = (text: string): Content => ({ text, style: 'sectionHeading', margin: [0, 14, 0, 6] });
const empty = (): Content => ({ text: 'За вибраний період даних немає.', color: '#667085', italics: true });
const annotationType = (value: string): string =>
  ({
    PAIN: 'Біль',
    MOBILITY_LIMITATION: 'Обмеження рухливості',
    WEAKNESS: 'Слабкість',
    TENSION: 'Напруження',
    INFLAMMATION: 'Запалення',
    POST_SURGERY: 'Після операції',
    INJURY: 'Травма',
    SENSITIVITY: 'Чутливість',
    OTHER: 'Інше',
  })[value] ?? value.replaceAll('_', ' ').toLocaleLowerCase('uk-UA');

@Injectable()
export class ClinicalReportPdfService {
  async render(input: ClinicalReportDocument): Promise<Buffer> {
    const content: Content[] = [
      { text: 'ЗВІТ ПРО ДИНАМІКУ РЕАБІЛІТАЦІЇ', style: 'title' },
      { text: input.organizationName, style: 'subtitle' },
      { columns: [
        [{ text: 'Пацієнт', style: 'label' }, input.patientName],
        [{ text: 'Період', style: 'label' }, `${date(input.period.from)} — ${date(input.period.to)}`],
      ], margin: [0, 14, 0, 8] },
      { text: `Сформував(ла): ${input.generatedBy} • ${date(input.generatedAt.toISOString())}`, color: '#475467', fontSize: 9 },
    ];
    if (input.sections.includes('SUMMARY')) {
      content.push(heading('Клінічне резюме'));
      content.push(input.professionalSummary ? { text: input.professionalSummary } : { text: 'Професійне резюме не додано.', color: '#667085', italics: true });
      content.push({ ul: [
        `Завершені контакти: ${input.summary.counts.completedEncounters}`,
        `Завершені оцінювання: ${input.summary.counts.completedAssessments}`,
        `Порівнювані ряди вимірювань: ${input.summary.counts.comparableMeasurementSeries}`,
        `Активні цілі: ${input.summary.counts.activeGoals}`,
        `Активні позначки тіла: ${input.summary.counts.activeBodyAnnotations}`,
      ], margin: [0, 6, 0, 0] });
    }
    if (input.sections.includes('MEASUREMENT_TRENDS')) {
      content.push(heading('Динаміка вимірювань'));
      if (!input.measurements.series.length) content.push(empty());
      for (const series of input.measurements.series) content.push({
        table: { headerRows: 1, widths: ['*', 70, 70, 60], body: [
          [{ text: `${series.definition.name}${series.region ? ` • ${series.region}` : ''}${series.laterality ? ` • ${series.laterality}` : ''}`, bold: true, colSpan: 4 }, {}, {}, {}],
          ['Дата', 'Значення', 'Базове', 'Δ'],
          ...series.points.map((point) => [date(point.performedAt), `${point.value} ${series.unit ?? ''}`.trim(), point.id === series.baseline.id ? 'Так' : '', point.id === series.latest.id ? number(series.deltaFromBaseline) : '']),
        ] }, layout: 'lightHorizontalLines', margin: [0, 4, 0, 10], fontSize: 9,
      });
    }
    if (input.sections.includes('GOAL_PROGRESS')) {
      content.push(heading('Прогрес цілей'));
      content.push(input.goals.goals.length ? { table: { headerRows: 1, widths: ['*', 55, 65, 65, 50], body: [
        ['Ціль', 'Статус', 'Базове', 'Поточне', 'Умова'],
        ...input.goals.goals.map((goal) => [goal.title, goal.status, goal.baseline ? `${goal.baseline.value} ${goal.baseline.unit ?? ''}` : '—', goal.current ? `${goal.current.value} ${goal.current.unit ?? ''}` : '—', goal.targetConditionMet === null ? '—' : goal.targetConditionMet ? 'виконана' : 'не виконана']),
      ] }, layout: 'lightHorizontalLines', fontSize: 8 } : empty());
      content.push({ text: 'Перевірка умови цілі є інформаційною та не змінює клінічний статус цілі.', color: '#667085', fontSize: 8, margin: [0, 5, 0, 0] });
    }
    if (input.sections.includes('PLAN_HISTORY')) {
      content.push(heading('Історія плану'));
      if (!input.planHistory.length) content.push(empty());
      input.planHistory.forEach((revision) => content.push({ stack: [
        { text: `${revision.title} • редакція ${revision.revisionNumber}`, bold: true },
        { text: `${date(revision.effectiveFrom ?? revision.createdAt)} • ${revision.planStatus}`, fontSize: 9, color: '#475467' },
        { text: revision.changeSummary ?? 'Опис змін не вказано.', fontSize: 9 },
      ], margin: [0, 3, 0, 7] }));
    }
    if (input.sections.includes('BODY_ANNOTATIONS')) {
      content.push(heading('Позначки на карті тіла'));
      content.push(input.annotations.groups.length ? { table: { headerRows: 1, widths: ['*', 70, 45, 45, 55], body: [
        ['Структура', 'Тип', 'Активні', 'Вирішені', 'Остання інтенсивність'],
        ...input.annotations.groups.map((group) => [group.structure.name, annotationType(group.type), group.activeCount, group.resolvedCount, group.latestSeverity ?? '—']),
      ] }, layout: 'lightHorizontalLines', fontSize: 8 } : empty());
    }
    content.push({ text: 'Цей звіт відображає задокументовані клінічні дані за вибраний період. Він не є автоматичним висновком або рекомендацією.', color: '#667085', fontSize: 8, margin: [0, 18, 0, 0] });
    const definition: TDocumentDefinitions = {
      pageSize: 'A4', pageMargins: [42, 46, 42, 48], content,
      background: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: '#FFFFFF' }] }),
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2, color: '#101828' },
      styles: { title: { fontSize: 16, bold: true, color: '#153E75' }, subtitle: { fontSize: 11, color: '#475467' }, label: { fontSize: 8, bold: true, color: '#667085' }, sectionHeading: { fontSize: 12, bold: true, color: '#153E75' } },
      footer: (currentPage, pageCount) => ({ columns: [{ text: 'RehabCRM • конфіденційно', color: '#667085', fontSize: 8 }, { text: `${currentPage} / ${pageCount}`, alignment: 'right', color: '#667085', fontSize: 8 }], margin: [42, 0, 42, 0] }),
      info: { title: `Звіт про динаміку — ${input.patientName}`, author: input.organizationName, subject: 'Клінічний звіт RehabCRM' },
    };
    return pdfMake.createPdf(definition).getBuffer();
  }
}
