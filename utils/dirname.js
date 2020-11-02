import { dirname } from 'path';
import { fileURLToPath } from 'url';

export default function esDirname(importMeta) {
  return dirname(fileURLToPath(importMeta.url));
}
