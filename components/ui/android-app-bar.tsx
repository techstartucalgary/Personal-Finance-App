import { Host, Icon, IconButton, Row, Spacer, Surface, Text, Column, DockedSearchBar } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, height, padding, weight } from "@expo/ui/jetpack-compose/modifiers";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AndroidAppBarProps = {
  title: string;
  /** Left-side icon button, typically a back button or navigation action. */
  navigationIcon?: React.ReactNode;
  /** Right-side icon buttons. */
  actions?: React.ReactNode;
  /** Options for a search bar, if this app bar should include one. */
  searchBarOptions?: {
    placeholder?: string;
    onChangeText?: (event: { nativeEvent: { text: string } }) => void;
  };
};

/**
 * Material 3 top app bar built with Jetpack Compose.
 * Use on Android only — wrap in a Platform.OS === 'android' check at the call site.
 */
export function AndroidAppBar({ title, navigationIcon, actions, searchBarOptions }: AndroidAppBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <Host matchContents>
      <Surface tonalElevation={0} modifiers={[fillMaxWidth()]}>
        <Column modifiers={[fillMaxWidth(), padding(0, insets.top, 0, 0)]}>
          <Row
            verticalAlignment="center"
            modifiers={[fillMaxWidth(), height(64), padding(4, 0, 4, 0)]}
          >
            {navigationIcon}
            <Text
              style={{ typography: "titleLarge" }}
              modifiers={[padding(navigationIcon ? 4 : 12, 0, 0, 0)]}
            >
              {title}
            </Text>
            <Spacer modifiers={[weight(1)]} />
            {actions}
          </Row>

          {searchBarOptions && (
            <Row modifiers={[fillMaxWidth(), padding(16, 0, 16, 16)]}>
              <DockedSearchBar
                onQueryChange={(query) =>
                  searchBarOptions.onChangeText?.({ nativeEvent: { text: query } })
                }
                modifiers={[fillMaxWidth()]}
              >
                {searchBarOptions.placeholder && (
                  <DockedSearchBar.Placeholder>
                    <Text modifiers={[padding(0, 0, 0, 0)]}>{searchBarOptions.placeholder}</Text>
                  </DockedSearchBar.Placeholder>
                )}
                <DockedSearchBar.LeadingIcon>
                  <Icon source={require("@/assets/icons/search.xml")} size={24} />
                </DockedSearchBar.LeadingIcon>
              </DockedSearchBar>
            </Row>
          )}
        </Column>
      </Surface>
    </Host>
  );
}

/**
 * Standard back button for use as the `navigationIcon` prop.
 */
export function AppBarBackButton({ onPress }: { onPress: () => void }) {
  return (
    <IconButton onClick={onPress}>
      <Icon source={require("@/assets/icons/arrow_back.xml")} size={24} />
    </IconButton>
  );
}
