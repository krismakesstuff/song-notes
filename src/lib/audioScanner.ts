import { parseBlob } from 'music-metadata';
import { db, VersionFormat } from './db';
import { scanDirectoryForAudioFiles, getFileFromHandle, serializeHandle, getFileSize } from './fileSystem';
import { getBaseFileName, findSmallestFormat, checkDurationMismatch } from './formatUtils';

export async function scanAndAddAudioFiles(
  dirHandle: FileSystemDirectoryHandle,
  songId: number
): Promise<void> {
  const audioFileHandles = await scanDirectoryForAudioFiles(dirHandle);

  // Group files by base filename
  const groupedFiles = new Map<string, FileSystemFileHandle[]>();

  for (const fileHandle of audioFileHandles) {
    const baseName = getBaseFileName(fileHandle.name);
    if (!groupedFiles.has(baseName)) {
      groupedFiles.set(baseName, []);
    }
    groupedFiles.get(baseName)!.push(fileHandle);
  }

  // Create or update version for each group
  for (const [versionName, handles] of groupedFiles.entries()) {
    // Check if version already exists
    const existing = await db.versions
      .where({ songId, versionName })
      .first();

    if (existing) {
      // Check if any new formats need to be added
      await addNewFormatsToVersion(existing, handles);
    } else {
      // Create new version with all formats
      await createVersionWithFormats(songId, versionName, handles);
    }
  }
}

async function createVersionWithFormats(
  songId: number,
  versionName: string,
  handles: FileSystemFileHandle[]
): Promise<void> {
  const formats: VersionFormat[] = [];

  for (const fileHandle of handles) {
    const formatData = await extractFormatMetadata(fileHandle);
    if (formatData) {
      formats.push(formatData);
    }
  }

  if (formats.length === 0) return;

  // Find smallest format for default selection
  const selectedFormatIndex = findSmallestFormat(formats);

  // Check for duration mismatch
  const hasDurationMismatch = checkDurationMismatch(formats);

  // Add to database
  await db.versions.add({
    songId,
    versionName,
    formats,
    selectedFormatIndex,
    hasDurationMismatch,
    rating: null,
    createdAt: new Date().toISOString(),
    modifiedAt: formats[selectedFormatIndex].modifiedAt,
  });
}

async function addNewFormatsToVersion(
  version: any,
  handles: FileSystemFileHandle[]
): Promise<void> {
  const existingHandleIds = new Set(version.formats.map((f: VersionFormat) => f.fileHandle));
  const newFormats: VersionFormat[] = [...version.formats];
  let hasNewFormats = false;

  for (const fileHandle of handles) {
    const handleId = await serializeHandle(fileHandle);

    // Skip if this format already exists
    if (existingHandleIds.has(handleId)) continue;

    const formatData = await extractFormatMetadata(fileHandle);
    if (formatData) {
      newFormats.push(formatData);
      hasNewFormats = true;
    }
  }

  if (hasNewFormats) {
    // Recalculate default format (smallest)
    const selectedFormatIndex = findSmallestFormat(newFormats);

    // Recalculate duration mismatch
    const hasDurationMismatch = checkDurationMismatch(newFormats);

    // Update version
    await db.versions.update(version.id!, {
      formats: newFormats,
      selectedFormatIndex,
      hasDurationMismatch,
      modifiedAt: new Date().toISOString(),
    });
  }
}

async function extractFormatMetadata(fileHandle: FileSystemFileHandle): Promise<VersionFormat | null> {
  try {
    const file = await getFileFromHandle(fileHandle);
    const handleId = await serializeHandle(fileHandle);
    const fileSize = await getFileSize(fileHandle);

    // Extract audio metadata
    const audioMetadata = await extractAudioMetadata(file);

    return {
      fileHandle: handleId,
      fileName: fileHandle.name,
      format: audioMetadata.format,
      bitrate: audioMetadata.bitrate,
      duration: audioMetadata.duration,
      fileSize,
      modifiedAt: new Date(file.lastModified).toISOString(),
    };
  } catch (error) {
    console.error(`Error extracting format metadata for ${fileHandle.name}:`, error);
    return null;
  }
}

async function extractAudioMetadata(file: File) {
  try {
    const metadata = await parseBlob(file);
    return {
      duration: metadata.format.duration || null,
      bitrate: metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : null,
      format: metadata.format.container || file.name.slice(file.name.lastIndexOf('.') + 1),
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {
      duration: null,
      bitrate: null,
      format: file.name.slice(file.name.lastIndexOf('.') + 1),
    };
  }
}
