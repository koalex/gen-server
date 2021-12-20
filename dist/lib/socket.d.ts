/// <reference types="node" />
import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
export default function Socket(server: HttpServer, { keys, origins, protocol, }: {
    keys: string[];
    origins: string[];
    protocol: string;
}): Server;
//# sourceMappingURL=socket.d.ts.map