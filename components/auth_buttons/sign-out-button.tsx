import { supabase } from '@/utils/supabase'
import { deactivateStoredPushToken } from '@/utils/pushNotifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'
import { Button } from 'react-native'

export async function onSignOutButtonPress() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      try {
        await deactivateStoredPushToken({ profile_id: user.id })
      } catch (pushTokenError) {
        console.error('Error deactivating push token on sign out:', pushTokenError)
      }
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch {
    // If signOut fails (e.g. session already expired), force-clear
    // the persisted session from AsyncStorage so the auth state resets
    try {
      const keys = await AsyncStorage.getAllKeys()
      const supabaseKeys = keys.filter(
        (k) => k.startsWith('sb-') || k.includes('supabase')
      )
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys)
      }
    } catch (storageErr) {
      console.error('Error clearing auth storage:', storageErr)
    }
  }
}

export default function SignOutButton() {
  return <Button title="Sign out" onPress={onSignOutButtonPress} />
}
