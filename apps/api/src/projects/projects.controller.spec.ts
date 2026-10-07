import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Test', description: null, createdAt: new Date(), updatedAt: new Date() }),
      findAll: jest.fn().mockResolvedValue([{ id: 'proj-1', name: 'Test', _count: { datasets: 0 } }]),
      findOne: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Test', datasets: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockService }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
  });

  it('creates a project', async () => {
    const result = await controller.create({ name: 'Test' });
    expect(result).toHaveProperty('id', 'proj-1');
    expect(service.create).toHaveBeenCalledWith('Test', undefined);
  });

  it('lists all projects', async () => {
    const list = await controller.findAll();
    expect(list).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('gets a single project by id', async () => {
    const proj = await controller.findOne('proj-1');
    expect(proj.id).toBe('proj-1');
    expect(service.findOne).toHaveBeenCalledWith('proj-1');
  });
});
