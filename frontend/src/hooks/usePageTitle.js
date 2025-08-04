import { useEffect } from 'react';

export const usePageTitle = (title) => {
  // Set document title
  useEffect(() => {
    document.title = title;
  }, [title]);
};

export default usePageTitle; 