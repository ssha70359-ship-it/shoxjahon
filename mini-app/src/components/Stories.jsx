import { useEffect, useState } from 'react';
import { haptic } from '../lib/telegram.js';

const STORIES = [
  {
    id: 'bulochka',
    label: 'Bulochka',
    emoji: '\u{1F96F}',
    title: 'Hammasi 7 000 so‘mdan',
    text: 'Serdechko, mayizli, makli, tvorogli, sosiskali, simit — barcha bulochkalar.',
    bg: 'linear-gradient(160deg,#e8a33d,#c9762b)',
  },
  {
    id: 'kruassan',
    label: 'Kruassan',
    emoji: '\u{1F950}',
    title: 'Ichi to‘ldirilgan',
    text: 'Malina va shokolad 18 000 so‘mdan, mindal va fistashka 23 000 so‘mdan.',
    bg: 'linear-gradient(160deg,#c2185b,#7b1040)',
  },
  {
    id: 'sinnabon',
    label: 'Sinnabon',
    emoji: '\u{1F369}',
    title: 'Sinnabon 12 000 so‘mdan',
    text: 'Dolchinli xamir, krem-chiz va shokolad sousi bilan.',
    bg: 'linear-gradient(160deg,#8b5cf6,#5b34c4)',
  },
  {
    id: 'yetkazish',
    label: 'Yetkazish',
    emoji: '\u{1F69A}',
    title: 'Yandex orqali',
    text: 'Buyurtmalar Yandex orqali yetkaziladi. Yetkazish narxi alohida to‘lanadi.',
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
