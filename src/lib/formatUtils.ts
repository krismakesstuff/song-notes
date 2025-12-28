import { VersionFormat } from './db';

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 1
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${mb.toFixed(1)} MB`;
}

/**
 * Create a formatted label for a version format
 * Example: "FLAC (24.5 MB, 1411 kbps)"
 */
export function formatFormatLabel(format: VersionFormat): string {
  const size = formatFileSize(format.fileSize);
  return `${format.format.toUpperCase()} (${size}, ${format.bitrate || '?'} kbps)`;
}

/**
 * Check if formats have mismatched durations (>5% variance)
 * Returns true if there's significant duration mismatch
 */
export function checkDurationMismatch(formats: VersionFormat[]): boolean {
  if (formats.length < 2) return false;

  const durations = formats
    .map(f => f.duration)
    .filter(d => d !== null) as number[];

  if (durations.length < 2) return false;

  const max = Math.max(...durations);
  const min = Math.min(...durations);
  const variance = (max - min) / max;

  return variance > 0.05; // >5% difference
}

/**
 * Find the index of the smallest format by file size
 */
export function findSmallestFormat(formats: VersionFormat[]): number {
  if (formats.length === 0) return 0;

  let smallestIndex = 0;
  let smallestSize = formats[0].fileSize;

  for (let i = 1; i < formats.length; i++) {
    if (formats[i].fileSize < smallestSize) {
      smallestSize = formats[i].fileSize;
      smallestIndex = i;
    }
  }

  return smallestIndex;
}

/**
 * Extract base filename without extension
 * Example: "song-v1.mp3" → "song-v1"
 */
export function getBaseFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}
