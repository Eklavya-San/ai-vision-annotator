# AI Vision Annotator

AI-assisted dataset annotation for computer-vision developers.

Upload images, describe what should be annotated in natural language, generate structured annotations with vision-capable models via BullMQ background jobs, review and correct the results in an interactive canvas UI, and export ML-ready datasets in YOLO or COCO formats.

---

## Architecture

```text
Images (S3/MinIO) ──► Job Queue (BullMQ/Redis) ──► Vision Provider (OpenAI/OpenRouter)
                              │                                │
                              ▼                                ▼
                       Review Canvas UI ◄── Structured Annotations (PostgreSQL)
                              │
                              ▼
                   ML Dataset Export (YOLO / COCO ZIP)
```

- **`apps/api`**: NestJS 11 backend with Prisma 6, PostgreSQL, Redis BullMQ queue worker, S3/MinIO presigned storage, and zero-dependency YOLO/COCO ZIP exporter.
- **`apps/web`**: Next.js 15 frontend with Tailwind CSS, interactive bounding box/polygon review canvas, batch image uploader, and project management.
- **`packages/shared`**: Shared TypeScript types, interfaces, and annotation schemas.

---

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js**: `v20.x` or higher (`v22` / `v24` recommended)
- **Corepack**: Enabled for Yarn v4 (Berry)
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and MinIO S3 services

---

## Quick Start (How to Run)

### 1. Enable Corepack & Install Dependencies

From the repository root:

```bash
# Enable Yarn v4 via Corepack
corepack enable

# Install monorepo dependencies
yarn install
```

### 2. Configure Environment Variables

Create your local `.env` file from the example:

```bash
cp .env.example .env
```

If you plan to run automated vision annotation jobs, add your vision API key (e.g. OpenRouter or OpenAI) to `.env`:

```env
OPENAI_COMPATIBLE_API_KEY=your_openrouter_or_openai_api_key_here
OPENAI_COMPATIBLE_BASE_URL=https://openrouter.ai/api/v1
OPENAI_COMPATIBLE_MODEL=qwen/qwen-2.5-vl-72b-instruct
```

### 3. Start Infrastructure Services (Docker)

Spin up PostgreSQL, Redis, and MinIO S3 in the background:

```bash
docker compose up -d
```

### 4. Run Database Migrations

Apply the Prisma migrations to initialize the PostgreSQL schema:

```bash
yarn workspace @vision-annotator/api prisma migrate dev
```

### 5. Start the Development Servers

Run both the API and Web applications concurrently:

```bash
yarn dev
```

You can also run them individually if preferred:
- **API only**: `yarn workspace @vision-annotator/api dev`
- **Web only**: `yarn workspace @vision-annotator/web dev`

---

## Services & Ports

Once running, access the services at:

| Service | URL / Port | Credentials / Notes |
|:---|:---|:---|
| **Web Dashboard & Review UI** | http://localhost:3000 | Next.js frontend |
| **API Server** | http://localhost:4000/api | NestJS backend REST API |
| **MinIO Console** | http://localhost:9001 | User: `minio` \| Password: `minio_dev_password` |
| **MinIO S3 Endpoint** | http://localhost:9000 | Bucket: `vision-annotator` (auto-created) |
| **PostgreSQL** | `localhost:5432` | DB: `vision_annotator` \| User: `vision` \| Pass: `vision_dev` |
| **Redis** | `localhost:6379` | BullMQ queue broker |

---

## Development Scripts

Run these scripts from the repository root:

```bash
# Run unit test suites (Jest)
yarn test

# Typecheck all workspaces (TypeScript --noEmit)
yarn typecheck

# Lint across all workspaces (ESLint)
yarn lint

# Build production bundles (NestJS + Next.js static & dynamic routes)
yarn build
```

---

## Core Workflow Walkthrough

1. **Create a Project**: Navigate to `http://localhost:3000` and click **Create Project**.
2. **Create a Dataset**: Open the project and create a dataset with target labels (e.g., `car, pedestrian, traffic_light`) and custom prompt instructions.
3. **Upload Images**: Drag and drop images into the dataset uploader (files stream directly to S3 via presigned URLs).
4. **Trigger AI Annotation**: Click **Annotate Dataset** to enqueue jobs in BullMQ. The background worker passes images to the vision model and persists normalized bounding boxes and polygons in PostgreSQL.
5. **Review & Correct**: Click any image to open the **Interactive Annotation Canvas**. Drag, resize, or reclassify bounding boxes, and save corrections.
6. **Export**: Export dataset annotations anytime in **YOLO** (normalized coordinates `.txt` + `data.yaml` ZIP) or **COCO** (`annotations.json` ZIP).
