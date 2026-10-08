import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';

@Controller()
export class AnnotationsController {
  constructor(private readonly annotations: AnnotationsService) {}

  @Get('images/:imageId/annotations')
  listForImage(@Param('imageId') imageId: string) {
    return this.annotations.forImage(imageId);
  }

  @Put('annotations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnotationDto) {
    return this.annotations.update(id, dto);
  }

  @Delete('annotations/:id')
  remove(@Param('id') id: string) {
    return this.annotations.remove(id);
  }
}
