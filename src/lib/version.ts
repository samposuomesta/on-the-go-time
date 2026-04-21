// Bump this version string on each release
// Version format: YY.M.sequential (e.g. 26.3.1 = year 2026, March, release 1)
export const APP_VERSION = '26.3.43';
export const BUILD_DATE = __BUILD_DATE__;

declare global {
  const __BUILD_DATE__: string;
}
