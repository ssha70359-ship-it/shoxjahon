import 'react';

declare module 'react' {
  // CSS o'zgaruvchilarini style={{ '--size': ... }} ko'rinishida berish uchun
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
