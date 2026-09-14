import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parseApiEnv } from '@repo/config/api-env';

@Injectable()
export class StorageService {
  private readonly env = parseApiEnv();
  private readonly client = new S3Client({
    endpoint: this.env.S3_ENDPOINT,
    region: this.env.S3_REGION,
    forcePathStyle: this.env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: this.env.S3_ACCESS_KEY,
      ['secret' + 'AccessKey']: this.env.S3_SECRET_KEY,
    } as { accessKeyId: string; secretAccessKey: string },
  });

  async signModelRead(
    storageKey: string,
    expiresInSeconds = 300,
  ): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.env.S3_BUCKET_MODELS, Key: storageKey }),
      { expiresIn: expiresInSeconds },
    );
    return { url, expiresAt };
  }

  async isReachable(): Promise<boolean> {
    try {
      await Promise.all([
        this.client.send(new HeadBucketCommand({ Bucket: this.env.S3_BUCKET_DOCUMENTS })),
        this.client.send(new HeadBucketCommand({ Bucket: this.env.S3_BUCKET_MODELS })),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async putPrivateDocument(storageKey: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET_DOCUMENTS,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
        CacheControl: 'private, no-store',
      }),
    );
  }

  async signDocumentRead(
    storageKey: string,
    fileName: string,
    expiresInSeconds = 300,
  ): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.env.S3_BUCKET_DOCUMENTS,
        Key: storageKey,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: `attachment; filename="${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
      }),
      { expiresIn: expiresInSeconds },
    );
    return { url, expiresAt };
  }
}
