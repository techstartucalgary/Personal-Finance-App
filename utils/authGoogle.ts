import { supabase } from "@/utils/supabase";
import {
    GoogleSignin,
    isSuccessResponse,
    statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

let configured = false;

export function configureGoogleOnce() {
  if (configured) return;
  if (Platform.OS === "web") return;

  GoogleSignin.configure({
    webClientId:
      "801083441538-qdj0ai72fhs80t56379l3eo9tnlad2go.apps.googleusercontent.com",
    iosClientId:
      "801083441538-653cd41r45k21kd0u6cgrlf4d5km4uf8.apps.googleusercontent.com",
  });

  configured = true;
}

export async function signInWithGoogle() {
  if (Platform.OS === "web") {
    return {
      ok: false as const,
      message: "Google Sign-in is not supported on web in this version.",
    };
  }

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return { ok: false as const, message: "Google sign-in was cancelled." };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return { ok: false as const, message: "No ID token returned." };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) return { ok: false as const, message: error.message };

    return { ok: true as const };
  } catch (error: any) {
    if (error?.code === statusCodes.IN_PROGRESS) {
      return {
        ok: false as const,
        message: "Google sign-in already in progress.",
      };
    }

    if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        ok: false as const,
        message: "Google Play Services is not available or is outdated.",
      };
    }

    return { ok: false as const, message: "Please try again." };
  }
}
