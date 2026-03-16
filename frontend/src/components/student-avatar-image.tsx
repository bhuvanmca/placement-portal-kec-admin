"use client";

import { AvatarImage } from "@/components/ui/avatar";

interface StudentAvatarImageProps {
  profilePhotoUrl?: string;
  className?: string;
}

export function StudentAvatarImage({
  profilePhotoUrl,
  className,
}: StudentAvatarImageProps) {
  if (!profilePhotoUrl) return null; // triggers AvatarFallback

  return <AvatarImage src={profilePhotoUrl} className={className} />;
}
