import type {
  AnatomicalMappingResponse,
  AnatomicalModelResponse,
  AnatomicalStructureResponse,
  BodyAnnotationResponse,
  BodyAnnotationStatus,
  BodyAnnotationType,
} from '@repo/contracts';

export type AnnotationFilters = {
  status: 'ALL' | BodyAnnotationStatus;
  type: 'ALL' | BodyAnnotationType;
  structureId: string | null;
  from: string;
  to: string;
};

export function searchAnatomicalStructures(
  structures: readonly AnatomicalStructureResponse[],
  query: string,
): AnatomicalStructureResponse[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...structures];
  return structures.filter((item) =>
    [item.name, item.canonicalName, item.displayNameEn, item.displayNameUk, item.code].some(
      (value) => value?.toLocaleLowerCase().includes(needle),
    ),
  );
}

export function filterBodyAnnotations(
  annotations: readonly BodyAnnotationResponse[],
  filters: AnnotationFilters,
): BodyAnnotationResponse[] {
  return annotations.filter(
    (item) =>
      (filters.status === 'ALL' || item.status === filters.status) &&
      (filters.type === 'ALL' || item.type === filters.type) &&
      (!filters.structureId || item.structure.id === filters.structureId) &&
      (!filters.from || item.createdAt >= `${filters.from}T00:00:00`) &&
      (!filters.to || item.createdAt <= `${filters.to}T23:59:59.999`),
  );
}

export function renderTargetForStructure(
  models: readonly AnatomicalModelResponse[],
  mappings: readonly AnatomicalMappingResponse[],
  structureId: string,
): { mapping: AnatomicalMappingResponse; layerKind: string } | null {
  const mapping = mappings.find((item) => item.structureId === structureId);
  if (!mapping) return null;
  const model = models.find((item) => item.activeVersion?.id === mapping.modelVersionId);
  return model ? { mapping, layerKind: model.kind } : null;
}
