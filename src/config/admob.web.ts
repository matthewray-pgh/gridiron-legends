// Web build of admob.ts. react-native-google-mobile-ads has no web
// implementation, and critically some of its internal files import
// native-only React Native internals (codegenNativeComponent) that don't
// exist on web at all — requiring the package ANYWHERE in the web module
// graph breaks Metro's web bundle, even behind a runtime `if` check, since
// Metro still has to statically resolve that `require()` to build the
// bundle in the first place (an `if` only changes what runs, not what
// Metro has to resolve). Metro/Expo prefer a `.web.ts` file over the bare
// `.ts` when bundling for web, so this file's only job is to make sure
// nothing here ever writes `require('react-native-google-mobile-ads')` on
// that platform — admob.ts's version (which does) is never even touched.
export const ADMOB_SUPPORTED_PLATFORM = false;
export const ADMOB_TEST_REWARDED_UNIT_ID = '';
export const googleMobileAds = null;
