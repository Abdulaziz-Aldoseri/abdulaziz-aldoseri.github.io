import { useEffect, useState } from 'react';

/** True below the mobile breakpoint, so charts can switch to a narrow layout. */
export function useCompact(query = '(max-width: 680px)'): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return compact;
}
