import { useEffect, useState } from 'react';

const useIsMobileView = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 780);
    };

    checkIfMobile();

    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return isMobile;
};

export default useIsMobileView;
