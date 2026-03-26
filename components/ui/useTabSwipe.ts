import { useCallback, useRef } from "react";
import { Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import type {
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import { State } from "react-native-gesture-handler";
import { setSwipeDirection } from "@/components/ui/tabTransitionDirection";
import { useFocusEffect } from "expo-router";

const TAB_ROUTES = [
  "/(tabs)/dashboard",
  "/(tabs)/accounts",
  "/(tabs)/transactions",
  "/(tabs)/targets",
];

export function useTabSwipe(activeIndex: number) {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;

  useFocusEffect(
    useCallback(() => {
      translateX.setValue(0);
      return () => {};
    }, [translateX])
  );

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      translateX.setValue(event.nativeEvent.translationX);
    },
    [translateX],
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationX, velocityX } = event.nativeEvent;

      if (state === State.BEGAN) {
        translateX.stopAnimation();
        return;
      }

      const endState =
        state === State.END || state === State.CANCELLED || state === State.FAILED;
      if (!endState) return;

      const fastEnough = Math.abs(velocityX) > 800;
      const farEnough = Math.abs(translationX) > 60;
      if (!fastEnough && !farEnough) {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
        return;
      }

      if (translationX < 0 && activeIndex < TAB_ROUTES.length - 1) {
        setSwipeDirection("left");
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          router.push(TAB_ROUTES[activeIndex + 1]);
        });
      } else if (translationX > 0 && activeIndex > 0) {
        setSwipeDirection("right");
        Animated.timing(translateX, {
          toValue: screenWidth,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          router.push(TAB_ROUTES[activeIndex - 1]);
        });
      } else {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }
    },
    [activeIndex, router, screenWidth, translateX],
  );

  return {
    onGestureEvent,
    onHandlerStateChange,
    style: { transform: [{ translateX }] },
  };
}
