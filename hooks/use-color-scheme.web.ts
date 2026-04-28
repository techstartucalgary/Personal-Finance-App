import { useEffect, useState } from "react";

function getPreferredScheme(): "light" | "dark" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useColorScheme(): "light" | "dark" {
  const [scheme, setScheme] = useState<"light" | "dark">(getPreferredScheme);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateScheme = () => {
      setScheme(mediaQuery.matches ? "dark" : "light");
    };

    updateScheme();
    mediaQuery.addEventListener("change", updateScheme);

    return () => {
      mediaQuery.removeEventListener("change", updateScheme);
    };
  }, []);

  return scheme;
}
