import { useThemeUI } from "@/hooks/use-theme-ui";
import { supabase } from "@/utils/supabase";
import { Stack } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

interface MFAEnrollContextType {
  factorId: string;
  qrSvg: string;
  secret: string;
  loading: boolean;
  error: string;
  cleanupUnverifiedFactors: () => Promise<void>;
}

const MFAEnrollContext = createContext<MFAEnrollContextType | null>(null);

export function useMFAEnroll() {
  const context = useContext(MFAEnrollContext);
  if (!context) {
    throw new Error("useMFAEnroll must be used within a MFAEnrollProvider");
  }
  return context;
}

export default function MFAEnrollLayout() {
  const ui = useThemeUI();
  const [factorId, setFactorId] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cleanupUnverifiedFactors = useCallback(async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors?.all) return;
    for (const f of factors.all) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startEnrollment = async (retryCount = 0): Promise<void> => {
      setLoading(true);
      setError("");
      try {
        await cleanupUnverifiedFactors();
      } catch (e) {
        console.warn("[MFA] Factor cleanup error (continuing):", e);
      }

      if (cancelled) return;

      const friendlyName = `totp-${Date.now()}`;
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
        issuer: "Sterling Money",
      });

      if (cancelled) return;

      if (enrollError) {
        if (enrollError.message.includes("already exists") && retryCount < 1) {
          await cleanupUnverifiedFactors().catch(() => { });
          return startEnrollment(retryCount + 1);
        }
        setError(enrollError.message);
        setLoading(false);
        return;
      }

      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setLoading(false);
    };

    startEnrollment();
    return () => { cancelled = true; };
  }, [cleanupUnverifiedFactors]);

  return (
    <MFAEnrollContext.Provider value={{ factorId, qrSvg, secret, loading, error, cleanupUnverifiedFactors }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerTransparent: Platform.OS === "ios",
          headerTintColor: ui.text,
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: Platform.OS === "android" ? { backgroundColor: ui.surface } : undefined,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Set Up MFA" }} />
        <Stack.Screen name="verify" options={{ title: "Verify Code", headerBackTitle: "QR Code" }} />
      </Stack>
    </MFAEnrollContext.Provider>
  );
}
