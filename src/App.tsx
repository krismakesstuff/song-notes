import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { useDB } from './hooks/useDB';
import SongBrowser from './components/SongBrowser';
import VersionView from './components/VersionView';
import { Plus } from 'lucide-react';
import { isFileSystemAccessSupported } from '@lib/fileSystem';

/**
 * Main application component
 * Simple two-column layout: song browser on left, version details on right
 */
function App() {
  const dbOps = useDB();
  const { songs, setSongs, setTags, selectedVersion } = useAppStore();
  const [isSupported, setIsSupported] = useState(true);

  // Check browser compatibility
  useEffect(() => {
    setIsSupported(isFileSystemAccessSupported());
  }, []);

  // Load initial data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedSongs, loadedTags] = await Promise.all([
        dbOps.getSongs(),
        dbOps.getTags(),
      ]);
      setSongs(loadedSongs);
      setTags(loadedTags);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddSongFolder = async () => {
    try {
      const newSong = await dbOps.addSongFolder();
      if (newSong) {
        await loadData(); // Reload to get updated data
      }
    } catch (error) {
      console.error('Failed to add song folder:', error);
    }
  };

  // Browser compatibility check
  if (!isSupported) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-4">Browser Not Supported</h1>
          <p className="mb-4">
            This app requires the File System Access API, which is currently
            only available in Chrome, Edge, and Opera.
          </p>
          <p className="text-sm text-gray-400">
            Please use one of these browsers to access your local music files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h1 className="text-xl font-semibold">Song Notes</h1>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Song browser */}
        <div className="w-96 border-r border-gray-700 overflow-hidden">
          <SongBrowser onAddSongFolder={handleAddSongFolder} />
        </div>

        {/* Right panel - Version details */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedVersion ? (
            <VersionView />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No version selected</p>
                <p className="text-sm">
                  {songs.length === 0
                    ? 'Add a song folder to get started'
                    : 'Select a version from the left to view details'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
