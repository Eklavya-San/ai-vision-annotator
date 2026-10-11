import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, uploadImage } from './api';

const PNG = new File([new Uint8Array([137, 80, 78, 71])], 'test.png', { type: 'image/png' });

function fetchMock(responses: Array<{ matches: (url: string) => boolean; status: number; body?: unknown }>) {
  return vi.fn(async (url: string | URL) => {
    const entry = responses.find((r) => r.matches(String(url)));
    if (!entry) throw new Error('unexpected fetch: ' + url);
    return {
      ok: entry.status < 400,
      status: entry.status,
      statusText: 'Status',
      text: async () => (entry.body === undefined ? '' : JSON.stringify(entry.body)),
    } as Response;
  });
}

describe('uploadImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('registers the image when presign, PUT and register succeed', async () => {
    vi.stubGlobal('fetch', fetchMock([
      { matches: (u) => u.includes('/presign'), status: 200, body: { uploadUrl: 'http://s3/put', storageKey: 'datasets/ds-1/k', contentType: 'image/png' } },
      { matches: (u) => u === 'http://s3/put', status: 200 },
      { matches: (u) => u.includes('/datasets/ds-1/images'), status: 200, body: { id: 'img-1', status: 'uploaded' } },
    ]));
    const image = await uploadImage('ds-1', PNG);
    expect(image).toEqual({ id: 'img-1', status: 'uploaded' });
  });

  it('throws ApiError instead of registering when the S3 PUT fails', async () => {
    vi.stubGlobal('fetch', fetchMock([
      { matches: (u) => u.includes('/presign'), status: 200, body: { uploadUrl: 'http://s3/put', storageKey: 'datasets/ds-1/k', contentType: 'image/png' } },
      { matches: (u) => u === 'http://s3/put', status: 403 },
    ]));
    await expect(uploadImage('ds-1', PNG)).rejects.toBeInstanceOf(ApiError);
    await expect(uploadImage('ds-1', PNG)).rejects.toMatchObject({ status: 403 });
  });
});
