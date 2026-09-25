// Chiziqli belgilar to'plami (24×24, stroke).

const PATHS = {
  slice: (
    <>
      <path d="M12 3 3.5 19.5c5.3 2.3 11.7 2.3 17 0z" />
      <path d="M5.2 16.2c4.4 1.6 9.2 1.6 13.6 0" />
      <circle cx="11" cy="10.5" r="1.1" />
      <circle cx="13.4" cy="14.2" r="1.1" />
      <circle cx="9.4" cy="14.6" r=".9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4" />
      <path d="M16 4.8a3.3 3.3 0 0 1 0 6.4" />
      <path d="M17.6 14.8c1.8.7 3 2.5 3.4 5.2" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1-3.8 4-6 7.5-6s6.5 2.2 7.5 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="M15 5 8 12l7 7" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  phone: (
    <path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.6 1.6 0 0 1-1.7 1.6A16 16 0 0 1 3.4 5.7 1.6 1.6 0 0 1 5 4z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  flame: (
    <path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.9 3.3-5.7 3.8-9.8 2.3 1.2 3.7 3.4 3.8 5.6.9-.8 1.5-2 1.6-3.3 2 1.6 3.8 4.2 3.8 7.5 0 3.6-2.5 6.2-6.5 6.2z" />
  ),
  share: (
    <>
      <path d="M12 15V3.5" />
      <path d="m7.5 8 4.5-4.5L16.5 8" />
      <path d="M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="9" cy="9" r="1.1" />
      <circle cx="15" cy="9" r="1.1" />
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="9" cy="15" r="1.1" />
      <circle cx="15" cy="15" r="1.1" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-1.3-1-1.6-1-2.7 0-1 .8-1.7 1.8-1.7h2.2A4.2 4.2 0 0 0 21 10.6C21 6.4 17 3 12 3z" />
      <circle cx="7.6" cy="11" r="1.2" />
      <circle cx="10.5" cy="7.2" r="1.2" />
      <circle cx="15.2" cy="7.6" r="1.2" />
    </>
  ),
  half: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none" opacity=".35" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M10 11v5.5M14 11v5.5" />
      <path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12" />
      <path d="M9.5 7V4.8h5V7" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  scooter: (
    <>
      <circle cx="6" cy="17.5" r="2.5" />
      <circle cx="18" cy="17.5" r="2.5" />
      <path d="M8.5 17.5H14l2.5-7H19" />
      <path d="M14 17.5 11 9H7.5" />
      <path d="M16.5 10.5 15 5h-2" />
    </>
  ),
  store: (
    <>
      <path d="M4 10v10h16V10" />
      <path d="M3 10l1.8-5.5h14.4L21 10a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="M3 10h18M7 14.5h4" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.6" />
      <path d="M3 9h18M12 9v11" />
      <path d="M12 9c-1.5-3.5-5.5-4.5-5.5-2 0 1.6 2.5 2 5.5 2zm0 0c1.5-3.5 5.5-4.5 5.5-2 0 1.6-2.5 2-5.5 2z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z" />
    </>
  ),
  phoneScreen: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5" />
      <path d="M20 4.5v5h-5" />
      <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5" />
      <path d="M4 19.5v-5h5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
};

export function Icon({ name, size = 22, strokeWidth = 1.9, className = '', title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
