import { Middleware } from 'koa';
declare type IOptions = {
    uploadsPath: string;
    fields?: number;
    files?: number;
    fieldSize?: number;
    noParseNullUndefined?: boolean;
    parallel?: boolean;
    hashedFilenames?: boolean;
};
export default function multipartParser(opts?: IOptions): Middleware;
export {};
//# sourceMappingURL=multipartParser.d.ts.map