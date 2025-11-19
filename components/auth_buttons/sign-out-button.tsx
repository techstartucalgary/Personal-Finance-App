import { supabase } from '@/utils/supabase'
import React from 'react'
import { Button, Alert } from 'react-native'

async function onSignOutButtonPress() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    Alert.alert('Error signing out:', error.message)
    console.error('Error signing out:', error)
  }
}

export default function SignOutButton() {
  return <Button title="Sign out" onPress={onSignOutButtonPress} />
}