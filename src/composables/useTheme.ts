import { darkTheme, useOsTheme } from 'naive-ui';
import { settings } from '@/utils';

export const useTheme = () => {
  const osThemeRef = useOsTheme();
  const theme = computed(() =>
    osThemeRef.value === 'dark' && settings?.darkMode.enable ? darkTheme : null,
  );
  return theme;
};
