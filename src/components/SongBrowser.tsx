import { useAppStore } from '../store/appStore';
import { useDB } from '@hooks/useDB';
import { Music, Star, Trash2, ChevronDown, ChevronRight, AlertTriangle, Plus, FileText } from 'lucide-react';
import { useState } from 'react';
import { SongWithVersions, VersionWithTags } from '@types';

/**
 * Song browser component - displays songs and their versions in a tree structure
 */
interface SongBrowserProps {
  onAddSongFolder: () => void;
}

export default function SongBrowser({ onAddSongFolder }: SongBrowserProps) {
  const { songs, selectedVersion, setSelectedVersion, setSelectedSong, setNotes, setImages, removeSong, setSongs } = useAppStore();
  const dbOps = useDB();
  const [expandedSongs, setExpandedSongs] = useState<Set<number>>(new Set());

  const toggleSong = (songId: number) => {
    const newExpanded = new Set(expandedSongs);
    if (newExpanded.has(songId)) {
      newExpanded.delete(songId);
    } else {
      newExpanded.add(songId);
    }
    setExpandedSongs(newExpanded);
  };

  const handleSelectVersion = async (song: SongWithVersions, version: VersionWithTags) => {
    setSelectedSong(song);
    setSelectedVersion(version);

    // Load notes and images for this version
    try {
      const [notes, images] = await Promise.all([
        dbOps.getNotes(version.id),
        dbOps.getImages(version.id),
      ]);
      setNotes(notes);
      setImages(images);
    } catch (error) {
      console.error('Failed to load version details:', error);
    }
  };

  const handleDeleteSong = async (songId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this song? This will not delete the files.')) {
      try {
        await dbOps.removeSong(songId);
        removeSong(songId);
      } catch (error) {
        console.error('Failed to remove song:', error);
      }
    }
  };

  const handleSortChange = async (songId: number, sortPreference: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dbOps.updateSongSortPreference(songId, sortPreference);
      const updatedSongs = await dbOps.getSongs();
      setSongs(updatedSongs);
    } catch (error) {
      console.error('Failed to update sort preference:', error);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
          />
        ))}
      </div>
    );
  };

  if (songs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 text-gray-500 text-center">
          <div>
            <Music size={48} className="mx-auto mb-2 opacity-50" />
            <p>No songs yet</p>
            <p className="text-sm mt-1">Click "Add Song Folder" to get started</p>
          </div>
        </div>
        <div className="border-t border-gray-700 p-2">
          <button
            onClick={onAddSongFolder}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add Song Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
      {songs.map((song) => {
        const isExpanded = expandedSongs.has(song.id);

        return (
          <div key={song.id} className="mb-4">
            {/* Song header */}
            <div
              className="flex items-center gap-2 px-2 py-2 hover:bg-gray-800 rounded cursor-pointer group border-b border-gray-700/50"
              onClick={() => toggleSong(song.id)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Music size={16} className="text-primary-500" />
              <span className="flex-1 font-medium truncate">{song.name}</span>
              <select
                value={song.sortPreference || 'created'}
                onChange={(e) => handleSortChange(song.id, e.target.value, e as any)}
                onClick={(e) => e.stopPropagation()}
                className="select-styled text-xs pl-2 py-0.5 min-w-[70px]"
              >
                <option value="created">Date</option>
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="notes">Notes</option>
              </select>
              <span className="text-xs text-gray-500">{song.versions.length}</span>
              <button
                onClick={(e) => handleDeleteSong(song.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Version list */}
            {isExpanded && (
              <div className="ml-6 mt-2">
                {song.versions.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-gray-500">No versions found</div>
                ) : (
                  (() => {
                    const sortedVersions = [...song.versions].sort((a, b) => {
                      switch (song.sortPreference) {
                        case 'name':
                          return a.versionName.localeCompare(b.versionName);
                        case 'rating':
                          return (b.rating || 0) - (a.rating || 0);
                        case 'notes':
                          return (b.noteCount || 0) - (a.noteCount || 0);
                        case 'created':
                        default:
                          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      }
                    });
                    return sortedVersions;
                  })().map((version) => (
                    <div
                      key={version.id}
                      className={`px-2 py-2 rounded cursor-pointer hover:bg-gray-800 mb-2 ${
                        selectedVersion?.id === version.id ? 'bg-gray-800 border-l-2 border-primary-500' : ''
                      }`}
                      onClick={() => handleSelectVersion(song, version)}
                    >
                      <div className="text-sm truncate flex items-center gap-2">
                        <span>{version.versionName}</span>
                        {version.noteCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <FileText size={12} />
                            {version.noteCount}
                          </span>
                        )}
                        {version.formats && version.formats.length > 1 && (
                          <span className="text-xs text-gray-500">
                            ({version.formats.length} formats)
                          </span>
                        )}
                        {version.hasDurationMismatch && (
                          <AlertTriangle
                            size={14}
                            className="text-yellow-500"
                            title="Duration mismatch detected between formats"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(version.rating)}
                        {version.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: tag.color + '30', color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                      {version.formats && version.formats[version.selectedFormatIndex]?.duration && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDuration(version.formats[version.selectedFormatIndex].duration!)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* Sticky footer button */}
      <div className="border-t border-gray-700 p-2">
        <button
          onClick={onAddSongFolder}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Song Folder
        </button>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
