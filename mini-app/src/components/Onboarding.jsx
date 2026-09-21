import { useState } from 'react';
import { haptic } from '../lib/telegram.js';

const SLIDES = [
  {
    emoji: '\u{1F968}',
    title: 'Farhadskaya Bulochka',
    text: '1996-yildan buyon Toshkentni eng mazali bulochkalar bilan ta‘minlab kelamiz.',
  },
  {
    emoji: '\u{1F449}',
    title: 'Bu qanday ishlaydi?',
    text: 'Tanlang, buyurtma bering va rohatlaning. Uch qadam, boshqa hech narsa kerak emas.',
  },
  {
    emoji: '\u{1F389}',
    title: '40 000+ obunachi biz bilan',
    text: 'Har kuni minglab mijozlar bizning bulochkalarimizni tanlaydi. Siz ham qo‘shiling!',
  },
];

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  function next() {
    haptic();
    if (isLast) onFinish();
    else setStep((value) => value + 1);
  }

  return (
    <div className="onb">
      <button className="onb-skip" onClick={onFinish}>
        {isLast ? '' : 'O‘tkazib yuborish'}
      </button>

      <div className="onb-body">
        <div className="onb-art" key={step}>
          {slide.emoji}
        </div>
        <h1 className="onb-title">{slide.title}</h1>
        <p className="onb-text">{slide.text}</p>
      </div>

      <div className="onb-dots">
        {SLIDES.map((item, index) => (
          <i key={item.title} className={`dot ${index === step ? 'active' : ''}`} />
        ))}
      </div>

      <button className="btn" onClick={next}>
        {isLast ? 'Boshla' : 'Keyingisi'}
      </button>
    </div>
  );
}
