import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ExportService, ExportFormat } from './export.service';

/** Minimal structural typing of the platform response we touch (avoids a
 * hard dependency on @types/express for this narrow surface). The Nest
 * platform response always satisfies this — `.setHeader` is the
 * canonical Node/Express method. */
interface HttpResponseLike {
  setHeader(name: string, value: string): void;
}

@Controller('datasets')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * GET /api/datasets/:id/export?format=yolo   -> ZIP archive (application/zip)
   * GET /api/datasets/:id/export?format=coco   -> COCO JSON   (application/json)
   *
   * Content headers are chosen per format via `@Res({ passthrough: true })`
   * so the response body flows through Nest's normal serialization pipeline
   * while we still control the transfer content type for the ZIP payload.
   */
  @Get(':id/export')
  async export(
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: HttpResponseLike,
  ) {
    const parsed = parseFormat(format);

    if (parsed === 'yolo') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="dataset-export.zip"');
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="coco.json"');
    }
    res.setHeader('Cache-Control', 'no-store');

    return this.exportService.export(id, parsed);
  }
}

function parseFormat(format?: string): ExportFormat {
  // Default to `yolo` when omitted or empty; validate the union strictly.
  if (format === undefined || format === '') return 'yolo';
  if (format === 'yolo') return 'yolo';
  if (format === 'coco') return 'coco';
  throw new BadRequestException(
    `Unsupported export format "${format}". Use "yolo" or "coco".`,
  );
}
