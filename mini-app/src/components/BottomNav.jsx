import { haptic } from '../lib/telegram.js';

const TABS = [
  { id: 'home', icon: '\u{1F3E0}', label: 'Bosh sahifa' },
  { id: 'catalog', icon: '\u{1F50D}', label: 'Katalog' },
  { id: 'cart', icon: '\u{1F6D2}', label: 'Savatcha' },
  { id: 'profile', icon: '\u{1F464}', label: 'Profil' },
];

export default function BottomNav({ tab, onChange, cartCount }) {
  return (
    <nav className="nav">
      {TABS.map((item) => (
        <button
          key={item.id}
          className={tab === item.id ? 'active' : ''}
          onClick={() => {
            haptic();
            onChange(item.id);
          }}
        >
          <span className="ico">{item.icon}</span>
          {item.label}
          {item.id === 'cart' && cartCount > 0 && <i className="nav-badge">{cartCount}</i>}
        </button>
      ))}
    </nav>
  );
}
