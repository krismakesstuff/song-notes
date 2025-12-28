import { db } from './db';

// Browser compatibility check
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window && 'showOpenFilePicker' in window;
}

// Request permission to access a directory
export async function requestFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'read',
    });
    return dirHandle;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('User cancelled folder selection');
      return null;
    }
    console.error('Error selecting folder:', err);
    throw err;
  }
}

// Request permission to access a directory for writing (images)
export async function requestImagesFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
    return dirHandle;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

// Serialize directory handle for storage in IndexedDB
export async function serializeHandle(handle: FileSystemHandle): Promise<string> {
  // IndexedDB can store FileSystemHandle directly using structured cloning
  // We'll store the handle in a separate object store and return a reference ID
  const handleId = crypto.randomUUID();

  await db.fileHandles.add({ id: handleId, handle });

  return handleId;
}

// Deserialize handle from IndexedDB
export async function deserializeHandle(handleId: string): Promise<FileSystemHandle | null> {
  const record = await db.fileHandles.get(handleId);
  return record?.handle || null;
}

// Verify we still have permission to access a handle
export async function verifyPermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'read'
): Promise<boolean> {
  const options = { mode };

  // Check if permission was already granted
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

// Get file from handle
export async function getFileFromHandle(fileHandle: FileSystemFileHandle): Promise<File> {
  return await fileHandle.getFile();
}

// Get file size in bytes
export async function getFileSize(fileHandle: FileSystemFileHandle): Promise<number> {
  const file = await fileHandle.getFile();
  return file.size;
}

// Get all audio files in a directory
export async function scanDirectoryForAudioFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<FileSystemFileHandle[]> {
  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];
  const audioFiles: FileSystemFileHandle[] = [];

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
      if (AUDIO_EXTENSIONS.includes(ext)) {
        audioFiles.push(entry as FileSystemFileHandle);
      }
    }
  }

  return audioFiles;
}

// Create a blob URL for audio playback
export async function createAudioURL(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
}

// Request access to select an image file
export async function requestImageFile(): Promise<File | null> {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Images',
          accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
          }
        }
      ],
      multiple: false,
    });

    if (!fileHandle) return null;

    return await fileHandle.getFile();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}
