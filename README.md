# Song Notes - Audio Version Management App

A web application for managing different versions of audio files with rich notes, tags, ratings, and waveform visualization. Works directly in your browser with local file access.

## Features

- **Version Management**: Track multiple versions of your songs in organized folders
- **Multi-Format Support**: Group MP3, FLAC, WAV, and other formats of the same version together
- **Format Selection**: Switch between formats with file size and bitrate info displayed
- **Rich Text Notes**: Add timestamped notes with @0:30 syntax to reference specific moments
- **Tags & Ratings**: Organize versions with custom tags and 1-5 star ratings
- **Waveform Visualization**: See and navigate audio with visual waveforms
- **Audio Playback**: Built-in player with skip controls
- **Local-First**: All data stored in browser IndexedDB, files stay in place
- **Duration Mismatch Warnings**: Alerts when different formats have mismatched durations
- **Customizable Sorting**: Sort versions by date, name, rating, or note count per folder

## Tech Stack

- **React + TypeScript + Vite**: Modern web app with fast development
- **Dexie (IndexedDB)**: Local browser database for metadata
- **File System Access API**: Direct access to local files (Chrome/Edge/Opera)
- **WaveSurfer.js**: Audio waveform visualization
- **TailwindCSS**: Styling
- **Tiptap**: Rich text editor
- **Zustand**: State management
- **music-metadata**: Audio file metadata extraction
- **lucide-react**: Icons

## Prerequisites

- **Modern Browser**: Chrome, Edge, or Opera (requires File System Access API)
- Node.js (for development)

## Setup Instructions

1. **Clone or navigate to the project**:
   ```bash
   cd song-notes
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: Navigate to the URL shown in the terminal (usually http://localhost:5173)

The app will launch in development mode with hot reload enabled.

## Usage

### Getting Started

1. Click "Add Song Folder" in the top-right corner
2. Select a folder containing audio files (WAV, MP3, FLAC, M4A, etc.)
3. The app will automatically detect all audio versions in that folder
4. Click on a version to view its details

### Adding Notes

- Write notes in the rich text editor at the bottom
- Use `@0:30` syntax to add timestamps that reference specific moments in the audio
- Click "Add Note" to save
- Edit or delete notes using the icons on each note card

### Managing Tags

- Click "Add tag..." to create or assign tags
- Choose a color for each tag to organize visually
- Tags help categorize versions (e.g., "Final Mix", "Rough Draft", "Needs Mastering")

### Rating Versions

- Click the stars in the top-right of the version view to rate 1-5 stars
- Click the same star again to remove the rating

### Audio Playback

- Click the play button to start playback
- Use skip buttons to jump forward/backward 10 seconds
- Click on the waveform to jump to any position

## Project Structure

```
/song-notes
├── /src
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Global styles
│   ├── /components
│   │   ├── SongBrowser.tsx      # Song/version tree view with sorting
│   │   ├── VersionView.tsx      # Version details panel
│   │   ├── AudioPlayer.tsx      # Audio player with waveform
│   │   ├── RichTextEditor.tsx   # Notes editor with timestamps
│   │   ├── TagManager.tsx       # Tag creation and assignment
│   │   ├── RatingSelector.tsx   # Star rating component
│   │   └── FormatSelector.tsx   # Multi-format dropdown selector
│   ├── /store
│   │   └── appStore.ts          # Zustand state management
│   ├── /hooks
│   │   └── useDB.ts             # Database operations hook
│   ├── /lib
│   │   ├── db.ts                # Dexie database schema and queries
│   │   ├── fileSystem.ts        # File System Access API utilities
│   │   ├── audioScanner.ts      # Audio file discovery and metadata
│   │   ├── formatUtils.ts       # Format grouping and display utilities
│   └── /types
│       └── index.ts             # Shared TypeScript types
├── /public                      # Static assets
├── package.json
├── vite.config.ts               # Vite configuration
└── tailwind.config.js           # Tailwind configuration
```

## Database Schema (IndexedDB via Dexie)

### Songs
- Represents a song project with a folder handle
- Has sort preference (by date, name, rating, or notes)
- Has many versions

### Versions
- Groups multiple format files of the same version
- Contains array of formats (mp3, flac, wav, etc.)
- Tracks selected format index and duration mismatch flag
- Has rating, notes, and tags

### Tags
- Reusable labels with custom colors
- Many-to-many relationship with versions

### Notes
- Rich text content with optional timestamp
- Belongs to a version

## Development Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Future Enhancements

- [ ] Cloud sync capability
- [ ] Side-by-side version comparison
- [ ] Export notes as PDF/Markdown
- [ ] Audio analysis (waveform details, spectrum)
- [ ] Collaboration features
- [ ] Advanced search and filtering
- [ ] Image attachments for versions

## Contributing

This project uses:
- **Modular components** - Each component handles a specific feature
- **Dexie ORM** - Type-safe IndexedDB queries with migrations
- **Zustand** - Simple, non-boilerplate state management
- **File System Access API** - Browser-native file access

When adding features:
1. Add database changes to `src/lib/db.ts` (increment version and add migration)
2. Create React components in `src/components`
3. Add utility functions to `src/lib` as needed
4. Update Zustand store if needed in `src/store/appStore.ts`

## License

MIT - Use freely for personal or commercial projects.

## Troubleshooting

### "Browser Not Supported" error

This app requires the File System Access API, which is only available in:
- Google Chrome
- Microsoft Edge
- Opera

Safari and Firefox do not currently support this API.

### Permission prompts keep appearing

The browser may require you to re-grant folder access after closing and reopening the app. This is a security feature of the File System Access API.

### Database errors

Clear IndexedDB data for the site:
1. Open browser DevTools (F12)
2. Go to Application > Storage > IndexedDB
3. Delete the "MusicNotesDB" database
4. Refresh the page

### Audio files not appearing

- Make sure files are in a supported format (MP3, WAV, FLAC, M4A, AAC, OGG, WMA)
- Check the browser console for errors
- Try removing and re-adding the song folder
- Ensure you granted read permission when prompted

## Support

For issues and feature requests, please create an issue in the repository.
