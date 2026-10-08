import type { JSX } from 'react';

export type IconName =
  | 'home' | 'queue' | 'music' | 'monitor' | 'embed' | 'link' | 'users' | 'chart' | 'bot' | 'key'
  | 'plug' | 'webhook' | 'idcard' | 'log' | 'shield' | 'backup' | 'gear' | 'badge' | 'code'
  | 'search' | 'bell' | 'github' | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'menu'
  | 'skip-back' | 'skip-fwd' | 'pause' | 'play' | 'volume' | 'sliders' | 'wave' | 'speaker'
  | 'plus' | 'trash' | 'crown' | 'cpu' | 'ram' | 'disk' | 'network' | 'clock' | 'headset'
  | 'refresh' | 'x' | 'check' | 'alert' | 'logout' | 'download' | 'upload' | 'external' | 'edit'
  | 'server' | 'send' | 'zap' | 'eye' | 'activity' | 'list' | 'globe' | 'lock' | 'more'
  | 'shuffle' | 'help' | 'book' | 'doc' | 'discord' | 'megaphone' | 'disc';

const P = (d: string, key?: number) => <path key={key} d={d} />;

const icons: Record<IconName, JSX.Element> = {
  home: (
    <>
      {P('M3 10.5 12 3l9 7.5')}
      {P('M5 9.5V21h14V9.5')}
      {P('M9.5 21v-6h5v6')}
    </>
  ),
  queue: (
    <>
      {P('M3 6h12')}
      {P('M3 11h9')}
      {P('M3 16h7')}
      <circle cx="17" cy="16" r="3" />
      {P('M20 16V5l2 1')}
    </>
  ),
  music: (
    <>
      {P('M9 18V5l11-2v13')}
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      {P('M9 20h6')}
      {P('M12 16v4')}
    </>
  ),
  embed: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      {P('M3 9h18')}
      {P('M9 9v11')}
    </>
  ),
  link: (
    <>
      {P('M9.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.6l-1.2 1.2')}
      {P('M14.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.6l1.2-1.2')}
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      {P('M3 20a6 6 0 0 1 12 0')}
      {P('M16 4.6a3.5 3.5 0 0 1 0 6.8')}
      {P('M17.5 14.4A6 6 0 0 1 21 20')}
    </>
  ),
  chart: (
    <>
      {P('M4 20V10')}
      {P('M10 20V4')}
      {P('M16 20v-8')}
      {P('M22 20H2')}
    </>
  ),
  bot: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="3" />
      {P('M12 8V4')}
      <circle cx="9.5" cy="13" r="1" />
      <circle cx="14.5" cy="13" r="1" />
      {P('M2 12v3')}
      {P('M22 12v3')}
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      {P('M11 12 20 3')}
      {P('M16 7l2.5 2.5')}
      {P('M13.5 9.5 16 12')}
    </>
  ),
  plug: (
    <>
      {P('M9 7V3')}
      {P('M15 7V3')}
      {P('M6 7h12v4a6 6 0 0 1-12 0z')}
      {P('M12 17v4')}
    </>
  ),
  webhook: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="16" r="3.5" />
      <circle cx="7" cy="17" r="3.5" />
      {P('M12 9.5 15.5 14')}
      {P('M10.4 16.8h3.2')}
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      {P('M5.5 16a4 4 0 0 1 6 0')}
      {P('M14 9.5h5')}
      {P('M14 13h5')}
    </>
  ),
  log: (
    <>
      {P('M6 2h9l4 4v16H6z')}
      {P('M15 2v4h4')}
      {P('M9 12h7')}
      {P('M9 16h7')}
    </>
  ),
  shield: (
    <>
      {P('M12 2 20 5v6c0 5.5-3.5 9.5-8 11-4.5-1.5-8-5.5-8-11V5z')}
      {P('M8.8 12l2.3 2.3 4.2-4.2')}
    </>
  ),
  backup: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      {P('M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6')}
      {P('M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6')}
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      {P('M12 2.5v3')}
      {P('M12 18.5v3')}
      {P('M2.5 12h3')}
      {P('M18.5 12h3')}
      {P('M5.3 5.3l2.1 2.1')}
      {P('M16.6 16.6l2.1 2.1')}
      {P('M18.7 5.3l-2.1 2.1')}
      {P('M7.4 16.6l-2.1 2.1')}
    </>
  ),
  badge: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      {P('M9.5 13.5 7.5 21l4.5-2.5L16.5 21l-2-7.5')}
      {P('M10 9l1.5 1.5L14.5 7.5')}
    </>
  ),
  code: (
    <>
      {P('M8.5 7 4 12l4.5 5')}
      {P('M15.5 7 20 12l-4.5 5')}
      {P('M13 5l-2.5 14')}
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      {P('M20.5 20.5 16 16')}
    </>
  ),
  bell: (
    <>
      {P('M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6')}
      {P('M10 19a2 2 0 0 0 4 0')}
    </>
  ),
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
    />
  ),
  'chevron-down': P('M6 9l6 6 6-6'),
  'chevron-right': P('M9 6l6 6-6 6'),
  'chevron-left': P('M15 6l-6 6 6 6'),
  menu: (
    <>
      {P('M4 6h16')}
      {P('M4 12h16')}
      {P('M4 18h16')}
    </>
  ),
  'skip-back': (
    <>
      {P('M18 5v14L8 12z')}
      {P('M6 5v14')}
    </>
  ),
  'skip-fwd': (
    <>
      {P('M6 5v14l10-7z')}
      {P('M18 5v14')}
    </>
  ),
  pause: (
    <>
      {P('M9 5v14')}
      {P('M15 5v14')}
    </>
  ),
  play: <path d="M7 4.8v14.4c0 .6.7 1 1.2.7l11-7.2c.5-.3.5-1 0-1.4l-11-7.2c-.5-.3-1.2 0-1.2.7Z" fill="currentColor" stroke="none" />,
  volume: (
    <>
      {P('M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z')}
      {P('M15.5 9a4.2 4.2 0 0 1 0 6')}
      {P('M18 6.5a8 8 0 0 1 0 11')}
    </>
  ),
  sliders: (
    <>
      {P('M5 4v6')}
      {P('M5 14v6')}
      {P('M12 4v10')}
      {P('M12 18v2')}
      {P('M19 4v2')}
      {P('M19 10v10')}
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="16" r="2" />
      <circle cx="19" cy="8" r="2" />
    </>
  ),
  wave: (
    <>
      {P('M2 12h3')}
      {P('M8 12h.01')}
      {P('M11 7v10')}
      {P('M14 4v16')}
      {P('M17 9v6')}
      {P('M20 11h2')}
    </>
  ),
  speaker: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="14.5" r="3.5" />
      <circle cx="12" cy="7" r="1.4" />
    </>
  ),
  plus: (
    <>
      {P('M12 5v14')}
      {P('M5 12h14')}
    </>
  ),
  trash: (
    <>
      {P('M4 7h16')}
      {P('M9 7V4h6v3')}
      {P('M6 7l1 14h10l1-14')}
      {P('M10 11v6')}
      {P('M14 11v6')}
    </>
  ),
  crown: (
    <>
      {P('M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 10.5H4.6z')}
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="10" y="10" width="4" height="4" />
      {P('M9 2v2.5')}
      {P('M15 2v2.5')}
      {P('M9 19.5V22')}
      {P('M15 19.5V22')}
      {P('M2 9h2.5')}
      {P('M2 15h2.5')}
      {P('M19.5 9H22')}
      {P('M19.5 15H22')}
    </>
  ),
  ram: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      {P('M7 17v3')}
      {P('M12 17v3')}
      {P('M17 17v3')}
      {P('M7 10.5v3')}
      {P('M11 10.5v3')}
      {P('M15 10.5v3')}
    </>
  ),
  disk: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      {P('M12 3a9 9 0 0 1 9 9')}
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      {P('M12 7.5V12')}
      {P('M12 12l-5.5 4.8')}
      {P('M12 12l5.5 4.8')}
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('M12 7v5l3.5 2')}
    </>
  ),
  headset: (
    <>
      {P('M4 13a8 8 0 0 1 16 0')}
      <rect x="3" y="13" width="4" height="7" rx="1.8" />
      <rect x="17" y="13" width="4" height="7" rx="1.8" />
      {P('M20 18v1.5a2.5 2.5 0 0 1-2.5 2.5H13')}
    </>
  ),
  refresh: (
    <>
      {P('M20 12a8 8 0 1 1-2.34-5.66')}
      {P('M20 4v5h-5')}
    </>
  ),
  x: (
    <>
      {P('M6 6l12 12')}
      {P('M18 6 6 18')}
    </>
  ),
  check: P('M5 13l4.5 4.5L19 7'),
  alert: (
    <>
      {P('M12 3 2.5 20h19z')}
      {P('M12 9.5V14')}
      {P('M12 17h.01')}
    </>
  ),
  logout: (
    <>
      {P('M14 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8')}
      {P('M17 8l4 4-4 4')}
      {P('M10.5 12H20.5')}
    </>
  ),
  download: (
    <>
      {P('M12 3v12')}
      {P('M7 11l5 5 5-5')}
      {P('M4 21h16')}
    </>
  ),
  upload: (
    <>
      {P('M12 15V3')}
      {P('M7 7l5-5 5 5')}
      {P('M4 21h16')}
    </>
  ),
  external: (
    <>
      {P('M14 4h6v6')}
      {P('M20 4 11 13')}
      {P('M19 14v5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5H10')}
    </>
  ),
  edit: (
    <>
      {P('M4 20h4L20 8l-4-4L4 16z')}
      {P('M13.5 6.5l4 4')}
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.8" />
      <rect x="3" y="13" width="18" height="7" rx="1.8" />
      {P('M7 7.5h.01')}
      {P('M7 16.5h.01')}
    </>
  ),
  send: (
    <>
      {P('M21 3 10.5 13.5')}
      {P('M21 3 14 21l-3.5-7.5L3 10z')}
    </>
  ),
  zap: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />,
  eye: (
    <>
      {P('M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z')}
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  activity: (
    <>
      {P('M2 12h4l3-8 4 16 3-8h6')}
    </>
  ),
  list: (
    <>
      {P('M8 6h13')}
      {P('M8 12h13')}
      {P('M8 18h13')}
      {P('M3.5 6h.01')}
      {P('M3.5 12h.01')}
      {P('M3.5 18h.01')}
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('M3 12h18')}
      {P('M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18')}
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      {P('M8 11V8a4 4 0 0 1 8 0v3')}
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  shuffle: (
    <>
      {P('M3 6h3.5c1.4 0 2.6.7 3.4 1.8l4.2 6.4c.8 1.1 2 1.8 3.4 1.8H21')}
      {P('M3 16h3.5c1.4 0 2.6-.7 3.4-1.8l.9-1.4')}
      {P('M13.9 9.2l.6-.9c.8-1.1 2-1.8 3.4-1.8H21')}
      {P('M18.5 4l2.5 2.5L18.5 9')}
      {P('M18.5 13l2.5 2.5L18.5 18')}
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      {P('M9.6 9.2a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 2-2.4 3.4')}
      {P('M12 16.6h.01')}
    </>
  ),
  book: (
    <>
      {P('M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z')}
      {P('M4 20.5V5.5')}
      {P('M8 7h8')}
      {P('M8 10.5h6')}
    </>
  ),
  doc: (
    <>
      {P('M6 2h9l4 4v16H6z')}
      {P('M15 2v4h4')}
      {P('M9 11h7')}
      {P('M9 15h7')}
      {P('M9 7h2')}
    </>
  ),
  discord: (
    <path
      fill="currentColor"
      stroke="none"
      d="M18.9 6.3a15.4 15.4 0 0 0-3.8-1.2l-.5.9a13.6 13.6 0 0 0-5.2 0l-.5-.9c-1.3.2-2.6.6-3.8 1.2A15.9 15.9 0 0 0 2.4 17a15.6 15.6 0 0 0 4.7 2.4l1-1.6c-.7-.3-1.4-.6-2-1l.5-.4a11.2 11.2 0 0 0 9.6 0l.5.4c-.6.4-1.3.7-2 1l1 1.6a15.5 15.5 0 0 0 4.7-2.4 15.8 15.8 0 0 0-1.5-10.7ZM9.3 14.6c-.9 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Zm5.4 0c-.9 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Z"
    />
  ),
  megaphone: (
    <>
      {P('M3 10v4l4 .8L18 19V5L7 9.2z')}
      {P('M7 14.8V19')}
      {P('M18 9a3.5 3.5 0 0 1 0 6')}
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.6" />
      {P('M12 3v3.4')}
      {P('M12 17.6V21')}
    </>
  ),
};

export function Icon({ name, size = 16, className, strokeWidth = 1.7 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}
