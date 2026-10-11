import {
  InvalidAnnotationResultError,
  parseAnnotationResult,
  sanitizeAnnotations,
} from './annotation-result.schema';

describe('parseAnnotationResult', () => {
  it('parses valid bounding box JSON', () => {
    const content = JSON.stringify({
      annotations: [
        { label: 'cat', confidence: 0.9, bbox: { x: 1, y: 2, width: 10, height: 5 } },
      ],
    });

    const result = parseAnnotationResult(content);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0]).toEqual(expect.objectContaining({ label: 'cat', bbox: { x: 1, y: 2, width: 10, height: 5 } }));
  });

  it('parses valid polygon JSON', () => {
    const content = JSON.stringify({
      annotations: [
        {
          label: 'dog',
          polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        },
      ],
    });

    const result = parseAnnotationResult(content);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].polygon).toHaveLength(4);
  });

  it('rejects invalid JSON strings', () => {
    expect(() => parseAnnotationResult('this is not json {')).toThrow(InvalidAnnotationResultError);
    expect(() => parseAnnotationResult('this is not json {')).toThrow('invalid JSON');
  });

  it('rejects when neither bbox nor polygon is present', () => {
    const content = JSON.stringify({
      annotations: [{ label: 'cat', confidence: 0.5 }],
    });

    expect(() => parseAnnotationResult(content)).toThrow(InvalidAnnotationResultError);
  });

  describe('sanitizeAnnotations', () => {
    const base = {
      annotations: [
        { label: 'car', confidence: 0.9, bbox: { x: 10, y: 10, width: 20, height: 10 } },
        { label: 'alien', confidence: 0.5, bbox: { x: 0, y: 0, width: 5, height: 5 } },
      ],
    };

    it('drops annotations whose label is not allowed', () => {
      const out = sanitizeAnnotations(base, { allowedLabels: ['car', 'person'] });
      expect(out.annotations).toHaveLength(1);
      expect(out.annotations[0].label).toBe('car');
    });

    it('keeps everything when no allowlist is given', () => {
      const out = sanitizeAnnotations(base, {});
      expect(out.annotations).toHaveLength(2);
    });

    it('drops annotations outside the image bounds', () => {
      const out = sanitizeAnnotations(
        {
          annotations: [
            { label: 'car', bbox: { x: 90, y: 10, width: 20, height: 10 } }, // x+w > 100
            { label: 'car', bbox: { x: 10, y: 10, width: 20, height: 10 } },
          ],
        },
        { allowedLabels: ['car'], imageWidth: 100, imageHeight: 100 },
      );
      expect(out.annotations).toHaveLength(1);
    });

    it('keeps annotations when image dimensions are unknown', () => {
      const out = sanitizeAnnotations(base, { allowedLabels: ['car'], imageWidth: null, imageHeight: null });
      expect(out.annotations).toHaveLength(1); // only the label filter applied
    });
  });

  describe('zero-size bboxes', () => {
    it('rejects zero-width bbox at parse time', () => {
      expect(() =>
        parseAnnotationResult('{"annotations":[{"label":"car","bbox":{"x":1,"y":1,"width":0,"height":5}}]}'),
      ).toThrow(InvalidAnnotationResultError);
    });
  });
});
