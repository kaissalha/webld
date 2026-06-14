import type { PdfxTheme } from "./theme";
import { defaultTheme } from "./theme";

/**
 * PDF components are rendered through a server-side pipeline, so this module
 * must stay free of client-only React APIs like createContext/useContext.
 */
export const usePdfxTheme = (): PdfxTheme => defaultTheme;

/**
 * Preserve the existing component API without relying on React hooks in the
 * server-rendered PDF path.
 */
export const useSafeMemo = <T,>(factory: () => T, _deps: unknown[]): T => factory();
