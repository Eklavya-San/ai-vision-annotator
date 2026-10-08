import { bboxToYolo, clamp01, formatYoloLine, yoloFileForImage } from './yolo-format';

describe('clamp01', () => {
  it('clamps below and above range', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.37)).toBe(0.37);
  });
});

describe('bboxToYolo', () => {
  it('normalizes center coordinates and dimensions', () => {
    // bbox at (0,0) 50x50 on a 100x200 image
    const r = bboxToYolo({ x: 0, y: 0, width: 50, height: 50 }, 100, 200);
    expect(r.cx).toBeCloseTo(0.25, 10); // (0+25)/100
    expect(r.cy).toBeCloseTo(0.125, 10); // (0+25)/200
    expect(r.yw).toBeCloseTo(0.5, 10); // 50/100
    expect(r.yh).toBeCloseTo(0.25, 10); // 50/200
  });

  it('handles an offset bbox', () => {
    // bbox at (25,30) 50x40 on a 200x100 image
    const r = bboxToYolo({ x: 25, y: 30, width: 50, height: 40 }, 200, 100);
    expect(r.cx).toBeCloseTo(0.25, 10); // (25+50/2)/200 = 50/200
    expect(r.cy).toBeCloseTo(0.5, 10); // (30+40/2)/100 = 50/100
    expect(r.yw).toBeCloseTo(0.25, 10);
    expect(r.yh).toBeCloseTo(0.4, 10);
  });

  it('clips out-of-image boxes to [0,1]', () => {
    // bbox extends past the right/bottom edge
    const r = bboxToYolo({ x: 200, y: 200, width: 50, height: 50 }, 200, 200);
    expect(r.cx).toBe(1);
    expect(r.cy).toBe(1);
    expect(r.yw).toBe(0.25);
    expect(r.yh).toBe(0.25);
  });

  it('throws on non-positive dimensions', () => {
    expect(() => bboxToYolo({ x: 1, y: 1, width: 1, height: 1 }, 0, 100)).toThrow();
    expect(() => bboxToYolo({ x: 1, y: 1, width: 1, height: 1 }, 100, -5)).toThrow();
  });
});

describe('formatYoloLine', () => {
  it('produces "<id> <cx> <cy> <w> <h>"', () => {
    const line = formatYoloLine(2, { x: 0, y: 0, width: 100, height: 100 }, 200, 200);
    // cx=(0+50)/200=0.25, cy=0.25, w=0.5, h=0.5
    expect(line).toBe('2 0.25 0.25 0.5 0.5');
  });
});

describe('yoloFileForImage', () => {
  const classIndex = new Map([['cat', 0], ['dog', 1]]);

  it('renders one line per annotation and a trailing newline', () => {
    const out = yoloFileForImage({
      annotations: [
        { label: 'cat', bbox: { x: 10, y: 20, width: 40, height: 60 } },
        { label: 'dog', bbox: { x: 0, y: 0, width: 100, height: 100 } },
      ],
      width: 100,
      height: 100,
      classIndex,
    });
    const lines = out.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(2);
    // cat: cx=(10+20)/100=0.3, cy=(20+30)/100=0.5, w=0.4, h=0.6
    expect(lines[0]).toBe('0 0.3 0.5 0.4 0.6');
    // dog: cx=0.5 cy=0.5 w=1 h=1
    expect(lines[1]).toBe('1 0.5 0.5 1 1');
    expect(out).toMatch(/\n$/);
  });

  it('returns empty string when no annotations', () => {
    expect(
      yoloFileForImage({ annotations: [], width: 10, height: 10, classIndex }),
    ).toBe('');
  });
});
