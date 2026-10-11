import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAnnotationDto } from './update-annotation.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(UpdateAnnotationDto, body);
  return validate(dto, { whitelist: true });
}

describe('UpdateAnnotationDto', () => {
  it('accepts a well-formed bbox', async () => {
    const errors = await validateBody({ bbox: { x: 1, y: 2, width: 30, height: 40 } });
    expect(errors).toHaveLength(0);
  });

  it('rejects a bbox with negative width', async () => {
    const errors = await validateBody({ bbox: { x: 1, y: 2, width: -5, height: 40 } });
    expect(errors).toHaveLength(1);
  });

  it('rejects a bbox that is not the expected shape', async () => {
    const errors = await validateBody({ bbox: { foo: 'bar' } });
    expect(errors).toHaveLength(1);
  });

  it('rejects polygons with fewer than 3 points', async () => {
    const errors = await validateBody({ polygon: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
    expect(errors).toHaveLength(1);
  });

  it('rejects out-of-range confidence', async () => {
    const errors = await validateBody({ confidence: 1.5 });
    expect(errors).toHaveLength(1);
  });

  it('treats explicit null bbox/polygon as absent (no validation errors)', async () => {
    const errors = await validateBody({ bbox: null, polygon: null });
    expect(errors).toHaveLength(0);
  });
});
