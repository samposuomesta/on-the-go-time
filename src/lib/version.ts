// Bump this version string on each release
export const APP_VERSION = '0.2.0';
export const BUILD_DATE = __BUILD_DATE__;

declare global {
  const __BUILD_DATE__: string;
}
