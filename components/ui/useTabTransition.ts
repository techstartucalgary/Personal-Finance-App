import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated } from "react-native";
import { consumeSwipeDirection } from "@/components/ui/tabTransitionDirection";

export function useTabTransition() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const direction = consumeSwipeDirection();
      const startX = direction === "left" ? 24 : direction === "right" ? -24 : 0;
      opacity.setValue(0);
      translateY.setValue(0);
      translateX.setValue(startX);

      const anim = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]);

      anim.start();
      return () => anim.stop();
    }, [opacity, translateX, translateY])
  );

  return {
    style: {
      opacity,
      transform: [{ translateY }, { translateX }],
    },
  };
}
