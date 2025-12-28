import { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { db } from '@lib/db';
import { deserializeHandle, createAudioURL } from '@lib/fileSystem';
import { useAppStore } from '../store/appStore';

/**
 * Audio player component with waveform visualization
 * Uses WaveSurfer.js for audio playback and visualization
 */
interface AudioPlayerProps {
  versionId: number;
  onAddNote?: (timestamp: number) => void;
}

export default function AudioPlayer({ versionId, onAddNote }: AudioPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const onAddNoteRef = useRef(onAddNote);

  // Keep ref in sync with prop
  useEffect(() => {
    onAddNoteRef.current = onAddNote;
  }, [onAddNote]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { playingVersionId, setPlayingVersionId, notes, seekRequest, requestSeek } = useAppStore();

  // Filter notes for this version
  const versionNotes = useMemo(() =>
    notes.filter(n => n.versionId === versionId && n.timestamp !== null),
    [notes, versionId]
  );

  // Debug: log when component mounts/unmounts
  useEffect(() => {
    // console.log(`[AudioPlayer ${versionId}] MOUNTED`);
    return () => {
      // console.log(`[AudioPlayer ${versionId}] UNMOUNTED`);
    };
  }, [versionId]);

  // Load audio file and create blob URL
  useEffect(() => {
    let url: string | null = null;

    const loadAudio = async () => {
      try {
        const version = await db.versions.get(versionId);
        if (!version || !version.formats || version.formats.length === 0) return;

        // Get the selected format
        const selectedFormat = version.formats[version.selectedFormatIndex];
        if (!selectedFormat) return;

        const fileHandle = await deserializeHandle(selectedFormat.fileHandle);
        if (!fileHandle) return;

        url = await createAudioURL(fileHandle as FileSystemFileHandle);
        setAudioUrl(url);
      } catch (error) {
        console.error('Error loading audio file:', error);
      }
    };

    loadAudio();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [versionId]);

  const [regionsPlugin, setRegionsPlugin] = useState<RegionsPlugin | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize WaveSurfer when audioUrl is ready
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    setIsReady(false);

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4b5563',
      progressColor: '#6b7280',
      cursorColor: '#9ca3af',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
      backend: 'WebAudio',
      plugins: [],
    });

    // Register and store Regions plugin
    try {
      const wsRegions = wavesurfer.registerPlugin(RegionsPlugin.create());
      setRegionsPlugin(wsRegions);
    } catch (error) {
       console.error('Failed to initialize RegionsPlugin:', error);
    }

    // Load audio from blob URL
    wavesurfer.load(audioUrl);

    // Event listeners
    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      setIsReady(true);
    });

    wavesurfer.on('decode', () => {
      setIsReady(true);
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      setPlayingVersionId(null);
    });

    // Double click to add note
    wavesurfer.on('dblclick', () => {
      const time = wavesurfer.getCurrentTime();
      if (onAddNoteRef.current) {
        onAddNoteRef.current(time);
      }
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      try {
        wavesurfer.pause();
      } catch (e) {
        // Ignore errors during pause on unmount
      }
      wavesurfer.destroy();
      setRegionsPlugin(null);
      setIsReady(false);
    };
  }, [audioUrl, setPlayingVersionId]);

  // Update regions when notes change or plugin is initialized and ready
  useEffect(() => {
    if (!regionsPlugin || !isReady) return;

    // Clear existing regions
    regionsPlugin.clearRegions();

    // Add regions for notes
    versionNotes.forEach(note => {
      if (note.timestamp !== null) {
        try {
          regionsPlugin.addRegion({
            start: note.timestamp,
            end: note.timestamp + 0.5, // Small but visible duration
            content: ' ',
            color: 'rgba(245, 158, 11, 0.9)', // High opacity Amber
            drag: false,
            resize: false,
          });
        } catch (e) {
          console.error('Error adding region:', e);
        }
      }
    });
  }, [versionNotes, regionsPlugin, isReady]);

  // Handle global seek requests
  useEffect(() => {
    if (seekRequest && seekRequest.versionId === versionId && wavesurferRef.current) {
      if (seekRequest.time >= 0 && seekRequest.time <= duration) {
        wavesurferRef.current.seekTo(seekRequest.time / duration);
        wavesurferRef.current.play();
        setIsPlaying(true);
        setPlayingVersionId(versionId);
      }
      // Reset request handled implicitly by store update or just consuming it?
      // Ideally we should clear it, but checking identity helps.
      // Since seekRequest is a new object every time, we rely on the effect dependency.
    }
  }, [seekRequest, versionId, duration, setPlayingVersionId]);

  // Debug: log state changes
  useEffect(() => {
    // console.log(`[AudioPlayer ${versionId}] State update...`);
  }, [isPlaying, playingVersionId, versionId]);

  // Pause this player if another version starts playing
  useEffect(() => {
    if (playingVersionId !== null && playingVersionId !== versionId && isPlaying) {
      if (wavesurferRef.current) {
        wavesurferRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [playingVersionId, versionId, isPlaying]);

  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
      setIsPlaying(false);
      setPlayingVersionId(null);
    } else {
      setPlayingVersionId(versionId);
      wavesurferRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSkip = (seconds: number) => {
    if (!wavesurferRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    wavesurferRef.current.seekTo(newTime / duration);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4">
      {/* Waveform */}
      <div ref={waveformRef} className="mb-3" />

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleSkip(-10)}
          className="p-2 hover:bg-gray-700 rounded"
          title="Skip back 10s"
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={handlePlayPause}
          className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={() => handleSkip(10)}
          className="p-2 hover:bg-gray-700 rounded"
          title="Skip forward 10s"
        >
          <SkipForward size={20} />
        </button>

        <div className="h-6 w-px bg-gray-700 mx-2" />

        <button
          onClick={() => {
            if (onAddNoteRef.current) {
              onAddNoteRef.current(currentTime);
            }
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Add note at current time"
        >
          <span>+ Add Note</span>
        </button>

        <div className="flex-1 text-sm text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-2">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
