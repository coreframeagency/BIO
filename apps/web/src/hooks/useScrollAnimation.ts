import { useEffect, useRef } from 'react';

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    element.classList.add('fade-in');
    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
