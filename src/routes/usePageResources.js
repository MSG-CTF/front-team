import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ensureGameFonts, preloadIntroResources } from "./pageResources.js";

export default function usePageResources() {
  const { pathname } = useLocation();
  useEffect(() => {
    ensureGameFonts(document, pathname);
    preloadIntroResources(document, pathname);
  }, [pathname]);
}
