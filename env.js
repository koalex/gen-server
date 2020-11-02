import { resolve } from 'path';
import dotenv from 'dotenv';

const result = dotenv.config({ path: process.env.ENV_PATH || resolve(process.cwd(), '.env') });

if (result.error) {
  throw result.error;
}
