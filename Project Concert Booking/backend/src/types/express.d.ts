import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware after the JWT is verified. */
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
