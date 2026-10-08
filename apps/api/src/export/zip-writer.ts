/**
 * Dependency-free ZIP (PKZIP) writer.
 *
 * Files are stored uncompressed (method 0), which keeps the writer trivial,
 * deterministic, and free of any archive dependency (none exist in the tree).
 * Output is a valid single-disk archive that `unzip`/`bsdtar`/Python `zipfile`
 * all read.
 */

export interface ZipEntry {
  name: string;
  data: Buffer;
}

interface CrcFn {
  (data: Buffer): number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** Standard (IEEE/reflected) CRC-32 — crc32("123456789") === 0xcbf43926. */
export const crc32: CrcFn = (data: Buffer): number => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

function toDosTime(d: Date): number {
  return (
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    ((d.getSeconds() >> 1) & 0x1f)
  );
}

function toDosDate(d: Date): number {
  const year = d.getFullYear();
  return ((((year - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f));
}

/**
 * Build a ZIP archive from a set of entries (stored, no compression).
 * `timestamp` is injectable for deterministic output in tests.
 */
export function buildZip(entries: ZipEntry[], timestamp: Date = new Date()): Buffer {
  const central: Buffer[] = [];
  const local: Buffer[] = [];
  let offset = 0;

  const time = toDosTime(timestamp);
  const date = toDosDate(timestamp);

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const length = entry.data.length;
    const checksum = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(0x0014, 4); // version needed (2.0)
    localHeader.writeUInt16LE(0x0000, 6); // flags
    localHeader.writeUInt16LE(0x0000, 8); // method: stored
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(length, 18); // compressed size
    localHeader.writeUInt32LE(length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    local.push(localHeader, nameBuf, entry.data);

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // central dir signature
    cdHeader.writeUInt16LE(0x031e, 4); // version made by (unix)
    cdHeader.writeUInt16LE(0x0014, 6); // version needed
    cdHeader.writeUInt16LE(0x0000, 8); // flags
    cdHeader.writeUInt16LE(0x0000, 10); // method
    cdHeader.writeUInt16LE(time, 12);
    cdHeader.writeUInt16LE(date, 14);
    cdHeader.writeUInt32LE(checksum, 16);
    cdHeader.writeUInt32LE(length, 20);
    cdHeader.writeUInt32LE(length, 24);
    cdHeader.writeUInt16LE(nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30); // extra length
    cdHeader.writeUInt16LE(0, 32); // comment length
    cdHeader.writeUInt16LE(0, 34); // disk start
    cdHeader.writeUInt16LE(0, 36); // internal attrs
    cdHeader.writeUInt32LE(0, 38); // external attrs
    cdHeader.writeUInt32LE(offset, 42); // local header offset
    central.push(cdHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + length;
  }

  const centralBuffer = Buffer.concat(central);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // EOCD signature
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // disk with central dir
  end.writeUInt16LE(entries.length, 8); // entries on disk
  end.writeUInt16LE(entries.length, 10); // total entries
  end.writeUInt32LE(centralBuffer.length, 12); // central dir size
  end.writeUInt32LE(offset, 16); // central dir offset
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...local, centralBuffer, end]);
}
