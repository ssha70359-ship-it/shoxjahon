import { useEffect, useState } from 'react';
import { haptic } from '../lib/telegram.js';

const STORIES = [
  {
    id: 'aksiya',
    label: 'Aksiya',
    emoji: '\u{1F525}',
    title: '-20% chegirma',
    text: 'Bugun barcha klassik pizzalarga 20% chegirma. Shoshiling!',
    bg: 'linear-gradient(160deg,#ff3b30,#ff7a45)',
  },
  {
    id: 'yangi',
    label: 'Yangi',
    emoji: '\u{1F195}',
    title: 'Qazi pizza',
    text: 'Milliy ta‘m endi pizzada. Yangi retsept bo‘yicha tayyorlandi.',
    bg: 'linear-gradient(160deg,#1eb980,#0e8f63)',
  },
  {
    id: 'tezkor',
    label: 'Tezkor',
    emoji: '\u{1F6F5}',
    title: '30 daqiqa',
    text: 'Buyurtmangiz 30 daqiqada yetib boradi, aks holda — bepul.',
    bg: 'linear-gradient(160deg,#2f6bff,#6f4bff)',
  },
  {
    id: 'sovga',
    label: 'Sovg‘a',
    emoji: '\u{1F381}',
    title: 'Har 5-buyurtma',
    text: '5 ta buyurtmadan keyin sizga bepul ichimlik sovg‘a qilamiz.',
    bg: 'linear-gradient(160deg,#ff9f0a,#ff6b00)',
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
