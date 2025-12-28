import { create } from 'zustand';
import { Tag, Note, Image, SongWithVersions, VersionWithTags } from '@shared/types';

/**
 * Main application state store using Zustand
 */

interface AppState {
  // Data
  songs: SongWithVersions[];
  tags: Tag[];
  selectedSong: SongWithVersions | null;
  selectedVersion: VersionWithTags | null;
  notes: Note[];
  images: Image[];

  // UI state
  isLoading: boolean;
  error: string | null;
  playingVersionId: number | null;
  seekRequest: { versionId: number; time: number } | null;

  // Actions
  setSongs: (songs: SongWithVersions[]) => void;
  setTags: (tags: Tag[]) => void;
  setSelectedSong: (song: SongWithVersions | null) => void;
  setSelectedVersion: (version: VersionWithTags | null) => void;
  setNotes: (notes: Note[]) => void;
  setImages: (images: Image[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPlayingVersionId: (versionId: number | null) => void;
  requestSeek: (versionId: number, time: number) => void;

  // Helper actions
  addSong: (song: SongWithVersions) => void;
  removeSong: (songId: number) => void;
  addTag: (tag: Tag) => void;
  updateVersionRating: (versionId: number, rating: number | null) => void;
  updateVersionFormat: (versionId: number, formatIndex: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  songs: [],
  tags: [],
  selectedSong: null,
  selectedVersion: null,
  notes: [],
  images: [],
  isLoading: false,
  error: null,
  playingVersionId: null,
  seekRequest: null,

  // Actions
  setSongs: (songs) => set({ songs }),
  setTags: (tags) => set({ tags }),
  setSelectedSong: (song) => set({ selectedSong: song, selectedVersion: null }),
  setSelectedVersion: (version) => set({ selectedVersion: version }),
  setNotes: (notes) => set({ notes }),
  setImages: (images) => set({ images }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setPlayingVersionId: (versionId) => set({ playingVersionId: versionId }),
  requestSeek: (versionId, time) => set({ seekRequest: { versionId, time } }),

  // Helper actions
  addSong: (song) => set((state) => ({ songs: [...state.songs, song] })),

  removeSong: (songId) => set((state) => ({
    songs: state.songs.filter((s) => s.id !== songId),
    selectedSong: state.selectedSong?.id === songId ? null : state.selectedSong,
    selectedVersion: state.selectedSong?.id === songId ? null : state.selectedVersion,
  })),

  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),

  updateVersionRating: (versionId, rating) => set((state) => ({
    songs: state.songs.map((song) => ({
      ...song,
      versions: song.versions.map((v) =>
        v.id === versionId ? { ...v, rating } : v
      ),
    })),
    selectedVersion: state.selectedVersion?.id === versionId
      ? { ...state.selectedVersion, rating }
      : state.selectedVersion,
  })),

  updateVersionFormat: (versionId, formatIndex) => set((state) => ({
    songs: state.songs.map((song) => ({
      ...song,
      versions: song.versions.map((v) =>
        v.id === versionId ? { ...v, selectedFormatIndex: formatIndex } : v
      ),
    })),
    selectedVersion: state.selectedVersion?.id === versionId
      ? { ...state.selectedVersion, selectedFormatIndex: formatIndex }
      : state.selectedVersion,
  })),
}));
