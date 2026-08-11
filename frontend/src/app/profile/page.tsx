"use client"

import ProfileEditor from "@/components/profile/ProfileEditor"
import ShowcaseProfilePreview from "@/components/preview/ShowcaseProfilePreview"
import { useShowcaseMode } from "@/hooks/useShowcaseMode"

export default function ProfilePage() {
  const showcaseMode = useShowcaseMode()

  // Temporarily force preview for testing
  return <ShowcaseProfilePreview />

  return <ProfileEditor />
}
