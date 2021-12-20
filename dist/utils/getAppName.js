'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = require('fs');
const path_1 = require('path');
let pkgName = 'gen-server';
try {
  pkgName = JSON.parse(
    (0, fs_1.readFileSync)(
      (0, path_1.join)(process.cwd(), 'package.json'),
    ).toString(),
  ).name;
} catch (_err) {}
function getAppName() {
  return process.env['APP_NAME'] || pkgName;
}
exports.default = getAppName;
//# sourceMappingURL=getAppName.js.map
