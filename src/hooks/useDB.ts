import { db, getSongsWithVersions } from '@lib/db';
import * as audioScanner from '@lib/audioScanner';
import * as imageManager from '@lib/imageManager';
import { requestFolderAccess, serializeHandle, requestImageFile } from '@lib/fileSystem';

/**
 * Database operations hook - replaces IPC
 * Provides all the same operations that were IPC handlers
 */
export function useDB() {
  return {
    // Song operations
    getSongs: async () => {
      return await getSongsWithVersions();
    },

    addSongFolder: async () => {
      const dirHandle = await requestFolderAccess();
      if (!dirHandle) return null;

      const folderName = dirHandle.name;
      const handleId = await serializeHandle(dirHandle);

      // Check if already exists
      const existing = await db.songs.where('folderHandle').equals(handleId).first();
      if (existing) return existing;

      // Add to database
      const songId = await db.songs.add({
        name: folderName,
        folderHandle: handleId,
        createdAt: new Date().toISOString(),
      });

      // Scan for audio files
      await audioScanner.scanAndAddAudioFiles(dirHandle, songId);

      const song = await db.songs.get(songId);
      return song || null;
    },

    removeSong: async (songId: number) => {
      await db.songs.delete(songId);
      return true;
    },

    updateSongSortPreference: async (songId: number, sortPreference: string) => {
      await db.songs.update(songId, { sortPreference });
      return true;
    },

    // Version operations
    updateVersionRating: async (versionId: number, rating: number | null) => {
      await db.versions.update(versionId, { rating });
      return true;
    },

    updateVersionFormat: async (versionId: number, formatIndex: number) => {
      await db.versions.update(versionId, { selectedFormatIndex: formatIndex });
      return true;
    },

    // Tag operations
    getTags: async () => {
      return await db.tags.toArray();
    },

    createTag: async (name: string, color: string) => {
      const id = await db.tags.add({ name, color });
      return await db.tags.get(id);
    },

    addTagToVersion: async (versionId: number, tagId: number) => {
      await db.versionTags.add({ versionId, tagId });
      return true;
    },

    removeTagFromVersion: async (versionId: number, tagId: number) => {
      await db.versionTags.where({ versionId, tagId }).delete();
      return true;
    },

    // Note operations
    getNotes: async (versionId: number) => {
      return await db.notes.where('versionId').equals(versionId).toArray();
    },

    createNote: async (versionId: number, content: string, timestamp: number | null) => {
      const id = await db.notes.add({
        versionId,
        content,
        timestamp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return await db.notes.get(id);
    },

    updateNote: async (noteId: number, content: string) => {
      await db.notes.update(noteId, {
        content,
        updatedAt: new Date().toISOString(),
      });
      return true;
    },

    deleteNote: async (noteId: number) => {
      await db.notes.delete(noteId);
      return true;
    },

    // Image operations
    getImages: async (versionId: number) => {
      return await db.images.where('versionId').equals(versionId).toArray();
    },

    addImage: async (versionId: number, caption: string | null) => {
      const file = await requestImageFile();
      if (!file) return false;

      await imageManager.addImage(versionId, file, caption);
      return true;
    },

    deleteImage: async (imageId: number) => {
      await imageManager.deleteImage(imageId);
      return true;
    },
  };
}
