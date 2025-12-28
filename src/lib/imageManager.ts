import { db } from './db';
import { requestImagesFolderAccess, verifyPermission, serializeHandle, deserializeHandle } from './fileSystem';

// Initialize images folder - ask user on first use
export async function initializeImagesFolder(): Promise<FileSystemDirectoryHandle | null> {
  // Check if already configured
  const settings = await db.settings.get(1);

  if (settings?.imagesFolderHandle) {
    const handle = await deserializeHandle(settings.imagesFolderHandle);
    if (handle && (await verifyPermission(handle as FileSystemDirectoryHandle, 'readwrite'))) {
      return handle as FileSystemDirectoryHandle;
    }
  }

  // Request new folder
  const handle = await requestImagesFolderAccess();
  if (!handle) return null;

  // Save to settings
  const handleId = await serializeHandle(handle);
  await db.settings.put({ id: 1, imagesFolderHandle: handleId });

  return handle;
}

// Add an image file (copy to images folder)
export async function addImage(
  versionId: number,
  sourceFile: File,
  caption: string | null
): Promise<void> {
  const imagesFolder = await initializeImagesFolder();
  if (!imagesFolder) {
    throw new Error('Images folder not configured');
  }

  // Create unique filename
  const timestamp = Date.now();
  const fileName = `${timestamp}_${sourceFile.name}`;

  // Write file to images folder
  const fileHandle = await imagesFolder.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(sourceFile);
  await writable.close();

  // Add to database
  await db.images.add({
    versionId,
    fileName,
    caption,
    createdAt: new Date().toISOString(),
  });
}

// Get image URL
export async function getImageURL(fileName: string): Promise<string | null> {
  const settings = await db.settings.get(1);
  if (!settings?.imagesFolderHandle) return null;

  const imagesFolder = await deserializeHandle(settings.imagesFolderHandle);
  if (!imagesFolder) return null;

  try {
    const fileHandle = await (imagesFolder as FileSystemDirectoryHandle).getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch (err) {
    console.error('Error loading image:', err);
    return null;
  }
}

// Delete image
export async function deleteImage(imageId: number): Promise<void> {
  const image = await db.images.get(imageId);
  if (!image) return;

  const settings = await db.settings.get(1);
  if (!settings?.imagesFolderHandle) {
    // Just remove from DB if folder not accessible
    await db.images.delete(imageId);
    return;
  }

  const imagesFolder = await deserializeHandle(settings.imagesFolderHandle);
  if (imagesFolder) {
    try {
      await (imagesFolder as FileSystemDirectoryHandle).removeEntry(image.fileName);
    } catch (err) {
      console.warn('Could not delete image file:', err);
    }
  }

  await db.images.delete(imageId);
}
