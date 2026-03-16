'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a blob URL for a student's document fetched through the authenticated proxy.
 * Returns null while loading, or empty string on error (so AvatarFallback shows).
 */
export function useAuthImage(studentId: number | string | undefined, type: 'profile_photo' | 'resume' = 'profile_photo') {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setBlobUrl('');
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    const fetchImage = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          if (!cancelled) setBlobUrl('');
          return;
        }

        const response = await fetch(
          `/api/proxy/storage?studentId=${encodeURIComponent(studentId)}&type=${encodeURIComponent(type)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (!cancelled) setBlobUrl('');
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch {
        if (!cancelled) setBlobUrl('');
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [studentId, type]);

  return blobUrl;
}

/**
 * Returns a blob URL for the current admin/coordinator's own profile photo.
 * Uses the profile_photo_url directly from the user context (already transformed by backend).
 */
export function useAdminProfileImage(profilePhotoUrl: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profilePhotoUrl) {
      setBlobUrl('');
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    const fetchImage = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          if (!cancelled) setBlobUrl('');
          return;
        }

        // For admin's own photo, the URL is already a public Caddy URL — use directly
        // This will work as long as /storage/* route is accessible
        const response = await fetch(profilePhotoUrl);

        if (!response.ok) {
          if (!cancelled) setBlobUrl('');
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch {
        if (!cancelled) setBlobUrl('');
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [profilePhotoUrl]);

  return blobUrl;
}
