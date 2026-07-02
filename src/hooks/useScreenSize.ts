import { useState, useEffect } from 'react';

export const useScreenSize = () => {
  const [isTooSmall, setIsTooSmall] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsTooSmall(window.innerWidth < 768 || window.innerHeight < 600);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return isTooSmall;
}; 