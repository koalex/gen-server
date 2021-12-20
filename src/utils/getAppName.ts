import {readFileSync} from 'fs';
import {join} from 'path';

let pkgName: string = 'gen-server';

try {
  pkgName = JSON.parse(readFileSync(join(process.cwd(), 'package.json')).toString()).name;
} catch (_err) {

}

export default function getAppName(): string {
  return process.env['APP_NAME'] || pkgName;
}
