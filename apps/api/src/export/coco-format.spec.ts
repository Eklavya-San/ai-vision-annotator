import { buildCoco } from './coco-format';

describe('buildCoco', () => {
  const images = [
    { id: 'img-1', width: 100, height: 100, imageName: 'photo' },
    { id: 'img-2', width: 200, height: 150, imageName: 'shot' },
  ];

  it('assigns 1-based sequential image ids', () => {
    const doc = buildCoco(images, [], 'ds');
    expect(doc.images.map((i) => i.id)).toEqual([1, 2]);
    expect(doc.images[0]).toMatchObject({
      id: 1,
      file_name: 'photo',
      width: 100,
      height: 100,
    });
  });

  it('maps bbox {x,y,width,height} to COCO [x,y,w,h] and assigns category ids', () => {
    const annotations = [
      {
        id: 'a1',
        imageId: 'img-1',
        label: 'cat',
        confidence: 0.9,
        bbox: { x: 10, y: 20, width: 30, height: 40 },
        polygon: null,
      },
    ];
    const doc = buildCoco(images, annotations, 'ds');
    expect(doc.annotations).toHaveLength(1);
    const a = doc.annotations[0] as {
      id: number;
      image_id: number;
      category_id: number;
      bbox: number[];
      area: number;
      score: number;
    };
    expect(a.id).toBe(1);
    expect(a.image_id).toBe(1);
    expect(a.category_id).toBe(1);
    expect(a.bbox).toEqual([10, 20, 30, 40]);
    expect(a.area).toBe(1200);
    expect(a.score).toBe(0.9);
    expect(doc.categories).toEqual([{ id: 1, name: 'cat', supercategory: '' }]);
  });

  it('flattens polygon into segmentation and sorts categories alphabetically', () => {
    const annotations = [
      {
        id: 'a1',
        imageId: 'img-2',
        label: 'zeta',
        confidence: null,
        bbox: null,
        polygon: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 5, y: 5 },
        ],
      },
      {
        id: 'a2',
        imageId: 'img-2',
        label: 'alpha',
        confidence: 0.5,
        bbox: { x: 1, y: 1, width: 2, height: 2 },
        polygon: null,
      },
    ];
    const doc = buildCoco(images, annotations, 'ds');
    // categories sorted alphabetically: alpha=1, zeta=2
    expect(
      doc.categories.map((c) => c.name),
    ).toEqual(['alpha', 'zeta']);

    const zeta = (doc.annotations as Record<string, unknown>[]).find(
      (x) => (x.category_id as number) === 2,
    );
    expect(zeta).toBeTruthy();
    // zeta has polygon -> segmentation = [x,y,x,y,x,y], bbox is zeroed
    expect(zeta!.segmentation).toEqual([0, 0, 5, 0, 5, 5]);
    expect(zeta!.bbox).toEqual([0, 0, 0, 0]);

    const alpha = (doc.annotations as Record<string, unknown>[]).find(
      (x) => (x.category_id as number) === 1,
    );
    expect(alpha!.bbox).toEqual([1, 1, 2, 2]);
    expect(alpha!.segmentation).toEqual([]);
  });

  it('drops annotations with no bbox and no polygon', () => {
    const annotations = [
      {
        id: 'a1',
        imageId: 'img-1',
        label: 'cat',
        confidence: 0.3,
        bbox: null,
        polygon: null,
      },
    ];
    const doc = buildCoco(images, annotations, 'ds');
    expect(doc.annotations).toHaveLength(0);
    // but the label still yields a category
    expect(doc.categories.map((c) => c.name)).toEqual(['cat']);
  });

  it('drops annotations referencing unknown images', () => {
    const annotations = [
      {
        id: 'a1',
        imageId: 'missing',
        label: 'cat',
        confidence: null,
        bbox: { x: 0, y: 0, width: 1, height: 1 },
        polygon: null,
      },
    ];
    const doc = buildCoco(images, annotations, 'ds');
    expect(doc.annotations).toHaveLength(0);
  });
});
