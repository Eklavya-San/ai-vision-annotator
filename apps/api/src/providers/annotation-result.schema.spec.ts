import { InvalidAnnotationResultError, parseAnnotationResult } from './annotation-result.schema';

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
});
