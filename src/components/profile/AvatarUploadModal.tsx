import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImageUp, Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import FormError from '../common/FormError';
import InfoCallout from '../common/InfoCallout';
import Avatar from '../common/Avatar';
import { removeAvatar, uploadAvatar } from '../../services/avatarService';
import { AVATAR_SIZE, centerSquareCrop, validateAvatarFile } from '../../utils/avatar';
import { PROFESSIONAL_ROLES } from '../../services/professionalService';
import type { AppRole } from '../../types/User';

interface AvatarUploadModalProps {
  userId: string;
  name: string;
  role: AppRole;
  avatarPath: string | null;
  // true si es la foto de quien está usando el panel.
  isOwn: boolean;
  onClose: () => void;
  onChanged: (path: string | null) => void;
}

// Recorta el centro en cuadrado y lo reduce a AVATAR_SIZE px en JPG.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, size } = centerSquareCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Tu navegador no pudo preparar la foto. Prueba con otro.');
  }
  // JPG no tiene transparencia: sin fondo, un PNG transparente quedaría negro.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto. Prueba con otra.'))),
      'image/jpeg',
      0.86,
    );
  });
}

function AvatarUploadModal({ userId, name, role, avatarPath, isOwn, onClose, onChanged }: AvatarUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Libera la vista previa al cambiarla o al cerrar.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isProfessional = PROFESSIONAL_ROLES.includes(role);
  const firstName = name.trim().split(/\s+/)[0] ?? name;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setIsPreparing(true);
    try {
      const prepared = await toSquareJpeg(file);
      setPhoto(prepared);
      setPreviewUrl(URL.createObjectURL(prepared));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la imagen. Prueba con otra.');
    } finally {
      setIsPreparing(false);
    }
  };

  const handleSave = async () => {
    if (!photo) return;
    setError(null);
    setIsSaving(true);
    try {
      const path = await uploadAvatar(userId, photo);
      onChanged(path);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la foto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await removeAvatar(userId);
      onChanged(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar la foto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isOwn ? 'Mi foto de perfil' : `Foto de ${name}`}
      maxWidth="max-w-[460px]"
      footer={
        <>
          <Button type="button" variant="admin-outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" variant="admin-solid" onClick={handleSave} disabled={!photo || isSaving || isPreparing}>
            {isSaving && photo ? 'Guardando…' : 'Guardar foto'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-3">
        <InfoCallout icon={Camera} title={isOwn ? 'Así te verá el equipo.' : `Así verá el equipo a ${firstName}.`}>
          {isProfessional
            ? 'También sale en la página principal, en "Quién te va a atender".'
            : 'Se muestra en el panel y en Equipo.'}
        </InfoCallout>

        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-adm-line-field px-4 py-6">
          {previewUrl ? (
            <img src={previewUrl} alt="Vista previa de la foto" className="h-36 w-36 rounded-full object-cover shadow-soft" />
          ) : (
            <Avatar name={name} path={avatarPath} className="h-36 w-36 text-4xl" />
          )}
          <p className="text-center text-[13px] text-adm-ink-400">
            {previewUrl ? 'Vista previa: así quedará.' : 'Usa una foto de frente, con buena luz. Se recorta en círculo.'}
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Elegir foto"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="admin-outline"
            icon={<ImageUp size={16} />}
            disabled={isSaving || isPreparing}
            onClick={() => inputRef.current?.click()}
          >
            {isPreparing ? 'Preparando…' : previewUrl || avatarPath ? 'Elegir otra foto' : 'Elegir foto'}
          </Button>
          <p className="text-xs text-adm-ink-300">JPG, PNG o WebP, hasta 10 MB.</p>
        </div>

        <FormError message={error} />

        {avatarPath && !previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isSaving}
            className="flex min-h-11 items-center justify-center gap-2 self-center rounded-[9px] px-3 text-sm font-medium text-adm-danger-text transition-colors hover:bg-adm-status-cancelled-bg disabled:opacity-50 sm:min-h-9"
          >
            <Trash2 size={15} />
            {isSaving ? 'Quitando…' : 'Quitar foto'}
          </button>
        )}
      </div>
    </Modal>
  );
}

export default AvatarUploadModal;
