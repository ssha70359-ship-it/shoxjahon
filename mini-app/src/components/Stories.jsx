import { useEffect, useState } from 'react';
import { haptic } from '../lib/telegram.js';

const STORIES = [
  {
    id: 'issiq',
    label: 'Issiq',
    emoji: '\u{1F950}',
    title: 'Endigina pechdan',
    text: 'Bulochkalarimiz kun bo‘yi yangilanadi — har doim issiqqina va yumshoq.',
    bg: 'linear-gradient(160deg,#e8a33d,#c9762b)',
  },
  {
    id: 'mayiz',
    label: 'Xit',
    emoji: '\u{1F347}',
    title: 'Mayizli bulochka',
    text: 'Eng ko‘p buyurtma qilinadigan mahsulotimiz. Bir marta tatib ko‘ring!',
    bg: 'linear-gradient(160deg,#8b5cf6,#5b34c4)',
  },
  {
    id: 'non',
    label: 'Non',
    emoji: '\u{1F35E}',
    title: 'Har kuni yangi non',
    text: 'Oq non, qora non, javdar, Borodinskiy va chiabatta — hammasi o‘z pechimizda.',
    bg: 'linear-gradient(160deg,#1eb980,#0e8f63)',
  },
  {
    id: 'filial',
    label: 'Filial',
    emoji: '\u{1F4CD}',
    title: '4 ta filial',
    text: 'Farhad bozori, Lutfiy, Jararyk va Uchtepa 23-kvartal. Har kuni 7:00 – 19:00.',
    bg: 'linear-gradient(160deg,#2f6bff,#6f4bff)',
  },
];

function StoryViewer({ index, onClose, onIndexChange }) {
  const story = STORIES[index];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < STORIES.length - 1) onIndexChange(index + 1);
      else onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [index, onClose, onIndexChange]);

  return (
    <div className="story-view" style={{ background: story.bg }}>
      <div className="story-bars">
        {STORIES.map((item, i) => (
          <div
            key={item.id}
            className={`story-bar ${i < index ? 'done' : ''} ${i === index ? 'active' : ''}`}
          >
            <span />
          </div>
        ))}
      </div>

      <button className="story-close" onClick={onClose} aria-label="Yopish">
        &times;
      </button>

      <div
        className="story-tap"
        style={{ left: 0 }}
        onClick={() => (index > 0 ? onIndexChange(index - 1) : onClose())}
      />
      <div
        className="story-tap"
        style={{ right: 0 }}
        onClick={() => (index < STORIES.length - 1 ? onIndexChange(index + 1) : onClose())}
      />

      <div className="story-content">
        <div className="emoji">{story.emoji}</div>
        <h3>{story.title}</h3>
        <p>{story.text}</p>
      </div>
    </div>
  );
}

export default function Stories() {
  const [active, setActive] = useState(null);
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pz_seen_stories') || '[]');
    } catch {
      return [];
    }
  });

  function open(index) {
    haptic();
    setActive(index);
    const id = STORIES[index].id;
    if (!seen.includes(id)) {
      const next = [...seen, id];
      setSeen(next);
      try {
        localStorage.setItem('pz_seen_stories', JSON.stringify(next));
      } catch {
        /* localStorage yopiq */
      }
    }
  }

  return (
    <>
      <div className="stories">
        {STORIES.map((story, index) => (
          <button key={story.id} className="story" onClick={() => open(index)}>
            <div className={`story-ring ${seen.includes(story.id) ? 'seen' : ''}`}>
              <div className="story-inner">{story.emoji}</div>
            </div>
            <div className="story-label">{story.label}</div>
          </button>
        ))}
      </div>

      {active !== null && (
        <StoryViewer index={active} onClose={() => setActive(null)} onIndexChange={setActive} />
      )}
    </>
  );
}
