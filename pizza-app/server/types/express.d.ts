import type { ZodType } from 'zod';

import type { UserDto } from '../../shared/types.js';

declare global {
  namespace Express {
    interface Request {
      /** telegramAuth middleware o'rnatadi */
      user?: UserDto;
      startParam?: string;
      /** validate() middleware natijalari: sxema → tekshirilgan qiymat */
      validated?: Map<ZodType, unknown>;
    }
  }
}

export {};
