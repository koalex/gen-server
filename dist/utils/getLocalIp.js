'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const os_1 = __importDefault(require('os'));
let ifaces = os_1.default.networkInterfaces();
function getLocalIp() {
  let ip = undefined;
  Object.keys(ifaces).forEach((ifname) => {
    let alias = 0;
    ifaces[ifname].forEach((iface) => {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        ip = iface.address;
      } else {
        // this interface has only one ipv4 adress
        ip = iface.address;
      }
    });
  });
  return ip;
}
exports.default = getLocalIp;
//# sourceMappingURL=getLocalIp.js.map
