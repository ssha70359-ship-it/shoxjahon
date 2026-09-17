import { useEffect } from 'react';

export default function Toast({ message, onHide }) {
  useEffect(() => {
    const timer = setTimeout(onHide, 1800);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  return <div className="toast">{message}</div>;
}
