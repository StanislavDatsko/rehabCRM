import type { AnatomicalMappingResponse, SurfaceAnchor } from '@repo/contracts';

export type SurfaceSelection = {
  anchor: SurfaceAnchor;
  mapping: AnatomicalMappingResponse;
  modelVersionId: string;
};

export type UnmappedSurfaceSelection = {
  modelVersionId: string;
  meshName: string;
  meshKey: string;
  primitiveIndex: number;
  mappingStatus: 'UNMAPPED';
};
