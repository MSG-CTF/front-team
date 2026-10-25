import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ensureGameFonts, preloadIntroResources, preloadGameArtwork } from "./pageResources.js";

export default function usePageResources({ gameAllowed = true } = {}) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (gameAllowed) {
      ensureGameFonts(document, pathname);
      preloadGameArtwork(document, pathname);
    }
    preloadIntroResources(document, pathname);
  }, [pathname, gameAllowed]);
}
