import { useWindowDimensions } from 'react-native';

export const WIDE_BREAKPOINT = 900;

export function useResponsive() {
  const { width } = useWindowDimensions();
  return { width, isWide: width >= WIDE_BREAKPOINT };
}
