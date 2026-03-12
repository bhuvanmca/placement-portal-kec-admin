'use client';

import { useAuthImage } from '@/hooks/use-auth-image';
import { AvatarImage } from '@/components/ui/avatar';

interface StudentAvatarImageProps {
  studentId: number | string | undefined;
  className?: string;
}

export function StudentAvatarImage({ studentId, className }: StudentAvatarImageProps) {
  const blobUrl = useAuthImage(studentId, 'profile_photo');

  if (!blobUrl) return null; // triggers AvatarFallback

  return <AvatarImage src={blobUrl} className={className} />;
}
