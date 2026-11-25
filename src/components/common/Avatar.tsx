import { useState } from 'react';
import { getAvatarUrl } from '../../services/avatarService';
import { getInitials } from '../../utils/format';

interface AvatarProps {
  name: string;
  // Ruta en el bucket "avatars"; sin foto se muestran las iniciales.
  path: string | null | undefined;
  // Tamaño y tipografía, p. ej. "h-12 w-12 text-sm".
  className?: string;
}

// Foto de perfil redonda; si no hay foto (o no carga), las iniciales.
function Avatar({ name, path, className = 'h-10 w-10 text-sm' }: AvatarProps) {
  const url = getAvatarUrl(path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = url !== null && failedUrl !== url;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dceef0] font-semibold text-adm-accent-deep ${className}`}
    >
      {showPhoto ? (
        <img src={url} alt={`Foto de ${name}`} className="h-full w-full object-cover" onError={() => setFailedUrl(url)} />
      ) : (
        <span aria-hidden="true">{getInitials(name) || '?'}</span>
      )}
    </span>
  );
}

export default Avatar;
