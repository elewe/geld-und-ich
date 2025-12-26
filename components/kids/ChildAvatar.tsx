// INDEX: components/kids/ChildAvatar.tsx
'use client'

import Image from 'next/image'
import { getAccentClasses } from './avatar'

type Props = {
  name?: string | null
  avatar_mode?: 'emoji' | 'image' | null
  avatar_emoji?: string | null
  avatar_image_url?: string | null
  accent_color?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap: Record<NonNullable<Props['size']>, { box: string; img: number; font: string }> = {
  sm: { box: 'h-10 w-10 text-lg', img: 40, font: 'text-lg' },
  md: { box: 'h-12 w-12 text-xl', img: 48, font: 'text-xl' },
  lg: { box: 'h-16 w-16 text-2xl', img: 64, font: 'text-3xl' },
}

export function ChildAvatar({
  name,
  avatar_mode = 'emoji',
  avatar_emoji = '🧒',
  avatar_image_url,
  accent_color = 'slate',
  size = 'md',
}: Props) {
  const accent = getAccentClasses(accent_color ?? 'slate')
  const sizing = sizeMap[size]
  const showImage = avatar_mode === 'image' && avatar_image_url

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ring-2 ring-offset-2 ${accent.ring} ${accent.bg} ${sizing.box}`}>
      {showImage ? (
        <Image
          src={avatar_image_url!}
          alt={name ? `${name} Avatar` : 'Kind Avatar'}
          width={sizing.img}
          height={sizing.img}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className={`${sizing.font}`} aria-hidden>
          {avatar_emoji || '🧒'}
        </span>
      )}
      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${accent.dot}`} />
    </div>
  )
}
