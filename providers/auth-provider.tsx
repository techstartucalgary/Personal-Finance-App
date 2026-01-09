import { AuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/utils/supabase";
import type { Session } from "@supabase/supabase-js";
import React, { PropsWithChildren, useEffect, useState } from "react";

type NameParts = { firstName?: string; lastName?: string };

function parseNameFromUserMetadata(
  userMetadata: Record<string, any> | undefined
): NameParts {
  if (!userMetadata) return {};

  const firstName = (userMetadata.given_name ?? userMetadata.first_name) as
    | string
    | undefined;
  const lastName = (userMetadata.family_name ?? userMetadata.last_name) as
    | string
    | undefined;

  if (firstName || lastName) {
    return {
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
    };
  }

  const fullName = (userMetadata.full_name ?? userMetadata.name) as
    | string
    | undefined;
  const normalized = fullName?.trim();
  if (!normalized) return {};

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0] };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | undefined | null>();
  const [profile, setProfile] = useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch the session once, and subscribe to auth state changes
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error fetching session:", error);
      }

      setSession(session);
      setIsLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", { event: _event, session });
      setSession(session);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch the profile when the session changes
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);

      if (session) {
        const userId = session.user.id;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        const existingFirstName = (profileData as any)?.first_name as
          | string
          | undefined;
        const existingLastName = (profileData as any)?.last_name as
          | string
          | undefined;

        const needsNameBackfill =
          !profileData ||
          (!existingFirstName?.trim() && !existingLastName?.trim());

        if (needsNameBackfill) {
          const { firstName, lastName } = parseNameFromUserMetadata(
            session.user.user_metadata as Record<string, any> | undefined
          );

          const nextFirstName = existingFirstName?.trim()
            ? existingFirstName
            : firstName;
          const nextLastName = existingLastName?.trim()
            ? existingLastName
            : lastName;

          // If the profile row doesn't exist, don't try to INSERT from the client (RLS blocks it).
          if (!profileData) {
            console.warn(
              "Profile row missing; expected trigger to create it. Skipping client write.",
              { userId }
            );
          } else if (nextFirstName || nextLastName) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                ...(nextFirstName ? { first_name: nextFirstName } : {}),
                ...(nextLastName ? { last_name: nextLastName } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);

            if (updateError) {
              console.error("Error updating profile name:", updateError);
            } else {
              const { data: refreshedProfile, error: refreshedError } =
                await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", userId)
                  .maybeSingle();

              if (refreshedError) {
                console.error(
                  "Error refreshing profile after update:",
                  refreshedError
                );
              }

              setProfile(refreshedProfile ?? profileData ?? null);
              setIsLoading(false);
              return;
            }
          }
        }

        setProfile(profileData);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    };

    fetchProfile();
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        profile,
        isLoggedIn: session != null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
