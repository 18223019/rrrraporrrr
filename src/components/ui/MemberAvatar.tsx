/**
 * MemberAvatar — urutan sumber foto:
 * 1. Foto custom dari Cloudflare (/api/avatar/<username>)
 * 2. Foto lokal di src/data/memberPhotos.ts (kalau ada)
 * 3. Inisial nama
 */

import React from 'react';
import { getAvatarUrl, getAvatarVersion, subscribeAvatarVersion } from '../../services/avatar';
import { getMemberPhoto } from '../../data/memberPhotos';
import { getInitials } from '../../services/userService';

interface MemberAvatarProps {
  username: string;
  name?: string;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  username,
  name,
  className,
  imageClassName,
  style,
}) => {
  const version = React.useSyncExternalStore(subscribeAvatarVersion, getAvatarVersion, () => '');
  const sources = React.useMemo(() => {
    const list: string[] = [];
    if (username) list.push(getAvatarUrl(username, version));
    const local = getMemberPhoto({ username, name });
    if (local) list.push(local);
    return list;
  }, [username, name, version]);

  const [sourceIndex, setSourceIndex] = React.useState(0);
  React.useEffect(() => setSourceIndex(0), [sources]);

  const src = sources[sourceIndex];
  const initials = getInitials(name || username || 'U') || 'U';

  return (
    <div className={className} style={style}>
      {src ? (
        <img
          key={src}
          src={src}
          alt={name || username}
          className={imageClassName}
          style={imageClassName ? undefined : { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setSourceIndex((index) => index + 1)}
        />
      ) : (
        initials
      )}
    </div>
  );
};
