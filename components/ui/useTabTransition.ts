import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated } from "react-native";

export function useTabTransition() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(0);
      translateX.setValue(0);

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
