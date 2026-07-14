'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleUserRound, Pencil, Upload, X } from 'lucide-react';
import type { GradeLevel, UserProfile } from '@/lib/types';
import { gradeLevelLabel } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const gradeOptions: Array<{ value: GradeLevel; label: string }> = [
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
  { value: 'university', label: 'University / Adult' }
];

type Props = {
  profile: UserProfile;
  guest?: boolean;
};

export function ProfileHeader({ profile, guest }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(profile.gradeLevel);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase = createSupabaseBrowserClient();

  function startEditing() {
    setDisplayName(profile.displayName);
    setGradeLevel(profile.gradeLevel);
    setAvatarPreview(profile.avatarUrl);
    setAvatarFile(null);
    setError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(profile.avatarUrl);
    setError('');
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      return;
    }
    setError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      let avatarUrl: string | undefined;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, {
          contentType: avatarFile.type,
          upsert: true
        });

        if (uploadError) {
          setError(uploadError.message || 'Could not upload image.');
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = publicUrlData.publicUrl;
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          gradeLevel,
          ...(avatarUrl ? { avatarUrl } : {})
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Could not save your changes.');
        setSaving(false);
        return;
      }

      setIsEditing(false);
      setSaving(false);
      router.refresh();
    } catch (err) {
      console.error('Profile save failed:', err);
      setError(err instanceof Error ? err.message : 'Could not save your changes.');
      setSaving(false);
    }
  }

  return (
    <div className="card pad" style={{ minHeight: 250, display: 'grid', gap: 18, alignContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 124,
              height: 124,
              borderRadius: 999,
              background: 'linear-gradient(180deg, #e0e7ff, #bfdbfe)',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              border: '4px solid white',
              boxShadow: '0 12px 30px rgba(0,0,0,0.08)'
            }}
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <CircleUserRound size={56} color="var(--primary)" />
            )}
          </div>

          {isEditing && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Upload profile picture"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--primary)',
                color: 'white',
                border: '3px solid white'
              }}
            >
              <Upload size={16} />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        <div style={{ display: 'grid', gap: 12, flex: 1, minWidth: 240 }}>
          <span className="badge success" style={{ width: 'fit-content' }}>
            {guest ? 'Guest Learner' : 'Premium Member'}
          </span>

          {isEditing ? (
            <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
              <div className="form-row">
                <label className="field-label">Display Name</label>
                <input
                  className="input input-lg"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="form-row">
                <label className="field-label">Grade Level</label>
                <select className="select" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value as GradeLevel)}>
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="badge warning" style={{ justifyContent: 'space-between' }}>
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="button-primary" type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="button-secondary" type="button" disabled={saving} onClick={cancelEditing}>
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 3vw, 3.6rem)', letterSpacing: '-0.04em' }}>
                {profile.displayName}
              </h1>
              <p className="muted" style={{ margin: 0, fontSize: 18 }}>
                {guest
                  ? 'Explore a limited demo experience before signing in.'
                  : `Empowering my journey in ${gradeLevelLabel(profile.gradeLevel)} learning.`}
              </p>
              {!guest ? (
                <button className="button-primary" type="button" style={{ width: 'fit-content', minWidth: 180 }} onClick={startEditing}>
                  <Pencil size={16} />
                  Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/auth" className="button-primary">
                    Sign Up Free
                  </Link>
                  <Link href="/auth" className="button-secondary">
                    Sign In
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
