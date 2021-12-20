declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: number;
    NODE_ENV?: string;
    UPLOADS_PATH?: string;
  }
}
