'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const getAppName_1 = __importDefault(require('../utils/getAppName'));
const debug_1 = __importDefault(require('debug'));
exports.default = (0, debug_1.default)((0, getAppName_1.default)());
//# sourceMappingURL=debug.js.map
