'use client';

import { useState } from 'react';

type Props = {
  name: string;
  multiple?: boolean;
  required?: boolean;
  className?: string;
};

async function compressImage(file: File): Promise<File> {
  const imageBitmap = await createImageBitmap(file);

  const maxSize = 2200;
  let { width, height } = imageBitmap;

  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height > width && height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  } else if (width === height && width > maxSize) {
    width = maxSize;
    height = maxSize;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Image compression failed'));
      },
      'image/webp',
      0.82
    );
  });

  return new File(
    [blob],
    file.name.replace(/\.[^.]+$/, '') + '.webp',
    { type: 'image/webp' }
  );
}

export function CompressedFileInput({
  name,
  multiple = false,
  required = false,
  className,
}: Props) {
  const [status, setStatus] = useState('');

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = Array.from(input.files || []);

    if (!files.length) return;

    setStatus('Compressing images...');

    try {
      const compressedFiles = await Promise.all(
        files.map((file) => compressImage(file))
      );

      const dataTransfer = new DataTransfer();

      compressedFiles.forEach((file) => {
        dataTransfer.items.add(file);
      });

      input.files = dataTransfer.files;

      const before = files.reduce((sum, file) => sum + file.size, 0);
      const after = compressedFiles.reduce((sum, file) => sum + file.size, 0);

      setStatus(
        `Compressed ${files.length} image(s): ${(before / 1024 / 1024).toFixed(
          1
        )}MB → ${(after / 1024 / 1024).toFixed(1)}MB`
      );
    } catch (err) {
      console.error(err);
      setStatus('Compression failed. Please use JPG, PNG, or WEBP.');
      input.value = '';
    }
  }

  return (
    <div>
      <input
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        required={required}
        className={className}
        onChange={handleChange}
      />

      {status && (
        <p className="text-[10px] text-bayern-muted mt-1">
          {status}
        </p>
      )}
    </div>
  );
}
