import { money, num } from '../lib/format.js';

export default function Stats({ data }) {
  if (!data) return null;

  const cards = [
    { label: 'Jami buyurtma', value: num(data.orders) },
    { label: 'Yangi (kutilmoqda)', value: num(data.pending) },
    { label: 'Mahsulotlar', value: num(data.products) },
    { label: 'Mijozlar', value: num(data.users) },
    { label: 'Umumiy tushum', value: money(data.revenue) },
  ];

  return (
    <div className="stats">
      {cards.map((card) => (
        <div className="stat" key={card.label}>
          <span>{card.label}</span>
          <b>{card.value}</b>
        </div>
      ))}
    </div>
  );
}
