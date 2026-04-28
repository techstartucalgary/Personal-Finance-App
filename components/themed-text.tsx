import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { Tokens } from '@/constants/authTokens';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'heroNumber';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'heroNumber' ? styles.heroNumber : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Tokens.font.family,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Tokens.font.semiFamily ?? Tokens.font.family,
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: Tokens.font.headingFamily ?? Tokens.font.boldFamily ?? Tokens.font.family,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: Tokens.font.boldFamily ?? Tokens.font.family,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    textDecorationLine: 'underline',
    fontFamily: Tokens.font.family,
  },
  heroNumber: {
    fontSize: 36,
    lineHeight: 38,
    fontFamily: Tokens.font.numberFamily ?? Tokens.font.family,
    fontVariant: ['tabular-nums'],
  },
});
