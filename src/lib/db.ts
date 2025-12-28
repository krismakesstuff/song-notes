import Dexie, { Table } from 'dexie';
import { getFileSize } from './fileSystem';
import { getBaseFileName, findSmallestFormat, checkDurationMismatch } from './formatUtils';

// Type definitions matching current schema
export interface Song {
  id?: number;
  name: string;
  folderHandle: string; // Serialized FileSystemDirectoryHandle reference
  createdAt: string;
  sortPreference?: 'created' | 'name' | 'rating' | 'notes';
}

export interface VersionFormat {
  fileHandle: string;        // Serialized FileSystemFileHandle
  fileName: string;          // Original file name
  format: string;            // mp3, flac, wav, etc.
  bitrate: number | null;    // kbps
  duration: number | null;   // seconds
  fileSize: number;          // bytes
  modifiedAt: string;
}

export interface Version {
  id?: number;
  songId: number;
  versionName: string;       // Base name without extension
  formats: VersionFormat[];  // Array of format variants
  selectedFormatIndex: number; // Currently selected format
  hasDurationMismatch: boolean; // Warning flag for duration variance
  rating: number | null;
  createdAt: string;
  modifiedAt: string;
}

export interface Tag {
  id?: number;
  name: string;
  color: string;
}

export interface VersionTag {
  versionId: number;
  tagId: number;
}

export interface Note {
  id?: number;
  versionId: number;
  content: string;
  timestamp: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Image {
  id?: number;
  versionId: number;
  fileName: string; // Stored in user's images folder
  caption: string | null;
  createdAt: string;
}

export interface AppSettings {
  id?: number;
  imagesFolderHandle: string | null; // Serialized handle to images folder
}

export interface FileHandleRecord {
  id: string; // UUID
  handle: FileSystemHandle; // Actual handle object (stored via structured cloning)
}

// Database class
export class MusicNotesDB extends Dexie {
  songs!: Table<Song>;
  versions!: Table<Version>;
  tags!: Table<Tag>;
  versionTags!: Table<VersionTag>;
  notes!: Table<Note>;
  images!: Table<Image>;
  settings!: Table<AppSettings>;
  fileHandles!: Table<FileHandleRecord>;

  constructor() {
    super('MusicNotesDB');

    this.version(1).stores({
      songs: '++id, name, folderHandle, createdAt',
      versions: '++id, songId, fileHandle, fileName, rating, createdAt, modifiedAt',
      tags: '++id, &name, color',
      versionTags: '[versionId+tagId], versionId, tagId',
      notes: '++id, versionId, timestamp, createdAt',
      images: '++id, versionId, fileName, createdAt',
      settings: '++id',
      fileHandles: 'id',
    });

    // Version 2: Multi-format support
    this.version(2).stores({
      songs: '++id, name, folderHandle, createdAt',
      versions: '++id, songId, versionName, rating, createdAt, modifiedAt',
      tags: '++id, &name, color',
      versionTags: '[versionId+tagId], versionId, tagId',
      notes: '++id, versionId, timestamp, createdAt',
      images: '++id, versionId, fileName, createdAt',
      settings: '++id',
      fileHandles: 'id',
    }).upgrade(async (tx) => {
      // Migration logic: Transform v1 versions to v2 multi-format versions
      console.log('Starting database migration to version 2...');

      // Type for v1 version structure
      interface V1Version {
        id?: number;
        songId: number;
        fileHandle: string;
        fileName: string;
        rating: number | null;
        duration: number | null;
        bitrate: number | null;
        format: string | null;
        createdAt: string;
        modifiedAt: string;
      }

      try {
        // Get all v1 versions
        const oldVersions = await tx.table('versions').toArray() as V1Version[];
        console.log(`Migrating ${oldVersions.length} versions...`);

        // Group versions by songId and base filename
        const versionGroups = new Map<string, V1Version[]>();

        for (const oldVersion of oldVersions) {
          const baseName = getBaseFileName(oldVersion.fileName);
          const groupKey = `${oldVersion.songId}_${baseName}`;

          if (!versionGroups.has(groupKey)) {
            versionGroups.set(groupKey, []);
          }
          versionGroups.get(groupKey)!.push(oldVersion);
        }

        console.log(`Grouped into ${versionGroups.size} unique versions`);

        // Clear the versions table
        await tx.table('versions').clear();

        // Create new v2 versions
        const newVersionIdMap = new Map<number, number>(); // old ID -> new ID

        for (const [groupKey, groupVersions] of versionGroups.entries()) {
          const [songId, versionName] = groupKey.split('_');

          // Create formats array from grouped versions
          const formats: VersionFormat[] = [];

          for (const oldVersion of groupVersions) {
            // Try to get file size, default to 0 if we can't access the file
            let fileSize = 0;
            try {
              const handleRecord = await tx.table('fileHandles').get(oldVersion.fileHandle);
              if (handleRecord?.handle) {
                fileSize = await getFileSize(handleRecord.handle as FileSystemFileHandle);
              }
            } catch (error) {
              console.warn(`Could not get file size for ${oldVersion.fileName}:`, error);
            }

            formats.push({
              fileHandle: oldVersion.fileHandle,
              fileName: oldVersion.fileName,
              format: oldVersion.format || 'unknown',
              bitrate: oldVersion.bitrate,
              duration: oldVersion.duration,
              fileSize,
              modifiedAt: oldVersion.modifiedAt,
            });
          }

          // Find smallest format
          const selectedFormatIndex = findSmallestFormat(formats);

          // Check for duration mismatch
          const hasDurationMismatch = checkDurationMismatch(formats);

          // Use first version's metadata for shared fields
          const firstVersion = groupVersions[0];

          // Create new version
          const newVersionId = await tx.table('versions').add({
            songId: parseInt(songId),
            versionName,
            formats,
            selectedFormatIndex,
            hasDurationMismatch,
            rating: firstVersion.rating,
            createdAt: firstVersion.createdAt,
            modifiedAt: formats[selectedFormatIndex].modifiedAt,
          });

          // Map old IDs to new ID (for metadata migration)
          for (const oldVersion of groupVersions) {
            newVersionIdMap.set(oldVersion.id!, newVersionId as number);
          }
        }

        // Update version IDs in related tables (versionTags, notes, images)
        // For each old version ID, use the first occurrence's new version ID
        for (const [oldId, newId] of newVersionIdMap.entries()) {
          // Update versionTags
          const versionTags = await tx.table('versionTags')
            .where('versionId')
            .equals(oldId)
            .toArray();

          for (const vt of versionTags) {
            await tx.table('versionTags')
              .where({ versionId: oldId, tagId: vt.tagId })
              .modify({ versionId: newId });
          }

          // Update notes
          await tx.table('notes')
            .where('versionId')
            .equals(oldId)
            .modify({ versionId: newId });

          // Update images
          await tx.table('images')
            .where('versionId')
            .equals(oldId)
            .modify({ versionId: newId });
        }

        console.log('Migration complete!');
      } catch (error) {
        console.error('Migration error:', error);
        throw error;
      }
    });

    // Version 3: Add sortPreference field to songs
    this.version(3).stores({
      songs: '++id, name, folderHandle, createdAt, sortPreference',
      versions: '++id, songId, versionName, rating, createdAt, modifiedAt',
      tags: '++id, &name, color',
      versionTags: '[versionId+tagId], versionId, tagId',
      notes: '++id, versionId, timestamp, createdAt',
      images: '++id, versionId, fileName, createdAt',
      settings: '++id',
      fileHandles: 'id',
    }).upgrade(async (tx) => {
      // Set default sortPreference for existing songs
      await tx.table('songs').toCollection().modify(song => {
        song.sortPreference = 'created';
      });
    });

    // Add cascade delete hooks
    this.versions.hook('deleting', (primKey, obj) => {
      // Delete related versionTags
      this.versionTags.where('versionId').equals(obj.id!).delete();
      // Delete related notes
      this.notes.where('versionId').equals(obj.id!).delete();
      // Delete related images
      this.images.where('versionId').equals(obj.id!).delete();
    });

    this.songs.hook('deleting', (primKey, obj) => {
      // Delete related versions (which will trigger version cascade)
      this.versions.where('songId').equals(obj.id!).delete();
    });
  }
}

// Export singleton instance
export const db = new MusicNotesDB();

// Helper functions for complex queries
export async function getSongsWithVersions() {
  const songs = await db.songs.toArray();

  const songsWithVersions = await Promise.all(
    songs.map(async (song) => {
      const versions = await db.versions.where('songId').equals(song.id!).toArray();

      const versionsWithTags = await Promise.all(
        versions.map(async (version) => {
          const versionTagRecords = await db.versionTags
            .where('versionId')
            .equals(version.id!)
            .toArray();

          const tags = await Promise.all(
            versionTagRecords.map(vt => db.tags.get(vt.tagId))
          );

          const noteCount = await db.notes
            .where('versionId')
            .equals(version.id!)
            .count();

          return {
            ...version,
            tags: tags.filter(Boolean) as Tag[],
            noteCount,
          };
        })
      );

      return {
        ...song,
        versions: versionsWithTags,
      };
    })
  );

  return songsWithVersions;
}

export async function getVersionWithTags(versionId: number) {
  const version = await db.versions.get(versionId);
  if (!version) return null;

  const versionTagRecords = await db.versionTags
    .where('versionId')
    .equals(versionId)
    .toArray();

  const tags = await Promise.all(
    versionTagRecords.map(vt => db.tags.get(vt.tagId))
  );

  return {
    ...version,
    tags: tags.filter(Boolean) as Tag[],
  };
}

// Type aliases for components
export type SongWithVersions = Awaited<ReturnType<typeof getSongsWithVersions>>[0];
export type VersionWithTags = NonNullable<Awaited<ReturnType<typeof getVersionWithTags>>>;
