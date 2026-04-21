'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import api from '@/lib/api';

interface ClientAvatarProps {
  clientId: string;
  orgSlug: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onPhotoChange?: (newUrl: string) => void;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
};

export function ClientAvatar({
  clientId,
  orgSlug,
  firstName,
  lastName,
  photoUrl,
  size = 'md',
  editable = false,
  onPhotoChange,
}: ClientAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const displayUrl = localUrl || photoUrl;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Instant preview
    setLocalUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const { data } = await api.post(
        `/orgs/${orgSlug}/clients/${clientId}/photo`,
        form,
      );
      onPhotoChange?.(data.data.photo_url);
    } catch {
      setLocalUrl(null); // revert preview on failure
    } finally {
      setUploading(false);
    }
  }

  const baseClasses = `${sizeClasses[size]} rounded-full shrink-0 relative overflow-hidden`;

  if (displayUrl) {
    return (
      <div className={`${baseClasses} group`}>
        <img
          src={displayUrl.startsWith('blob:') || displayUrl.startsWith('http') ? displayUrl : `${apiBase}${displayUrl}`}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover rounded-full"
        />
        {editable && (
          <>
            <div
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-1/3 w-1/3 text-white" />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="h-1/3 w-1/3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold group`}>
      {initials}
      {editable && (
        <>
          <div
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-full"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="h-1/3 w-1/3 text-white" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </>
      )}
    </div>
  );
}
