
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export const useMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // Add event listener
    mql.addEventListener("change", onChange);
    
    // Clean up
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
};
