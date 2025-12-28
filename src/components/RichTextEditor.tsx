import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useAppStore } from '../store/appStore';
import { useDB } from '@hooks/useDB';
import { useState, forwardRef, useImperativeHandle } from 'react';
import { Note } from '@types';
import { Clock, Trash2 } from 'lucide-react';

/**
 * Rich text editor component for notes
 * Supports timestamp mentions like @0:30 that link to audio positions
 */
interface RichTextEditorProps {
  versionId: number;
}

export interface RichTextEditorHandle {
  insertTimestamp: (seconds: number) => void;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ versionId }, ref) => {
  const dbOps = useDB();
  const { notes, setNotes, requestSeek } = useAppStore();
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your notes here... Use @0:30 for timestamps',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-xs prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    insertTimestamp: (seconds: number) => {
      if (!editor) return;

      // If we are not editing any note, we are in "New Note" mode (which uses the main editor instance)
      // If we ARE editing a note, the editor instance is bound to that note context?
      // Actually, looking at the code below, existing notes share the SAME editor instance??
      // No, `useEditor` is called once at the top level.
      // And `startEditingNote` sets content.
      // So yes, `editor` is the single instance used for either new note or editing existing.

      // If we're not currently editing a note, ensure we're ready for a new one
      // (This behavior assumes double-click adds to the ACTIVE editor, usually "New Note" if nothing else is selected)

      const timestamp = formatTimestamp(seconds);
      const text = `@${timestamp} `;

      // Insert at current cursor position or at end
      editor.commands.insertContent(text);
      editor.commands.focus();
    }
  }));

  const handleCreateNote = async () => {
    if (!editor || editor.isEmpty) return;

    const content = editor.getHTML();

    // Parse timestamps from content
    const timestampMatch = content.match(/@(\d+):(\d+)/);
    let timestamp: number | null = null;

    if (timestampMatch) {
      const minutes = parseInt(timestampMatch[1]);
      const seconds = parseInt(timestampMatch[2]);
      timestamp = minutes * 60 + seconds;
    }

    try {
      const note = await dbOps.createNote(versionId, content, timestamp);
      setNotes([...notes, note]);
      editor.commands.clearContent();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editor || editor.isEmpty) return;

    const content = editor.getHTML();

    try {
      await dbOps.updateNote(noteId, content);
      const updatedNotes = notes.map((n) =>
        n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n
      );
      setNotes(updatedNotes);
      setEditingNoteId(null);
      editor.commands.clearContent();
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Delete this note?')) return;

    try {
      await dbOps.deleteNote(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id);
    editor?.commands.setContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    editor?.commands.clearContent();
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimestampsInContent = (html: string) => {
    return html.replace(/@(\d+):(\d+)/g, (_match, mins, secs) => {
      const seconds = parseInt(mins) * 60 + parseInt(secs);
      // Use data attribute for easier delegation
      return `<button class="timestamp-link hover:underline cursor-pointer font-mono text-sm bg-black text-amber-500 px-1.5 py-0.5 rounded" data-timestamp="${seconds}">${mins}:${secs}</button>`;
    });
  };

  const handleTimestampClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('.timestamp-link');
    if (button) {
      const seconds = parseInt(button.getAttribute('data-timestamp') || '0');
      requestSeek(versionId, seconds);
    }
  };

  return (
    <div className="space-y-4" onClick={handleTimestampClick}>
      {/* Existing notes */}
      <div className="space-y-3">
        {notes
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((note) => (
            <div
              key={note.id}
              className="card p-3 hover:border-gray-600 transition-colors"
            >
              {editingNoteId === note.id ? (
                <div>
                  <EditorContent editor={editor} className="border border-gray-700 rounded" />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      className="btn btn-primary btn-sm text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="btn btn-ghost btn-sm text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className="prose prose-xs prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: parseTimestampsInContent(note.content) }}
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditingNote(note)}
                        className="text-gray-400 hover:text-gray-200 p-1"
                        title="Edit note"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Delete note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(note.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* New note editor */}
      {editingNoteId === null && (
        <div className="card p-3">
          <label className="text-sm font-semibold text-gray-400 mb-2 block">
            New Note
          </label>
          <EditorContent editor={editor} className="border border-gray-700 rounded mb-3" />
          <button
            onClick={handleCreateNote}
            className="btn btn-primary"
            disabled={!editor || editor.isEmpty}
          >
            Add Note
          </button>
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;
