export type MediaItem = {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  mimeType: string;
  originalFileName: string;
  title: string | null;
  description: string | null;
  capturedAt: string | null;
  createdAt: string;
  uploadedBy: string;
  sizeBytes: string;
  encounterId?: string | null;
  encounterStartedAt?: string | null;
};

export type MediaListResponse = {
  items: MediaItem[];
  total: number;
  page?: number;
  pageSize?: number;
  hasNextPage?: boolean;
};

export type VisitMediaGroup = {
  encounterId: string;
  encounterStartedAt: string | null;
  items: MediaItem[];
};
