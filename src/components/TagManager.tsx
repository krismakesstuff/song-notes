import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useDB } from '@hooks/useDB';
import { Tag } from '@types';

/**
 * Tag manager component - displays and manages tags for a version
 */
interface TagManagerProps {
  versionId: number;
  currentTags: Tag[];
}

export default function TagManager({ versionId, currentTags }: TagManagerProps) {
  const dbOps = useDB();
  const { tags, addTag, setSongs } = useAppStore();
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6b7280');

  const availableTags = tags.filter(
    (tag) => !currentTags.some((ct) => ct.id === tag.id)
  );

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const tag = await dbOps.createTag(newTagName, newTagColor);
      addTag(tag);
      await handleAddTag(tag.id);
      setNewTagName('');
      setNewTagColor('#6b7280');
      setShowAddTag(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleAddTag = async (tagId: number) => {
    try {
      await dbOps.addTagToVersion(versionId, tagId);
      // Refresh songs to get updated tags
      const updatedSongs = await dbOps.getSongs();
      setSongs(updatedSongs);
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      await dbOps.removeTagFromVersion(versionId, tagId);
      // Refresh songs to get updated tags
      const updatedSongs = await dbOps.getSongs();
      setSongs(updatedSongs);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
        Tags
      </label>

      <div className="flex flex-wrap gap-2 items-center">
        {/* Current tags */}
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
            style={{ backgroundColor: tag.color + '30', color: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:opacity-70"
            >
              <X size={14} />
            </button>
          </span>
        ))}

        {/* Add tag dropdown */}
        {showAddTag ? (
          <div className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              placeholder="Tag name"
              className="bg-transparent text-sm outline-none w-24"
              autoFocus
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-6 h-6 cursor-pointer"
            />
            <button onClick={handleCreateTag} className="text-primary-500 hover:text-primary-400">
              <Plus size={16} />
            </button>
            <button onClick={() => setShowAddTag(false)} className="text-gray-400 hover:text-gray-300">
              <X size={16} />
            </button>
          </div>
        ) : availableTags.length > 0 ? (
          <select
            onChange={(e) => {
              if (e.target.value === 'new') {
                setShowAddTag(true);
              } else {
                handleAddTag(parseInt(e.target.value));
              }
              e.target.value = '';
            }}
            className="select-styled text-sm px-2 py-1"
            defaultValue=""
          >
            <option value="" disabled>
              Add tag...
            </option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
            <option value="new">+ Create new tag</option>
          </select>
        ) : (
          <button
            onClick={() => setShowAddTag(true)}
            className="text-sm px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
          >
            <Plus size={14} />
            New tag
          </button>
        )}
      </div>
    </div>
  );
}
