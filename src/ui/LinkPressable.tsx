import React from 'react';
import { Platform, Pressable, PressableProps } from 'react-native';
import { Link, LinkProps } from 'expo-router';

type Props = {
  href: LinkProps['href'];
  children: React.ReactNode;
  pressableProps?: PressableProps;
  linkProps?: Omit<LinkProps, 'href'>;
};

export default function LinkPressable({ href, children, pressableProps, linkProps }: Props) {
  if (Platform.OS === 'web') {
    return (
      <Link href={href} {...linkProps}>
        <Pressable {...pressableProps}>{children}</Pressable>
      </Link>
    );
  }
  return (
    <Link href={href} asChild {...linkProps}>
      <Pressable {...pressableProps}>{children}</Pressable>
    </Link>
  );
}
