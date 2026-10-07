import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
  S3_ENDPOINT: Joi.string().uri().required(),
  S3_REGION: Joi.string().default('us-east-1'),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_BUCKET: Joi.string().min(1).required(),
  OPENAI_COMPATIBLE_API_KEY: Joi.string().allow('').default(''),
  OPENAI_COMPATIBLE_BASE_URL: Joi.string().uri().default('https://openrouter.ai/api/v1'),
  OPENAI_COMPATIBLE_MODEL: Joi.string().allow('').default(''),
}).unknown(true);
