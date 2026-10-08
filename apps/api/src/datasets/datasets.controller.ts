import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Controller()
export class DatasetsController {
  constructor(private readonly datasets: DatasetsService) {}

  @Post('projects/:projectId/datasets')
  create(@Param('projectId') projectId: string, @Body() dto: CreateDatasetDto) {
    return this.datasets.create(projectId, dto);
  }

  @Get('projects/:projectId/datasets')
  findByProject(@Param('projectId') projectId: string) {
    return this.datasets.findByProject(projectId);
  }

  @Get('datasets/:id')
  findOne(@Param('id') id: string) {
    return this.datasets.findOne(id);
  }
}
