import { buildZip, crc32, ZipEntry } from './zip-writer';

describe('crc32', () => {
  it('matches the IEEE reference value', () => {
    expect(crc32(Buffer.from('123456789', 'utf8'))).toBe(0xcbf43926);
  });

  it('returns 0 for empty input', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe('buildZip', () => {
  const FIXED = new Date(2020, 0, 1, 0, 0, 0);

  function parseZip(buf: Buffer): {
    names: string[];
    files: { name: string; data: Buffer }[];
  } {
    // A compact, spec-faithful reader to validate OUR writer (stored entries).
    // Find the EOCD (last 22+ bytes), then the central directory.
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    expect(eocd).toBeGreaterThanOrEqual(0);

    const cdOffset = buf.readUInt32LE(eocd + 16);
    const count = buf.readUInt16LE(eocd + 10);

    const files: { name: string; data: Buffer }[] = [];
    let p = cdOffset;
    for (let n = 0; n < count; n++) {
      expect(buf.readUInt32LE(p)).toBe(0x02014b50);
      const nameLen = buf.readUInt16LE(p + 28);
      const extraLen = buf.readUInt16LE(p + 30);
      const commentLen = buf.readUInt16LE(p + 32);
      const localOffset = buf.readUInt32LE(p + 42);
      const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');

      // jump to the local header
      expect(buf.readUInt32LE(localOffset)).toBe(0x04034b50);
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const compSize = buf.readUInt32LE(localOffset + 18);
      const compCrc = buf.readUInt32LE(localOffset + 14);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(dataStart, dataStart + compSize);
      // stored: compSize == uncompressed; verify our own crc
      expect(crc32(data)).toBe(compCrc);
      files.push({ name, data });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return { names: files.map((f) => f.name), files };
  }

  it('writes a valid archive that a reader can parse back', () => {
    const entries: ZipEntry[] = [
      { name: 'labels/photo.txt', data: Buffer.from('1 0.5 0.5 0.2 0.2\n', 'utf8') },
      { name: 'data.yaml', data: Buffer.from('nc: 1\nnames:\n  0: cat\n', 'utf8') },
    ];

    const buf = buildZip(entries, FIXED);

    // EOCD present and count correct
    const eocd = buf.length - 22;
    expect(buf.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(buf.readUInt16LE(eocd + 10)).toBe(2);

    const { names, files } = parseZip(buf);
    expect(names).toEqual(['labels/photo.txt', 'data.yaml']);
    expect(files[0].data.toString()).toBe('1 0.5 0.5 0.2 0.2\n');
    expect(files[1].data.toString()).toBe('nc: 1\nnames:\n  0: cat\n');
  });

  it('handles an empty archive', () => {
    const buf = buildZip([], FIXED);
    expect(buf.readUInt32LE(buf.length - 22)).toBe(0x06054b50);
    expect(buf.readUInt16LE(buf.length - 12)).toBe(0); // zero entries
  });
});
