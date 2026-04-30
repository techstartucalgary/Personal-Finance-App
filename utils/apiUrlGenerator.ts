import Constants from "expo-constants";
// In production: needs to point at deployed API URL Ex. https://sterling.vercel.app
export const generateAPIUrl = (relativePath: string) => {
  const origin = (
    Constants.expoConfig?.hostUri ?? Constants.experienceUrl
  )
    .replace(/^exp:\/\//, "http://")
    .replace(/^(?!https?:\/\/)/, "http://");

  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === "development") {
    return origin.concat(path);
  }

  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL environment variable is not defined",
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
};
