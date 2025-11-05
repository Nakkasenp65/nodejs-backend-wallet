/**
 * Type definitions for Express extended with Multer
 */

import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

export {};
