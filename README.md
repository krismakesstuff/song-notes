# Music Notes - Audio Version Management App

A desktop application for managing different versions of audio files with rich notes, tags, ratings, and waveform visualization.

## Features

- **Version Management**: Track multiple versions of your songs in organized folders
- **Rich Text Notes**: Add timestamped notes with @0:30 syntax to reference specific moments
- **Tags & Ratings**: Organize versions with custom tags and 1-5 star ratings
- **Waveform Visualization**: See and navigate audio with visual waveforms
- **Audio Playback**: Built-in player with skip controls
- **Local-First**: All data stored locally in SQLite, files stay in place
- **Image Attachments**: Add reference images to versions (coming soon)

## Tech Stack

- **Electron + React + TypeScript**: Desktop app with modern UI
- **SQLite + Drizzle ORM**: Local database for metadata
- **WaveSurfer.js**: Audio waveform visualization
- **TailwindCSS**: Styling
- **Tiptap**: Rich text editor
- **Zustand**: State management

## Prerequisites

**Important**: This project requires Node.js v20 LTS due to native module compatibility.

- Node.js v20.x (LTS) - **Required** for better-sqlite3 compilation
- npm or yarn

### Installing the Correct Node Version

If you use `nvm` (Node Version Manager):

```bash
nvm install 20
nvm use 20
```

Or install from [nodejs.org](https://nodejs.org/) - download the v20 LTS version.

## Setup Instructions

1. **Clone or navigate to the project**:
   ```bash
   cd claude-music-notes
   ```

2. **Switch to Node v20** (if using nvm):
   ```bash
   nvm use
   ```
   This will read the `.nvmrc` file and use the correct version.

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the development server**:
   ```bash
   npm run electron:dev
   ```

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
/claude-music-notes
├── /src
│   ├── /main                    # Electron main process
│   │   ├── main.ts              # Entry point
│   │   ├── database.ts          # SQLite + Drizzle setup
│   │   ├── fileWatcher.ts       # Monitors song folders for changes
│   │   └── ipc.ts               # IPC handlers for renderer communication
│   ├── /renderer                # React UI
│   │   ├── App.tsx              # Main app component
│   │   ├── /components
│   │   │   ├── SongBrowser.tsx  # Song/version tree view
│   │   │   ├── VersionView.tsx  # Version details panel
│   │   │   ├── AudioPlayer.tsx  # Audio player with waveform
│   │   │   ├── RichTextEditor.tsx # Notes editor with timestamps
│   │   │   ├── TagManager.tsx   # Tag creation and assignment
│   │   │   └── RatingSelector.tsx # Star rating component
│   │   ├── /store
│   │   │   └── appStore.ts      # Zustand state management
│   │   └── /hooks
│   │       └── useIpc.ts        # IPC communication hook
│   ├── /shared                  # Shared types between main/renderer
│   │   └── types.ts
│   └── /db                      # Database schema and migrations
│       ├── schema.ts
│       └── /migrations
├── /public                      # Static assets
├── package.json
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind configuration
└── drizzle.config.ts           # Drizzle ORM configuration
```

## Database Schema

### Songs
- Represents a song project with a watched folder path
- Has many versions

### Versions
- Individual audio file versions
- Belongs to a song
- Has metadata: duration, bitrate, format, rating
- Has many notes, tags, and images

### Tags
- Reusable labels with custom colors
- Many-to-many relationship with versions

### Notes
- Rich text content with optional timestamp
- Belongs to a version

### Images
- Reference images for versions
- Belongs to a version

## Development Scripts

- `npm run dev` - Start Vite dev server only
- `npm run electron:dev` - Start Electron app in development mode
- `npm run build` - Build for production
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Future Enhancements

- [ ] Cloud sync capability
- [ ] Side-by-side version comparison
- [ ] Export notes as PDF/Markdown
- [ ] Audio analysis (waveform details, spectrum)
- [ ] Collaboration features
- [ ] Plugin system for custom tools
- [ ] Image attachment UI (schema ready)
- [ ] Advanced search and filtering

## Contributing

This project uses:
- **Modular components** - Each component handles a specific feature
- **Type-safe IPC** - Centralized channel definitions in `shared/types.ts`
- **Drizzle ORM** - Type-safe database queries with migrations
- **Zustand** - Simple, non-boilerplate state management

When adding features:
1. Add database changes to `src/db/schema.ts` and run `npm run db:generate`
2. Add IPC channels to `shared/types.ts`
3. Implement IPC handlers in `src/main/ipc.ts`
4. Create React components in `src/renderer/components`
5. Update Zustand store if needed in `src/renderer/store/appStore.ts`

## License

MIT - Use freely for personal or commercial projects.

## Troubleshooting

### "better-sqlite3" compilation errors

Make sure you're using Node.js v20 LTS:
```bash
node --version  # Should show v20.x.x
```

If you see v25 or higher, switch to v20:
```bash
nvm install 20
nvm use 20
npm install
```

### Database errors

Delete the database file and restart:
```bash
rm ~/Library/Application\ Support/claude-music-notes/music-notes.db
npm run electron:dev
```

### Audio files not appearing

- Make sure files are in a supported format (MP3, WAV, FLAC, M4A, AAC, OGG, WMA)
- Check the Electron console for file watcher errors
- Try removing and re-adding the song folder

## Support

For issues and feature requests, please create an issue in the repository.
