import { useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useDB } from '@hooks/useDB';
import AudioPlayer from './AudioPlayer';
import RichTextEditor, { RichTextEditorHandle } from './RichTextEditor';
import TagManager from './TagManager';
import RatingSelector from './RatingSelector';
import FormatSelector from './FormatSelector';
import { FileAudio, Calendar } from 'lucide-react';
import { formatFileSize } from '@lib/formatUtils';

/**
 * Version view component - displays details for a selected version
 * Includes audio player, waveform, notes, tags, and ratings
 */
export default function VersionView() {
  const { selectedVersion, selectedSong, notes, updateVersionFormat, playingVersionId } = useAppStore();
  const dbOps = useDB();
  const editorRef = useRef<RichTextEditorHandle>(null);

  if (!selectedVersion || !selectedSong) return null;

  const selectedFormat = selectedVersion.formats?.[selectedVersion.selectedFormatIndex];
  const isPlayingDifferentVersion = playingVersionId && playingVersionId !== selectedVersion.id;

  const handleFormatChange = async (formatIndex: number) => {
    try {
      await dbOps.updateVersionFormat(selectedVersion.id!, formatIndex);
      updateVersionFormat(selectedVersion.id!, formatIndex);
    } catch (error) {
      console.error('Failed to update format:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <FileAudio size={24} className="text-primary-500 mt-1" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{selectedVersion.versionName}</h2>
            <p className="text-sm text-gray-400 truncate">{selectedSong.name}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(selectedVersion.modifiedAt)}
              </div>
              {/* Format Selector or static format info */}
              {selectedVersion.formats && selectedVersion.formats.length > 1 ? (
                <FormatSelector
                  versionId={selectedVersion.id!}
                  formats={selectedVersion.formats}
                  selectedIndex={selectedVersion.selectedFormatIndex}
                  onFormatChange={handleFormatChange}
                />
              ) : (
                <>
                  {selectedFormat?.format && (
                    <div className="uppercase">{selectedFormat.format}</div>
                  )}
                  {selectedFormat?.bitrate && (
                    <div>{selectedFormat.bitrate} kbps</div>
                  )}
                  {selectedFormat?.fileSize && (
                    <div>{formatFileSize(selectedFormat.fileSize)}</div>
                  )}
                </>
              )}
            </div>
          </div>
          <RatingSelector versionId={selectedVersion.id!} currentRating={selectedVersion.rating} />
        </div>

        {/* Tags */}
        <div className="mt-3">
          <TagManager versionId={selectedVersion.id!} currentTags={selectedVersion.tags} />
        </div>
      </div>

      {/* Audio Player with Waveform */}
      <div className="bg-gray-850 border-b border-gray-700">
        {isPlayingDifferentVersion && (
          <div className="px-4 py-2 bg-yellow-900/30 border-b border-yellow-700/50 text-sm text-yellow-200">
            ℹ️ Currently playing a different version. Click play below to switch playback to this version.
          </div>
        )}

        {/*
          We need to keep the audio player mounted if it's playing, even if we switch views.
          Render both the selected version player AND the playing version player (if different).
          Use CSS to hide the one that isn't selected.
        */}
        {Array.from(new Set([playingVersionId, selectedVersion.id].filter(Boolean))).map((id) => (
          <div
            key={id}
            className={id === selectedVersion.id ? 'block' : 'hidden'}
          >
            <AudioPlayer
              versionId={id as number}
              onAddNote={(time) => {
                // Only allow adding notes to the currently selected/viewed version
                if (id === selectedVersion.id) {
                   editorRef.current?.insertTimestamp(time);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Notes Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Notes ({notes.length})
          </h3>
        </div>
        <RichTextEditor ref={editorRef} versionId={selectedVersion.id} />
      </div>
    </div>
  );
}
