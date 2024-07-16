import type { ButtonProps, MenuProps } from 'naive-ui';

type ButtonThemeOverrides = NonNullable<ButtonProps['themeOverrides']>;

export const buttonThemeOverrides: ButtonThemeOverrides = {
  textColorTextHover: '#2777F8',
  textColorTextPressed: '#2777F8',
  textColorTextFocus: '#2777F8',
};

type MenuThemeOverrides = NonNullable<MenuProps['themeOverrides']>;

export const menuThemeOverrides: MenuThemeOverrides = {
  itemColorActive: '#EEF0FF',
  itemColorActiveHover: '#EEF0FF',
  itemTextColorActive: '#2777F8',
  itemTextColorActiveHover: '#2777F8',
};
