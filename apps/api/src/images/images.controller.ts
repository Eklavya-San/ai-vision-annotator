import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ImagesService } from './images.service';
import { PresignUploadDto, RegisterImageDto } from './dto/register-image.dto';

@Controller('datasets/:datasetId/images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Post('presign')
  presign(@Param('datasetId') datasetId: string, @Body() dto: PresignUploadDto) {
    return this.images.createPresignedUpload(datasetId, dto);
  }

  @Post()
  register(@Param('datasetId') datasetId: string, @Body() dto: RegisterImageDto) {
    return this.images.registerImage(datasetId, dto);
  }

  @Get()
  list(@Param('datasetId') datasetId: string) {
    return this.images.listImages(datasetId);
  }
}
