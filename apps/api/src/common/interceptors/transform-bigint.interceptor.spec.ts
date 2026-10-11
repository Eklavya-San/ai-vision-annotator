import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
  TransformBigIntInterceptor,
  serializeBigInt,
} from './transform-bigint.interceptor';

describe('TransformBigIntInterceptor', () => {
  let interceptor: TransformBigIntInterceptor;

  beforeEach(() => {
    interceptor = new TransformBigIntInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('serializeBigInt', () => {
    it('should return null and undefined as is', () => {
      expect(serializeBigInt(null)).toBeNull();
      expect(serializeBigInt(undefined)).toBeUndefined();
    });

    it('should convert top-level BigInt to string', () => {
      expect(serializeBigInt(BigInt('1234567890123456789'))).toBe(
        '1234567890123456789',
      );
    });

    it('should preserve primitive types', () => {
      expect(serializeBigInt(42)).toBe(42);
      expect(serializeBigInt('hello')).toBe('hello');
      expect(serializeBigInt(true)).toBe(true);
      expect(serializeBigInt(false)).toBe(false);
    });

    it('should preserve Date instances', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      expect(serializeBigInt(date)).toBe(date);
    });

    it('should pass Buffer and Uint8Array through untouched (binary responses)', () => {
      const buf = Buffer.from([80, 75, 3, 4]);
      expect(serializeBigInt(buf)).toBe(buf);
      const bytes = new Uint8Array([1, 2, 3]);
      expect(serializeBigInt(bytes)).toBe(bytes);
    });

    it('should recursively serialize BigInt in objects', () => {
      const input = {
        id: 'img_123',
        name: 'test.jpg',
        sizeBytes: BigInt('9007199254740993'),
        metadata: {
          width: 1920,
          height: 1080,
          rawBytes: BigInt(123456),
        },
      };

      const result = serializeBigInt(input);
      expect(result).toEqual({
        id: 'img_123',
        name: 'test.jpg',
        sizeBytes: '9007199254740993',
        metadata: {
          width: 1920,
          height: 1080,
          rawBytes: '123456',
        },
      });
    });

    it('should recursively serialize BigInt in arrays', () => {
      const input = [
        BigInt(1),
        { size: BigInt(200) },
        'regular-string',
        [BigInt(3), BigInt(4)],
      ];

      const result = serializeBigInt(input);
      expect(result).toEqual([
        '1',
        { size: '200' },
        'regular-string',
        ['3', '4'],
      ]);
    });
  });

  describe('intercept', () => {
    it('should transform BigInt values in CallHandler response stream', async () => {
      const mockExecutionContext = {} as ExecutionContext;
      const responseData = {
        id: 'image-1',
        sizeBytes: BigInt(1048576),
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        nested: {
          fileSize: BigInt(2097152),
        },
      };

      const mockCallHandler: CallHandler = {
        handle: () => of(responseData),
      };

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      const transformed = await lastValueFrom(result$);

      expect(transformed).toEqual({
        id: 'image-1',
        sizeBytes: '1048576',
        createdAt: responseData.createdAt,
        nested: {
          fileSize: '2097152',
        },
      });
    });
  });
});
