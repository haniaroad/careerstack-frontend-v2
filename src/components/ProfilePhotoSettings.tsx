import { useId, useRef, useState } from 'react'
import { ProfilePhoto } from '@/components/ProfilePhoto'
import { ApiError } from '@/lib/api'
import { removeProfilePhoto, uploadProfilePhoto, type ProfilePayload } from '@/lib/profiles'
import { cn } from '@/lib/utils'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function ProfilePhotoSettings({
  name,
  imageUrl,
  onChanged,
}: {
  name: string
  imageUrl: string | null
  onChanged: (profile: ProfilePayload) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const choose = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      setError('Use a JPEG, PNG, WebP, or GIF.')
      setMessage(null)
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Photo must be 5 MB or smaller.')
      setMessage(null)
      return
    }
    setPending(true)
    setError(null)
    try {
      const profile = await uploadProfilePhoto(file)
      onChanged(profile)
      setMessage('Profile photo saved.')
    } catch (err) {
      setMessage(null)
      setError(err instanceof ApiError ? err.message : 'That photo could not be saved.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="profile-photo-heading" className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 id="profile-photo-heading" className="text-sm font-semibold text-ink">
        Profile photo
      </h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
        Optional. People who can open your profile see it there, in Explore, and on your profile menu.
        Everyone else keeps seeing your initials.
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <ProfilePhoto
          name={name}
          imageUrl={imageUrl}
          size="lg"
          alt={imageUrl ? 'Current profile photo' : ''}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">
            JPEG, PNG, WebP, or GIF. Up to 5 MB. CareerStack crops the photo to a square and removes
            location data from the image it shows.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground',
                focusRing,
              )}
              onClick={() => inputRef.current?.click()}
            >
              {imageUrl ? 'Replace photo' : 'Upload photo'}
            </button>
            {imageUrl ? (
              <button
                type="button"
                disabled={pending}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground',
                  focusRing,
                )}
                onClick={() => {
                  setPending(true)
                  setError(null)
                  void removeProfilePhoto()
                    .then((profile) => {
                      onChanged(profile)
                      setMessage('Profile photo removed.')
                      if (inputRef.current) inputRef.current.value = ''
                    })
                    .catch((err: unknown) => {
                      setMessage(null)
                      setError(err instanceof ApiError ? err.message : 'That photo could not be removed.')
                    })
                    .finally(() => setPending(false))
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            id={inputId}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Profile photo"
            onChange={(event) => {
              void choose(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-sm text-ink">
        {error ?? message ?? ''}
      </p>
    </section>
  )
}
