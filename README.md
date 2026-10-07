# AI Vision Annotator

AI-assisted dataset annotation for computer-vision developers.

Upload images, describe what should be annotated, generate structured annotations with vision-capable models, review and correct the results, and export ML-ready datasets.

## MVP

- Batch image upload
- Natural-language annotation instructions
- Vision-model annotation jobs
- Human review and correction
- YOLO / COCO export
- Model-provider abstraction
- Usage and token-cost tracking

## Initial architecture

```text
Images → Job Queue → Vision Provider → Structured Annotations → Review UI → Dataset Export
```

The first inference integration will use OpenRouter so model quality and economics can be validated before self-hosting.
