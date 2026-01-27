import { useState, useEffect } from 'react';

/**
 * useScrollSpy
 * 
 * A hook to detect which section of a page is currently active based on scroll position.
 * It prioritizes the section at the top of the viewport, but handles the edge case where
 * the user has scrolled to the bottom of the page (making the last section active).
 *
 * @param sectionIds Array of section element IDs to spy on.
 * @param offsetPx Offset in pixels to calculate the "active" zone (default: 100px).
 * @returns The ID of the currently active section.
 */
export const useScrollSpy = (sectionIds: string[], offsetPx: number = 100) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offsetPx;
      const pageHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const isAtBottom = window.scrollY + windowHeight >= pageHeight - 5; // 5px tolerance

      // 1. Find the section currently in view (Top priority)
      let foundSectionId = '';
      
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;

          // Standard check: Is scroll cursor within this section?
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            foundSectionId = id;
            break; // Found the top-most active section
          }
        }
      }

      // 2. Bottom of Page Fallback
      // If we found a section, use it. 
      // EXCEPT if we are at the very bottom, and the last section is visible, 
      // the user might expect the last section to be active even if "Company Details" is technically still active (short page).
      // However, the user complained about "sticking". So let's strict: 
      // Only force last section if NO section was found (unlikely) OR if the last section is the ONLY one fully in view?
      // Actually, standard behavior: If I scroll to bottom, and "Review" is there, highlight it.
      // But if "Company Details" is also there?
      // Let's use this logic: If at bottom, set active to last section ONLY if foundSectionId is NOT set, OR if the last section is dominating the view.
      
      if (isAtBottom && sectionIds.length > 0) {
           const lastId = sectionIds[sectionIds.length - 1];
           // If we didn't find any section (maybe gap?), use last.
           // OR if the found section is NOT the last one, but we are at bottom... 
           // If the page is short, foundSectionId might be the first one. 
           // If we are at bottom, we should probably show the last one? 
           // User hated "sticking". Sticking happens when "Review" stays active even when I scroll up slightly.
           // So, ONLY use isAtBottom if we are strictly at bottom.
           
           // If foundSectionId is already derived from top position, respect it.
           // Unless we are at the bottom and the last section is small?
           // Let's just return foundSectionId if it exists. 
           // If foundSectionId is valid, use it. This prevents sticking to "Review" when "Company" is top.
           
           if (!foundSectionId) {
               setActiveId(lastId);
               return;
           }
      }

      if (foundSectionId && foundSectionId !== activeId) {
        setActiveId(foundSectionId);
      } else if (!foundSectionId && activeId !== '') {
          // Keep current if nothing found (prevent flickering)
      }
    };

    // Throttle scroll event for performance
    let timeoutId: NodeJS.Timeout | null = null;
    const throttledHandleScroll = () => {
        if (timeoutId === null) {
            timeoutId = setTimeout(() => {
                handleScroll();
                timeoutId = null;
            }, 50); // check every 50ms
        }
    };

    window.addEventListener('scroll', throttledHandleScroll);
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sectionIds, offsetPx, activeId]);

  return activeId;
};
