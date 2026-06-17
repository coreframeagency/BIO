import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteProgress() {
  const location = useLocation();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(30);
    const t1 = window.setTimeout(() => setWidth(70), 120);
    const t2 = window.setTimeout(() => setWidth(100), 280);
    const t3 = window.setTimeout(() => setWidth(0), 520);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [location.pathname]);

  if (width === 0) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[200] h-0.5 bg-brand-green transition-all duration-300 ease-out"
      style={{ width: `${width}%` }}
    />
  );
}
