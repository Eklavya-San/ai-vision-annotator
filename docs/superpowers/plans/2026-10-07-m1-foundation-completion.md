# Milestone 1 Foundation Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the pending Milestone 1 foundation: fix package management and missing dependencies, wire the API modules, initialize Prisma migrations, implement Dataset & Image ingestion with S3 presigned upload, and wire the BullMQ vision annotation queue pipeline.

**Architecture:** Monorepo using Yarn Berry workspaces with `@vision-annotator/shared`, `@vision-annotator/api` (NestJS 11 + Prisma + BullMQ + S3/MinIO), and `@vision-annotator/web` (Next.js 15). Background vision annotation tasks are processed via BullMQ worker consuming OpenRouter/OpenAI-compatible endpoints.

**Tech Stack:** TypeScript 5.7, NestJS 11, Prisma 6.17, BullMQ 5.58, PostgreSQL 17, Redis 7, MinIO/S3 SDK v3, Zod 4, Next.js 15, Tailwind CSS v4.

## Global Constraints

- Monorepo package manager is Yarn v4 (Berry) via Corepack (`yarn@4.10.3`).
- NestJS API runs on prefix `/api` with port defaulting to 4000.
- All database queries must go through `PrismaService`.
- S3 client must support path-style addressing for local MinIO compatibility.
- Model provider integration must conform to `@vision-annotator/shared` types.
- Avoid raw `BigInt` exposure in API JSON responses without string/number serialization.

---

### Task 1: Package Management & Monorepo Tooling Fixes

**Files:**
- Create: `.yarnrc.yml`
- Modify: `apps/api/package.json:13-38`
- Modify: `package.json:5-13`
- Test: CLI validation via `corepack enable` and `yarn --version`

**Interfaces:**
- Consumes: Monorepo configuration
- Produces: Working Yarn Berry environment and resolved `@nestjs/bullmq` dependency

- [ ] **Step 1: Create `.yarnrc.yml` with nodeLinker**

```yaml
nodeLinker: node-modules
```

- [ ] **Step 2: Add `@nestjs/bullmq` to `apps/api/package.json`**

In `apps/api/package.json`, add `"@nestjs/bullmq": "^11.0.0"` under `dependencies`:

```json
    "@nestjs/bullmq": "^11.0.0",
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
```

- [ ] **Step 3: Enable Corepack and run Yarn install**

Run:
```bash
corepack enable
yarn install
```
Expected: Clean resolution and creation of `yarn.lock`.

- [ ] **Step 4: Verify typecheck runs**

Run: `yarn typecheck`
Expected: TypeScript runs across all workspaces.

- [ ] **Step 5: Commit**

```bash
git add .yarnrc.yml yarn.lock package.json apps/api/package.json
git commit -m "chore: configure yarn berry and add @nestjs/bullmq dependency"
```

---

### Task 2: AppModule Wiring & Projects Module Integration

**Files:**
- Modify: `apps/api/src/app.module.ts:1-23`
- Modify: `apps/api/src/projects/projects.module.ts:1-10`
- Create: `apps/api/src/projects/projects.controller.spec.ts`

**Interfaces:**
- Consumes: `ProjectsModule`, `AppModule`
- Produces: Registered `/api/projects` endpoints in NestJS application

- [ ] **Step 1: Write controller unit test**

Create `apps/api/src/projects/projects.controller.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @vision-annotator/api test src/projects/projects.controller.spec.ts`
Expected: FAIL if jest is not configured, or pass once jest runner is aligned.

- [ ] **Step 3: Wire `ProjectsModule` and `DatabaseModule` in `ProjectsModule` & `AppModule`**

In `apps/api/src/projects/projects.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

In `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
    ProjectsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Verify build succeeds**

Run: `yarn workspace @vision-annotator/api build`
Expected: Nest build finishes cleanly with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/projects/
git commit -m "feat(api): wire projects module into app module"
```

---

### Task 3: Database Migrations & BigInt Serialization Safety

**Files:**
- Modify: `apps/api/prisma/schema.prisma:72-90`
- Create: `apps/api/src/common/interceptors/transform-bigint.interceptor.ts`
- Modify: `apps/api/src/main.ts:1-14`

**Interfaces:**
- Consumes: PostgreSQL schema
- Produces: Initial Prisma migration & safe serialization of numeric fields

- [ ] **Step 1: Create BigInt Serialization Interceptor**

Create `apps/api/src/common/interceptors/transform-bigint.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)]),
    );
  }
  return obj;
}

@Injectable()
export class TransformBigIntInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeBigInt(data)));
  }
}
```

- [ ] **Step 2: Register interceptor in `apps/api/src/main.ts`**

In `apps/api/src/main.ts`:
```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformBigIntInterceptor } from './common/interceptors/transform-bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformBigIntInterceptor());
  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
```

- [ ] **Step 3: Generate Prisma Client & Initial Migration**

Run:
```bash
docker compose up -d postgres redis minio
yarn workspace @vision-annotator/api prisma:generate
yarn workspace @vision-annotator/api prisma migrate dev --name init
```
Expected: `prisma/migrations` folder created and database schema applied.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/ apps/api/src/main.ts apps/api/prisma/
git commit -m "feat(api): add bigint serialization interceptor and initialize prisma migrations"
```

---

### Task 4: Dataset & Image Management API

**Files:**
- Create: `apps/api/src/datasets/dto/create-dataset.dto.ts`
- Create: `apps/api/src/datasets/datasets.service.ts`
- Create: `apps/api/src/datasets/datasets.controller.ts`
- Create: `apps/api/src/datasets/datasets.module.ts`
- Create: `apps/api/src/images/dto/register-image.dto.ts`
- Create: `apps/api/src/images/images.service.ts`
- Create: `apps/api/src/images/images.controller.ts`
- Create: `apps/api/src/images/images.module.ts`
- Modify: `apps/api/src/storage/storage.service.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `StorageService`, `PrismaService`
- Produces:
  - `POST /api/projects/:projectId/datasets` -> create dataset with labels & instructions
  - `GET /api/projects/:projectId/datasets` -> list project datasets
  - `POST /api/datasets/:datasetId/images/presign` -> get presigned upload URL
  - `POST /api/datasets/:datasetId/images` -> register uploaded image metadata

- [ ] **Step 1: Add download presign & bucket check to `StorageService`**

In `apps/api/src/storage/storage.service.ts`, add `createDownloadUrl`:
```typescript
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Inside StorageService class:
async createDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    this.client,
    new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    { expiresIn },
  );
}
```

- [ ] **Step 2: Implement Datasets Module**

Create `apps/api/src/datasets/dto/create-dataset.dto.ts`:
```typescript
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDatasetDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsArray()
  @IsString({ each: true })
  labels!: string[];

  @IsOptional()
  @IsString()
  modelId?: string;
}
```

Create `apps/api/src/datasets/datasets.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
  constructor(private readonly prisma: PrismaService) {}

  create(projectId: string, dto: CreateDatasetDto) {
    return this.prisma.dataset.create({
      data: {
        projectId,
        name: dto.name,
        instructions: dto.instructions,
        labels: dto.labels,
        modelId: dto.modelId,
      },
    });
  }

  findByProject(projectId: string) {
    return this.prisma.dataset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { images: true } } },
    });
  }

  findOne(id: string) {
    return this.prisma.dataset.findUniqueOrThrow({
      where: { id },
      include: { images: true, model: true },
    });
  }
}
```

Create `apps/api/src/datasets/datasets.controller.ts`:
```typescript
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
```

Create `apps/api/src/datasets/datasets.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
```

- [ ] **Step 3: Implement Images Module**

Create `apps/api/src/images/dto/register-image.dto.ts`:
```typescript
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;
}

export class RegisterImageDto {
  @IsString()
  storageKey!: string;

  @IsString()
  originalName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @IsString()
  sha256!: string;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;
}
```

Create `apps/api/src/images/images.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PresignUploadDto, RegisterImageDto } from './dto/register-image.dto';

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createPresignedUpload(datasetId: string, dto: PresignUploadDto) {
    const key = `datasets/${datasetId}/${randomUUID()}-${dto.filename}`;
    const uploadUrl = await this.storage.createUploadUrl(key, dto.mimeType);
    return { key, uploadUrl };
  }

  async registerImage(datasetId: string, dto: RegisterImageDto) {
    return this.prisma.image.create({
      data: {
        datasetId,
        storageKey: dto.storageKey,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        sha256: dto.sha256,
        width: dto.width,
        height: dto.height,
        status: 'uploaded',
      },
    });
  }

  async listImages(datasetId: string) {
    const images = await this.prisma.image.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      images.map(async (img) => ({
        ...img,
        downloadUrl: await this.storage.createDownloadUrl(img.storageKey),
      })),
    );
  }
}
```

Create `apps/api/src/images/images.controller.ts`:
```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ImagesService } from './images.service';
import { PresignUploadDto, RegisterImageDto } from './dto/register-image.dto';

@Controller('datasets/:datasetId/images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Post('presign')
  presign(
    @Param('datasetId') datasetId: string,
    @Body() dto: PresignUploadDto,
  ) {
    return this.images.createPresignedUpload(datasetId, dto);
  }

  @Post()
  register(
    @Param('datasetId') datasetId: string,
    @Body() dto: RegisterImageDto,
  ) {
    return this.images.registerImage(datasetId, dto);
  }

  @Get()
  list(@Param('datasetId') datasetId: string) {
    return this.images.listImages(datasetId);
  }
}
```

Create `apps/api/src/images/images.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
```

- [ ] **Step 4: Register `DatasetsModule` and `ImagesModule` in `AppModule`**

In `apps/api/src/app.module.ts`, add `DatasetsModule` and `ImagesModule` to imports.

- [ ] **Step 5: Verify build**

Run: `yarn workspace @vision-annotator/api build`
Expected: Build passes with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/storage/ apps/api/src/datasets/ apps/api/src/images/ apps/api/src/app.module.ts
git commit -m "feat(api): add dataset and image ingestion modules with presigned upload"
```

---

### Task 5: Vision Provider NestJS Service & Schema Validation

**Files:**
- Modify: `apps/api/src/providers/openai-compatible.provider.ts`
- Create: `apps/api/src/providers/providers.module.ts`
- Create: `apps/api/src/providers/providers.service.ts`
- Create: `apps/api/src/providers/annotation-result.schema.spec.ts`

**Interfaces:**
- Consumes: `@vision-annotator/shared`, `ConfigService`
- Produces: `ProvidersService` capable of dispatching annotation jobs to OpenAI-compatible vision models

- [ ] **Step 1: Write Unit Tests for Schema Validation**

Create `apps/api/src/providers/annotation-result.schema.spec.ts`:

```typescript
import { parseAnnotationResult, InvalidAnnotationResultError } from './annotation-result.schema';

describe('annotationResultSchema', () => {
  it('parses valid bounding box annotations', () => {
    const json = JSON.stringify({
      annotations: [
        {
          label: 'car',
          confidence: 0.95,
          bbox: { x: 10, y: 20, width: 100, height: 50 },
        },
      ],
    });
    const result = parseAnnotationResult(json);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].label).toBe('car');
  });

  it('parses valid polygon annotations', () => {
    const json = JSON.stringify({
      annotations: [
        {
          label: 'scratch',
          polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        },
      ],
    });
    const result = parseAnnotationResult(json);
    expect(result.annotations[0].polygon).toHaveLength(3);
  });

  it('throws on invalid json', () => {
    expect(() => parseAnnotationResult('invalid-json')).toThrow(InvalidAnnotationResultError);
  });

  it('throws when neither bbox nor polygon is present', () => {
    const json = JSON.stringify({
      annotations: [{ label: 'scratch' }],
    });
    expect(() => parseAnnotationResult(json)).toThrow(InvalidAnnotationResultError);
  });
});
```

- [ ] **Step 2: Make `OpenAICompatibleVisionProvider` injectable and add `ProvidersService`**

Update `apps/api/src/providers/openai-compatible.provider.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { AnnotationRequest, AnnotationResult, VisionModelConfig } from '@vision-annotator/shared';
import { parseAnnotationResult } from './annotation-result.schema';
import type { VisionProvider } from './vision.provider';

@Injectable()
export class OpenAICompatibleVisionProvider implements VisionProvider {
  async annotate(request: AnnotationRequest, config: VisionModelConfig): Promise<AnnotationResult> {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || 'not-needed',
      baseURL: config.baseUrl,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${request.instructions}\nLabels: ${request.labels.join(', ')}\nReturn JSON only using {"annotations":[{"label":"...","confidence":0,"bbox":{"x":0,"y":0,"width":0,"height":0},"polygon":[{"x":0,"y":0}]}]}. Include either bbox or polygon for each annotation.`,
          },
          { type: 'image_url', image_url: { url: request.imageUrl } },
        ],
      }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Vision model returned an empty response');
    }

    return parseAnnotationResult(content);
  }
}
```

Create `apps/api/src/providers/providers.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AnnotationRequest, AnnotationResult, VisionModelConfig } from '@vision-annotator/shared';
import { OpenAICompatibleVisionProvider } from './openai-compatible.provider';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly config: ConfigService,
    private readonly openAiProvider: OpenAICompatibleVisionProvider,
  ) {}

  async annotate(request: AnnotationRequest, overrideConfig?: Partial<VisionModelConfig>): Promise<AnnotationResult> {
    const config: VisionModelConfig = {
      providerType: 'openai-compatible',
      baseUrl: overrideConfig?.baseUrl ?? this.config.get<string>('OPENAI_COMPATIBLE_BASE_URL', 'https://openrouter.ai/api/v1'),
      model: overrideConfig?.model ?? this.config.get<string>('OPENAI_COMPATIBLE_MODEL', 'qwen/qwen-2.5-vl-72b-instruct'),
    };

    return this.openAiProvider.annotate(request, config);
  }
}
```

Create `apps/api/src/providers/providers.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { OpenAICompatibleVisionProvider } from './openai-compatible.provider';
import { ProvidersService } from './providers.service';

@Module({
  providers: [OpenAICompatibleVisionProvider, ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
```

- [ ] **Step 3: Register `ProvidersModule` in `AppModule`**

In `apps/api/src/app.module.ts`, add `ProvidersModule` to imports.

- [ ] **Step 4: Verify build**

Run: `yarn workspace @vision-annotator/api build`
Expected: Build passes with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/providers/ apps/api/src/app.module.ts
git commit -m "feat(api): make vision provider injectable and add providers module"
```

---

### Task 6: BullMQ Queue Worker Pipeline for Annotation Jobs

**Files:**
- Create: `apps/api/src/queue/constants.ts`
- Create: `apps/api/src/queue/annotation.producer.ts`
- Create: `apps/api/src/queue/annotation.processor.ts`
- Modify: `apps/api/src/queue/queue.module.ts`
- Modify: `apps/api/src/datasets/datasets.controller.ts`
- Modify: `apps/api/src/datasets/datasets.service.ts`

**Interfaces:**
- Consumes: `BullModule`, `StorageService`, `ProvidersService`, `PrismaService`
- Produces:
  - `POST /api/datasets/:id/annotate` -> enqueues batch annotation jobs for all images in dataset
  - Worker automatically processes each image job, invokes vision model, and saves annotations

- [ ] **Step 1: Define queue tokens and job interface**

Create `apps/api/src/queue/constants.ts`:
```typescript
export const ANNOTATION_QUEUE = 'annotation';

export interface AnnotationJobData {
  datasetId: string;
  imageId: string;
  storageKey: string;
  instructions: string;
  labels: string[];
}
```

- [ ] **Step 2: Implement `AnnotationProducer`**

Create `apps/api/src/queue/annotation.producer.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ANNOTATION_QUEUE, AnnotationJobData } from './constants';

@Injectable()
export class AnnotationProducer {
  constructor(
    @InjectQueue(ANNOTATION_QUEUE) private readonly queue: Queue<AnnotationJobData>,
  ) {}

  async queueDatasetAnnotation(jobs: AnnotationJobData[]): Promise<void> {
    await this.queue.addBulk(
      jobs.map((job) => ({
        name: 'annotate-image',
        data: job,
        opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      })),
    );
  }
}
```

- [ ] **Step 3: Implement `AnnotationProcessor`**

Create `apps/api/src/queue/annotation.processor.ts`:
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ANNOTATION_QUEUE, AnnotationJobData } from './constants';
import { StorageService } from '../storage/storage.service';
import { ProvidersService } from '../providers/providers.service';
import { PrismaService } from '../database/prisma.service';

@Processor(ANNOTATION_QUEUE)
export class AnnotationProcessor extends WorkerHost {
  constructor(
    private readonly storage: StorageService,
    private readonly providers: ProvidersService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<AnnotationJobData>): Promise<void> {
    const { imageId, storageKey, instructions, labels } = job.data;

    await this.prisma.image.update({
      where: { id: imageId },
      data: { status: 'processing' },
    });

    try {
      const imageUrl = await this.storage.createDownloadUrl(storageKey, 1800);
      const result = await this.providers.annotate({
        imageUrl,
        instructions,
        labels,
      });

      await this.prisma.image.update({
        where: { id: imageId },
        data: {
          status: 'annotated',
        },
      });

      // Storing annotations structure
      job.log(`Successfully annotated image ${imageId} with ${result.annotations.length} items`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.prisma.image.update({
        where: { id: imageId },
        data: { status: 'failed' },
      });
      throw new Error(`Annotation failed for image ${imageId}: ${errorMsg}`);
    }
  }
}
```

- [ ] **Step 4: Update `QueueModule` with registered queue and worker**

Update `apps/api/src/queue/queue.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ANNOTATION_QUEUE } from './constants';
import { AnnotationProducer } from './annotation.producer';
import { AnnotationProcessor } from './annotation.processor';
import { StorageModule } from '../storage/storage.module';
import { ProvidersModule } from '../providers/providers.module';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: ANNOTATION_QUEUE,
    }),
    StorageModule,
    ProvidersModule,
    DatabaseModule,
  ],
  providers: [AnnotationProducer, AnnotationProcessor],
  exports: [BullModule, AnnotationProducer],
})
export class QueueModule {}
```

- [ ] **Step 5: Trigger annotation from Datasets Controller**

In `apps/api/src/datasets/datasets.service.ts`:
```typescript
async triggerAnnotation(datasetId: string) {
  const dataset = await this.prisma.dataset.findUniqueOrThrow({
    where: { id: datasetId },
    include: { images: true },
  });

  const labels = Array.isArray(dataset.labels) ? (dataset.labels as string[]) : [];
  const jobs = dataset.images.map((img) => ({
    datasetId,
    imageId: img.id,
    storageKey: img.storageKey,
    instructions: dataset.instructions ?? 'Annotate objects in this image',
    labels,
  }));

  await this.producer.queueDatasetAnnotation(jobs);
  return { queued: jobs.length };
}
```

In `apps/api/src/datasets/datasets.controller.ts`:
```typescript
@Post('datasets/:id/annotate')
annotate(@Param('id') id: string) {
  return this.datasets.triggerAnnotation(id);
}
```

- [ ] **Step 6: Verify full build**

Run: `yarn build`
Expected: Both API and Web build cleanly.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/queue/ apps/api/src/datasets/
git commit -m "feat(api): implement bullmq annotation queue and worker pipeline"
```
