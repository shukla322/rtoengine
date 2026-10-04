import { useEffect, useRef, useState } from 'react';

export function useActiveDay(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const elements = useRef<Map<string, Element>>(new Map());
  const order = useRef<string[]>(ids);
  order.current = ids;

  useEffect(() => {
    setActiveId(ids[0] ?? null);
  }, [ids]);

  useEffect(() => {
    const seen = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) seen.add(id);
          else seen.delete(id);
        }
        const last = order.current.filter((id) => seen.has(id)).pop();
        if (last) setActiveId(last);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );

    elements.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const registerPill = (id: string, el: Element | null) => {
    if (el) {
      elements.current.set(id, el);
    } else {
      elements.current.delete(id);
    }
  };

  return { activeId, registerPill };
}
