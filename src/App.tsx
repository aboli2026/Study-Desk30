import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveTab,
  NoteItem,
  PomodoroSession,
  StudyFile,
  PomodoroMode,
  StudySessionType,
  PomodoroSettings,
  EyeComfortSettings,
  ToolShortcuts,
  PerformanceSettings,
  DEFAULT_PERFORMANCE_SETTINGS,
  StickyNoteItem,
} from './types';
import { Navigation } from './components/Navigation';
import { OpenFileView } from './components/OpenFileView';
import { LibraryView } from './components/LibraryView';
import { NotesView } from './components/NotesView';
import { PomodoroView } from './components/PomodoroView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import {
  PomodoroNotificationToast,
  PomodoroNotificationData,
} from './components/PomodoroNotificationToast';
import {
  getAllStudyFiles,
  saveStudyFileToStorage,
  deleteStudyFileFromStorage,
  getAllNotesFromStorage,
  saveAllNotesToStorage,
  getFileEditsFromStorage,
  saveFileEditsToStorage,
} from './utils/fileStorage';
import {
  playMinimalPomodoroSound,
  sendBrowserNotification,
} from './utils/pomodoroAudio';

const STORAGE_KEYS = {
  NOTES: 'study_workspace_notes',
  SESSIONS: 'study_workspace_sessions',
  POMODORO_SETTINGS: 'pomodoro_settings',
};

const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundType: 'crystal',
  soundVolume: 0.65,
  browserNotifications: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('open-file');
  const [currentFile, setCurrentFile] = useState<StudyFile | null>(null);
  const [studyFiles, setStudyFiles] = useState<StudyFile[]>([]);

  // Eye Comfort Settings state for whole app
  const [eyeComfortSettings, setEyeComfortSettings] = useState<EyeComfortSettings>(() => {
    try {
      const saved = localStorage.getItem('study_eye_comfort_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          brightness: Math.min(100, Math.max(30, parsed.brightness ?? 100)),
        };
      }
    } catch {}
    return {
      brightness: 100,
      colorMode: 'normal',
      warmth: 50,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('study_eye_comfort_settings', JSON.stringify(eyeComfortSettings));
    } catch {}
  }, [eyeComfortSettings]);

  // Tool Shortcuts state
  const [shortcuts, setShortcuts] = useState<ToolShortcuts>(() => {
    try {
      const saved = localStorage.getItem('study_capsule_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      hand: '1',
      select: '2',
      pen: '3',
      highlighter: '4',
      ruler: '5',
      eraser: '6',
      stickyNote: '7',
      quickNotes: '8',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('study_capsule_shortcuts', JSON.stringify(shortcuts));
    } catch {}
  }, [shortcuts]);

  // Performance Settings for Budget / Economic Systems
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>(() => {
    try {
      const saved = localStorage.getItem('study_performance_settings');
      if (saved) return { ...DEFAULT_PERFORMANCE_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PERFORMANCE_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('study_performance_settings', JSON.stringify(performanceSettings));
    } catch {}
    if (typeof document !== 'undefined') {
      if (performanceSettings.ecoMode) {
        document.documentElement.setAttribute('data-eco-mode', 'true');
        document.documentElement.classList.add('eco-mode');
      } else {
        document.documentElement.removeAttribute('data-eco-mode');
        document.documentElement.classList.remove('eco-mode');
      }
    }
  }, [performanceSettings]);

  // Refresh study files from IndexedDB
  const refreshStudyFiles = useCallback(() => {
    getAllStudyFiles().then((files) => {
      setStudyFiles(files);
    });
  }, []);

  // Load study files on mount and when tab switches or file closes
  useEffect(() => {
    refreshStudyFiles();
  }, [activeTab, currentFile, refreshStudyFiles]);

  // Load notes from localStorage as initial state, then hydrate from IndexedDB
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [
      {
        id: '1',
        title: 'نکات فصل اول - مقدمه',
        content: 'تعاریف پایه و مفاهیم اصلی بررسی شد. برای جلسه بعدی مثال‌های صفحه ۱۲ مرور شود.',
        createdAt: '۱۴۰۳/۰۷/۱۵',
        updatedAt: '۱۴۰۳/۰۷/۱۵',
      },
    ];
  });

  // Hydrate notes from IndexedDB on startup (with automatic migration from localStorage)
  useEffect(() => {
    let isCancelled = false;
    const loadNotes = async () => {
      try {
        const idbNotes = await getAllNotesFromStorage();
        if (isCancelled) return;
        if (idbNotes && idbNotes.length > 0) {
          setNotes(idbNotes);
        } else {
          // If IndexedDB is empty, check and migrate from localStorage
          const localStr = localStorage.getItem(STORAGE_KEYS.NOTES);
          if (localStr) {
            try {
              const parsed = JSON.parse(localStr);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setNotes(parsed);
                await saveAllNotesToStorage(parsed);
              }
            } catch (e) {
              console.warn('Failed to parse local notes for migration:', e);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to initialize notes from IndexedDB:', err);
      }
    };
    loadNotes();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Load sessions from localStorage
  const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  // Save notes to IndexedDB (virtually unlimited quota) with fallback to localStorage
  useEffect(() => {
    saveAllNotesToStorage(notes);
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch {
      // Ignored: If notes exceed 5MB quota (e.g. lots of images), IndexedDB holds all data safely!
    }
  }, [notes]);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // Storage error
    }
  }, [sessions]);

  // Notes handlers
  const handleAddNote = (newNoteData: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toLocaleDateString('fa-IR');
    const newNote: NoteItem = {
      ...newNoteData,
      id: Date.now().toString(),
      title: newNoteData.title,
      content: newNoteData.content,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleUpdateNote = (id: string, title: string, content: string, extra?: Partial<NoteItem>) => {
    const now = new Date().toLocaleDateString('fa-IR');
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...extra, title, content, updatedAt: now } : note
      )
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  // Pomodoro Global State & Settings
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POMODORO_SETTINGS);
      if (saved) return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_POMODORO_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POMODORO_SETTINGS, JSON.stringify(pomodoroSettings));
    } catch {}
  }, [pomodoroSettings]);

  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('focus');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(
    () => pomodoroSettings.focusDuration * 60
  );
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState<boolean>(false);
  const [pomodoroCompletedCount, setPomodoroCompletedCount] = useState<number>(0);
  const [pomodoroNotification, setPomodoroNotification] = useState<PomodoroNotificationData | null>(
    null
  );

  // Active Pomodoro session tracking state & refs
  const activeSessionIdRef = useRef<string | null>(null);
  const activeSessionStartRef = useRef<number | null>(null);
  const sessionElapsedSecondsRef = useRef<number>(0);
  const lastTickTimestampRef = useRef<number>(Date.now());
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);

  // Active Background (Open File & App Activity) session tracking state & refs
  const bgSessionIdRef = useRef<string | null>(null);
  const bgSessionStartRef = useRef<number | null>(null);
  const bgElapsedSecondsRef = useRef<number>(0);
  const bgLastSavedMinutesRef = useRef<number>(0);
  const bgLastTickTimestampRef = useRef<number>(Date.now());
  const lastUserActivityTimestampRef = useRef<number>(Date.now());
  const isDocumentVisibleRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  const prevFileIdRef = useRef<string | undefined>(undefined);

  // Track user presence and visibility to avoid logging time when computer is abandoned
  useEffect(() => {
    const handleUserActivity = () => {
      lastUserActivityTimestampRef.current = Date.now();
    };
    const handleVisibilityChange = () => {
      isDocumentVisibleRef.current = document.visibilityState === 'visible';
      if (document.visibilityState === 'visible') {
        lastUserActivityTimestampRef.current = Date.now();
        bgLastTickTimestampRef.current = Date.now();
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Reset active background study session when switching or closing files
  useEffect(() => {
    if (prevFileIdRef.current !== currentFile?.id) {
      bgSessionIdRef.current = null;
      bgSessionStartRef.current = null;
      bgElapsedSecondsRef.current = 0;
      bgLastSavedMinutesRef.current = 0;
      prevFileIdRef.current = currentFile?.id;
    }
  }, [currentFile?.id]);

  // Background Activity Ticker: Automatically records study time when Pomodoro is NOT running
  // (both when reading an open file and when using the app/notes)
  useEffect(() => {
    // If Pomodoro is active, Pomodoro timer takes precedence
    if (pomodoroIsRunning) {
      if (bgElapsedSecondsRef.current >= 60) {
        bgSessionIdRef.current = null;
        bgSessionStartRef.current = null;
        bgElapsedSecondsRef.current = 0;
        bgLastSavedMinutesRef.current = 0;
      }
      return;
    }

    bgLastTickTimestampRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = Math.max(
        1,
        Math.min(10, Math.round((now - bgLastTickTimestampRef.current) / 1000))
      );
      bgLastTickTimestampRef.current = now;

      // Pause tracking if page is hidden or user has been idle for more than 20 minutes
      const isVisible = isDocumentVisibleRef.current;
      const isIdle = now - lastUserActivityTimestampRef.current > 20 * 60 * 1000;
      if (!isVisible || isIdle) {
        return;
      }

      if (!bgSessionIdRef.current) {
        bgSessionIdRef.current = `study-${Date.now()}`;
        bgSessionStartRef.current = now;
        bgElapsedSecondsRef.current = 0;
        bgLastSavedMinutesRef.current = 0;
      }

      bgElapsedSecondsRef.current += deltaSeconds;

      const currentElapsed = bgElapsedSecondsRef.current;
      const minutes = Math.floor(currentElapsed / 60);

      // Incrementally update session every minute
      if (minutes >= 1 && minutes !== bgLastSavedMinutesRef.current) {
        bgLastSavedMinutesRef.current = minutes;
        const currentId = bgSessionIdRef.current;
        const startTime = bgSessionStartRef.current || now;
        const isFile = !!currentFile;
        const sessionType: StudySessionType = isFile ? 'file-study' : 'app-usage';
        const fileName = isFile ? currentFile.name : undefined;

        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === currentId);
          const dateObj = new Date(startTime);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              durationMinutes: minutes,
              type: sessionType,
              fileName: fileName || updated[idx].fileName,
            };
            return updated;
          }
          const newSession: PomodoroSession = {
            id: currentId,
            type: sessionType,
            durationMinutes: minutes,
            timestamp: dateObj.toISOString(),
            date: dateObj.toLocaleDateString('fa-IR'),
            createdAt: startTime,
            fileName,
            source: isFile ? 'file' : 'app',
          };
          return [newSession, ...prev];
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [pomodoroIsRunning, currentFile?.id, currentFile?.name]);

  // Store per-mode timer state so switching between sessions NEVER wipes or resets progress!
  const modeTimersRef = useRef<
    Record<
      PomodoroMode,
      {
        timeLeft: number;
        elapsedSeconds: number;
        sessionId: string | null;
        startTimestamp: number | null;
      }
    >
  >({
    focus: {
      timeLeft: pomodoroSettings.focusDuration * 60,
      elapsedSeconds: 0,
      sessionId: null,
      startTimestamp: null,
    },
    'short-break': {
      timeLeft: pomodoroSettings.shortBreakDuration * 60,
      elapsedSeconds: 0,
      sessionId: null,
      startTimestamp: null,
    },
    'long-break': {
      timeLeft: pomodoroSettings.longBreakDuration * 60,
      elapsedSeconds: 0,
      sessionId: null,
      startTimestamp: null,
    },
  });

  // Record or update active Pomodoro session in real time
  const recordOrUpdateSession = useCallback(
    (mode: PomodoroMode, durationMins: number, finalize: boolean = false) => {
      if (durationMins < 1) return;

      const now = new Date();
      const currentId = activeSessionIdRef.current;
      const startTime = activeSessionStartRef.current ? new Date(activeSessionStartRef.current) : now;

      setSessions((prev) => {
        if (currentId) {
          const index = prev.findIndex((s) => s.id === currentId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              durationMinutes: durationMins,
              type: mode,
            };
            return updated;
          }
        }
        const newId = currentId || Date.now().toString();
        if (!currentId) {
          activeSessionIdRef.current = newId;
        }
        const newSession: PomodoroSession = {
          id: newId,
          type: mode,
          durationMinutes: durationMins,
          timestamp: startTime.toISOString(),
          date: startTime.toLocaleDateString('fa-IR'),
          createdAt: startTime.getTime(),
          source: 'pomodoro',
        };
        return [newSession, ...prev];
      });

      if (finalize) {
        activeSessionIdRef.current = null;
        activeSessionStartRef.current = null;
        sessionElapsedSecondsRef.current = 0;
        setSessionElapsedSeconds(0);
      }
    },
    []
  );

  // Sync to localStorage before unload so no study seconds are ever lost
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 1. Pomodoro active session
      const elapsedSecs = sessionElapsedSecondsRef.current;
      if (elapsedSecs >= 60 && pomodoroIsRunning) {
        const elapsedMins = Math.round(elapsedSecs / 60);
        try {
          const savedStr = localStorage.getItem(STORAGE_KEYS.SESSIONS);
          const currentList: PomodoroSession[] = savedStr ? JSON.parse(savedStr) : [];
          const currentId = activeSessionIdRef.current || Date.now().toString();
          const startTime = activeSessionStartRef.current ? new Date(activeSessionStartRef.current) : new Date();

          const existingIdx = currentList.findIndex((s) => s.id === currentId);
          if (existingIdx >= 0) {
            currentList[existingIdx].durationMinutes = elapsedMins;
          } else {
            currentList.unshift({
              id: currentId,
              type: pomodoroMode,
              durationMinutes: elapsedMins,
              timestamp: startTime.toISOString(),
              date: startTime.toLocaleDateString('fa-IR'),
              createdAt: startTime.getTime(),
              source: 'pomodoro',
            });
          }
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(currentList));
        } catch {}
      }

      // 2. Background Study Session (file reading or app activity)
      const bgSecs = bgElapsedSecondsRef.current;
      if (bgSecs >= 45 && !pomodoroIsRunning) {
        const bgMins = Math.max(1, Math.round(bgSecs / 60));
        try {
          const savedStr = localStorage.getItem(STORAGE_KEYS.SESSIONS);
          const currentList: PomodoroSession[] = savedStr ? JSON.parse(savedStr) : [];
          const currentId = bgSessionIdRef.current || `study-${Date.now()}`;
          const startTime = bgSessionStartRef.current ? new Date(bgSessionStartRef.current) : new Date();
          const isFile = !!currentFile;
          const sessionType: StudySessionType = isFile ? 'file-study' : 'app-usage';

          const existingIdx = currentList.findIndex((s) => s.id === currentId);
          if (existingIdx >= 0) {
            currentList[existingIdx].durationMinutes = bgMins;
          } else {
            currentList.unshift({
              id: currentId,
              type: sessionType,
              durationMinutes: bgMins,
              timestamp: startTime.toISOString(),
              date: startTime.toLocaleDateString('fa-IR'),
              createdAt: startTime.getTime(),
              fileName: isFile ? currentFile.name : undefined,
              source: isFile ? 'file' : 'app',
            });
          }
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(currentList));
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pomodoroMode, pomodoroIsRunning, currentFile]);

  // Global Pomodoro Ticker Effect: Runs continuously even when reading PDF in fullscreen!
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (pomodoroIsRunning && pomodoroTimeLeft > 0) {
      lastTickTimestampRef.current = Date.now();

      interval = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.max(1, Math.round((now - lastTickTimestampRef.current) / 1000));
        lastTickTimestampRef.current = now;

        setPomodoroTimeLeft((prev) => {
          const next = prev - deltaSeconds;
          const clamped = next > 0 ? next : 0;
          if (modeTimersRef.current[pomodoroMode]) {
            modeTimersRef.current[pomodoroMode].timeLeft = clamped;
            modeTimersRef.current[pomodoroMode].elapsedSeconds =
              sessionElapsedSecondsRef.current + deltaSeconds;
          }
          return clamped;
        });

        sessionElapsedSecondsRef.current += deltaSeconds;
        setSessionElapsedSeconds(sessionElapsedSecondsRef.current);

        // Auto-save progress every 60 seconds of continuous session
        const currentElapsed = sessionElapsedSecondsRef.current;
        if (currentElapsed >= 60 && currentElapsed % 60 < deltaSeconds) {
          const minutes = Math.floor(currentElapsed / 60);
          recordOrUpdateSession(pomodoroMode, minutes, false);
        }
      }, 1000);
    } else if (pomodoroIsRunning && pomodoroTimeLeft <= 0) {
      setPomodoroIsRunning(false);

      // 1. Play minimal soothing crystal chime sound
      playMinimalPomodoroSound(pomodoroSettings.soundType, pomodoroSettings.soundVolume);

      // 2. Finalize session with completed duration
      const totalElapsedMins = Math.max(1, Math.round(sessionElapsedSecondsRef.current / 60));
      const scheduledDuration =
        pomodoroMode === 'focus'
          ? pomodoroSettings.focusDuration
          : pomodoroMode === 'short-break'
          ? pomodoroSettings.shortBreakDuration
          : pomodoroSettings.longBreakDuration;
      const finalMins = Math.max(totalElapsedMins, scheduledDuration);
      recordOrUpdateSession(pomodoroMode, finalMins, true);

      // Reset completed mode timer in cache
      modeTimersRef.current[pomodoroMode] = {
        timeLeft: scheduledDuration * 60,
        elapsedSeconds: 0,
        sessionId: null,
        startTimestamp: null,
      };

      // 3. Compute next mode and message
      let nextMode: PomodoroMode = 'short-break';
      let nextMinutes = pomodoroSettings.shortBreakDuration;
      let notifTitle = '';
      let notifMessage = '';

      if (pomodoroMode === 'focus') {
        const nextCompleted = pomodoroCompletedCount + 1;
        setPomodoroCompletedCount(nextCompleted);

        const isLongBreak = nextCompleted % pomodoroSettings.roundsBeforeLongBreak === 0;
        nextMode = isLongBreak ? 'long-break' : 'short-break';
        nextMinutes = isLongBreak ? pomodoroSettings.longBreakDuration : pomodoroSettings.shortBreakDuration;

        notifTitle = 'جلسه تمرکز و مطالعه به پایان رسید! 🎉';
        notifMessage = isLongBreak
          ? `فوق‌العاده بود! شما ${pomodoroSettings.roundsBeforeLongBreak} دور متوالی مطالعه کردید. اکنون زمان ${pomodoroSettings.longBreakDuration} دقیقه استراحت عمیق است.`
          : `خسته نباشید! وقت ${pomodoroSettings.shortBreakDuration} دقیقه استراحت کوتاه، تنفس عمیق و نوشیدن آب است.`;

        if (pomodoroSettings.browserNotifications) {
          sendBrowserNotification(notifTitle, notifMessage);
        }
      } else {
        nextMode = 'focus';
        nextMinutes = pomodoroSettings.focusDuration;
        notifTitle = 'زمان استراحت پایان یافت ☕';
        notifMessage = `انرژی‌ها بازیابی شد! آماده‌ای برای شروع جلسه مطالعه و تمرکز جدید (${pomodoroSettings.focusDuration} دقیقه)؟`;

        if (pomodoroSettings.browserNotifications) {
          sendBrowserNotification(notifTitle, notifMessage);
        }
      }

      // 4. Trigger fullscreen top-level in-app toast notification
      setPomodoroNotification({
        isOpen: true,
        title: notifTitle,
        message: notifMessage,
        mode: pomodoroMode,
        nextMode,
        nextMinutes,
      });

      // 5. Automatic transition
      const shouldAutoStart =
        (pomodoroMode === 'focus' && pomodoroSettings.autoStartBreaks) ||
        (pomodoroMode !== 'focus' && pomodoroSettings.autoStartFocus);

      setPomodoroMode(nextMode);
      const nextTimeLeft = nextMinutes * 60;
      setPomodoroTimeLeft(nextTimeLeft);
      modeTimersRef.current[nextMode] = {
        timeLeft: nextTimeLeft,
        elapsedSeconds: 0,
        sessionId: null,
        startTimestamp: null,
      };
      sessionElapsedSecondsRef.current = 0;
      setSessionElapsedSeconds(0);

      if (shouldAutoStart) {
        setPomodoroIsRunning(true);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    pomodoroIsRunning,
    pomodoroTimeLeft,
    pomodoroMode,
    pomodoroSettings,
    pomodoroCompletedCount,
    recordOrUpdateSession,
  ]);

  const handleTogglePomodoroPlay = useCallback(() => {
    setPomodoroIsRunning((prev) => {
      const willBeRunning = !prev;
      if (!willBeRunning) {
        // Paused / Stopped: immediately record and save elapsed study time so far
        const elapsedSecs = sessionElapsedSecondsRef.current;
        if (elapsedSecs >= 60) {
          const elapsedMins = Math.round(elapsedSecs / 60);
          recordOrUpdateSession(pomodoroMode, elapsedMins, false);
        }
      } else {
        lastTickTimestampRef.current = Date.now();
        if (!activeSessionIdRef.current) {
          activeSessionIdRef.current = Date.now().toString();
          activeSessionStartRef.current = Date.now();
        }
      }
      return willBeRunning;
    });
  }, [pomodoroMode, recordOrUpdateSession]);

  const handleResetPomodoro = useCallback(() => {
    setPomodoroIsRunning(false);
    // If user studied >= 1 minute, finalize and preserve it in history so it is never lost!
    const elapsedSecs = sessionElapsedSecondsRef.current;
    if (elapsedSecs >= 60) {
      const elapsedMins = Math.round(elapsedSecs / 60);
      recordOrUpdateSession(pomodoroMode, elapsedMins, true);
    } else {
      activeSessionIdRef.current = null;
      activeSessionStartRef.current = null;
      sessionElapsedSecondsRef.current = 0;
      setSessionElapsedSeconds(0);
    }

    const duration =
      (pomodoroMode === 'focus'
        ? pomodoroSettings.focusDuration
        : pomodoroMode === 'short-break'
        ? pomodoroSettings.shortBreakDuration
        : pomodoroSettings.longBreakDuration) * 60;

    modeTimersRef.current[pomodoroMode] = {
      timeLeft: duration,
      elapsedSeconds: 0,
      sessionId: null,
      startTimestamp: null,
    };
    setPomodoroTimeLeft(duration);
  }, [pomodoroMode, pomodoroSettings, recordOrUpdateSession]);

  const handleSwitchPomodoroMode = useCallback(
    (newMode: PomodoroMode) => {
      // 1. If clicking the currently active mode, DO NOTHING (prevents accidental reset!)
      if (newMode === pomodoroMode) {
        return;
      }

      // 2. Pause if running and save focus progress
      if (pomodoroIsRunning) {
        setPomodoroIsRunning(false);
        const elapsedSecs = sessionElapsedSecondsRef.current;
        if (pomodoroMode === 'focus' && elapsedSecs >= 60) {
          const elapsedMins = Math.round(elapsedSecs / 60);
          recordOrUpdateSession('focus', elapsedMins, false);
        }
      }

      // 3. Save current mode state to modeTimersRef
      modeTimersRef.current[pomodoroMode] = {
        timeLeft: pomodoroTimeLeft,
        elapsedSeconds: sessionElapsedSecondsRef.current,
        sessionId: activeSessionIdRef.current,
        startTimestamp: activeSessionStartRef.current,
      };

      // 4. Switch mode
      setPomodoroMode(newMode);

      // 5. Restore target mode state from modeTimersRef
      const targetState = modeTimersRef.current[newMode];
      const defaultDuration =
        (newMode === 'focus'
          ? pomodoroSettings.focusDuration
          : newMode === 'short-break'
          ? pomodoroSettings.shortBreakDuration
          : pomodoroSettings.longBreakDuration) * 60;

      const restoredTime =
        targetState && targetState.timeLeft > 0 ? targetState.timeLeft : defaultDuration;
      setPomodoroTimeLeft(restoredTime);

      const restoredElapsed = targetState ? targetState.elapsedSeconds : 0;
      sessionElapsedSecondsRef.current = restoredElapsed;
      setSessionElapsedSeconds(restoredElapsed);
      activeSessionIdRef.current = targetState ? targetState.sessionId : null;
      activeSessionStartRef.current = targetState ? targetState.startTimestamp : null;
    },
    [pomodoroMode, pomodoroIsRunning, pomodoroTimeLeft, pomodoroSettings, recordOrUpdateSession]
  );

  const handleFinalizeSessionEarly = useCallback(() => {
    setPomodoroIsRunning(false);
    const elapsedSecs = sessionElapsedSecondsRef.current;
    const elapsedMins = Math.max(1, Math.round(elapsedSecs / 60));
    recordOrUpdateSession(pomodoroMode, elapsedMins, true);

    playMinimalPomodoroSound(pomodoroSettings.soundType, pomodoroSettings.soundVolume);

    if (pomodoroMode === 'focus') {
      const nextCompleted = pomodoroCompletedCount + 1;
      setPomodoroCompletedCount(nextCompleted);

      // Reset focus timer in cache
      const focusDuration = pomodoroSettings.focusDuration * 60;
      modeTimersRef.current.focus = {
        timeLeft: focusDuration,
        elapsedSeconds: 0,
        sessionId: null,
        startTimestamp: null,
      };

      const isLongBreak = nextCompleted % pomodoroSettings.roundsBeforeLongBreak === 0;
      const nextMode: PomodoroMode = isLongBreak ? 'long-break' : 'short-break';
      const breakMinutes = isLongBreak
        ? pomodoroSettings.longBreakDuration
        : pomodoroSettings.shortBreakDuration;

      // Show notification toast
      setPomodoroNotification({
        isOpen: true,
        title: 'نشست مطالعه با موفقیت ثبت شد 🎉',
        message: `${elapsedMins} دقیقه مطالعه با موفقیت در تاریخچه و آمار ذخیره شد.`,
        mode: 'focus',
        nextMode,
        nextMinutes: breakMinutes,
      });

      // Switch to break
      setPomodoroMode(nextMode);
      const breakDuration = breakMinutes * 60;
      setPomodoroTimeLeft(breakDuration);
      modeTimersRef.current[nextMode] = {
        timeLeft: breakDuration,
        elapsedSeconds: 0,
        sessionId: null,
        startTimestamp: null,
      };
      sessionElapsedSecondsRef.current = 0;
      setSessionElapsedSeconds(0);
    } else {
      // Break finalized early -> switch to focus
      const breakDuration =
        (pomodoroMode === 'short-break'
          ? pomodoroSettings.shortBreakDuration
          : pomodoroSettings.longBreakDuration) * 60;
      modeTimersRef.current[pomodoroMode] = {
        timeLeft: breakDuration,
        elapsedSeconds: 0,
        sessionId: null,
        startTimestamp: null,
      };

      setPomodoroMode('focus');
      const focusDuration = pomodoroSettings.focusDuration * 60;
      const targetFocusTime = modeTimersRef.current.focus.timeLeft || focusDuration;
      setPomodoroTimeLeft(targetFocusTime);
      sessionElapsedSecondsRef.current = modeTimersRef.current.focus.elapsedSeconds || 0;
      setSessionElapsedSeconds(sessionElapsedSecondsRef.current);
    }
  }, [pomodoroMode, pomodoroCompletedCount, pomodoroSettings, recordOrUpdateSession]);

  const handleAddPomodoroTime = useCallback((mins: number) => {
    setPomodoroTimeLeft((prev) => prev + mins * 60);
  }, []);

  const handleUpdatePomodoroSettings = useCallback(
    (newSettings: PomodoroSettings) => {
      setPomodoroSettings(newSettings);
      if (!pomodoroIsRunning) {
        const duration =
          pomodoroMode === 'focus'
            ? newSettings.focusDuration
            : pomodoroMode === 'short-break'
            ? newSettings.shortBreakDuration
            : newSettings.longBreakDuration;
        setPomodoroTimeLeft(duration * 60);
      }
    },
    [pomodoroIsRunning, pomodoroMode]
  );

  const handleStartNextFromNotification = useCallback(() => {
    setPomodoroIsRunning(true);
  }, []);

  const handleClearSessions = () => {
    setSessions([]);
  };

  const handleLoadSampleSessions = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sampleData: PomodoroSession[] = [
      // Today (hours spread out)
      { id: 's-1', type: 'file-study', fileName: 'جزوه ریاضی عمومی ۱.pdf', durationMinutes: 40, timestamp: new Date(now - 25 * 60 * 1000).toISOString(), createdAt: now - 25 * 60 * 1000, source: 'file' },
      { id: 's-2', type: 'focus', durationMinutes: 25, timestamp: new Date(now - 70 * 60 * 1000).toISOString(), createdAt: now - 70 * 60 * 1000, source: 'pomodoro' },
      { id: 's-3', type: 'short-break', durationMinutes: 5, timestamp: new Date(now - 95 * 60 * 1000).toISOString(), createdAt: now - 95 * 60 * 1000, source: 'pomodoro' },
      { id: 's-4', type: 'file-study', fileName: 'فیزیک هالیدی - مبانی الکتریسیته.pdf', durationMinutes: 30, timestamp: new Date(now - 140 * 60 * 1000).toISOString(), createdAt: now - 140 * 60 * 1000, source: 'file' },
      { id: 's-5', type: 'app-usage', durationMinutes: 15, timestamp: new Date(now - 220 * 60 * 1000).toISOString(), createdAt: now - 220 * 60 * 1000, source: 'app' },
      // 1 day ago
      { id: 's-6', type: 'file-study', fileName: 'جزوه ریاضی عمومی ۱.pdf', durationMinutes: 45, timestamp: new Date(now - oneDay - 40 * 60 * 1000).toISOString(), createdAt: now - oneDay - 40 * 60 * 1000, source: 'file' },
      { id: 's-7', type: 'focus', durationMinutes: 25, timestamp: new Date(now - oneDay - 180 * 60 * 1000).toISOString(), createdAt: now - oneDay - 180 * 60 * 1000, source: 'pomodoro' },
      { id: 's-8', type: 'short-break', durationMinutes: 5, timestamp: new Date(now - oneDay - 120 * 60 * 1000).toISOString(), createdAt: now - oneDay - 120 * 60 * 1000, source: 'pomodoro' },
      // 2 days ago
      { id: 's-9', type: 'focus', durationMinutes: 50, timestamp: new Date(now - 2 * oneDay).toISOString(), createdAt: now - 2 * oneDay, source: 'pomodoro' },
      { id: 's-10', type: 'file-study', fileName: 'مبانی هوش مصنوعی و داده.pdf', durationMinutes: 35, timestamp: new Date(now - 2 * oneDay - 120 * 60 * 1000).toISOString(), createdAt: now - 2 * oneDay - 120 * 60 * 1000, source: 'file' },
      // 3 days ago
      { id: 's-11', type: 'focus', durationMinutes: 50, timestamp: new Date(now - 3 * oneDay).toISOString(), createdAt: now - 3 * oneDay, source: 'pomodoro' },
      { id: 's-12', type: 'short-break', durationMinutes: 5, timestamp: new Date(now - 3 * oneDay - 60 * 60 * 1000).toISOString(), createdAt: now - 3 * oneDay - 60 * 60 * 1000, source: 'pomodoro' },
      // 4 days ago
      { id: 's-13', type: 'file-study', fileName: 'شیمی آلی پیشرفته.pdf', durationMinutes: 60, timestamp: new Date(now - 4 * oneDay).toISOString(), createdAt: now - 4 * oneDay, source: 'file' },
      { id: 's-14', type: 'long-break', durationMinutes: 15, timestamp: new Date(now - 4 * oneDay - 60 * 60 * 1000).toISOString(), createdAt: now - 4 * oneDay - 60 * 60 * 1000, source: 'pomodoro' },
      // 5 days ago
      { id: 's-15', type: 'focus', durationMinutes: 50, timestamp: new Date(now - 5 * oneDay).toISOString(), createdAt: now - 5 * oneDay, source: 'pomodoro' },
      // 6 days ago
      { id: 's-16', type: 'file-study', fileName: 'جزوه ریاضی عمومی ۱.pdf', durationMinutes: 30, timestamp: new Date(now - 6 * oneDay).toISOString(), createdAt: now - 6 * oneDay, source: 'file' },
    ];
    setSessions(sampleData);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndOpenDiskFile = async (file: File, fileHandle?: any) => {
    // Check if file is a text or markdown note file
    const isTextFile =
      file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      file.name.toLowerCase().endsWith('.txt') ||
      file.name.toLowerCase().endsWith('.md');

    if (isTextFile) {
      try {
        const textContent = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'یادداشت وارد شده';
        handleAddNote({
          title,
          content: textContent,
        });
        setActiveTab('notes');
        return;
      } catch (e) {
        console.error('Error importing text file as note:', e);
        alert('خطا در خواندن فایل متنی.');
        return;
      }
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('لطفاً یک فایل با پسوند PDF یا فایل متنی (TXT/Markdown) انتخاب کنید.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const targetName = (file.name || '').trim().toLowerCase();

      // Check if file already exists in library
      const existing = studyFiles.find(
        (f) => (f.name || '').trim().toLowerCase() === targetName
      );

      let targetFile: StudyFile;
      if (existing) {
        const cleanBuffer = existing.originalData || buffer;
        targetFile = {
          ...existing,
          size: file.size,
          data: cleanBuffer,
          originalData: cleanBuffer.slice(0),
          fileHandle: fileHandle || existing.fileHandle,
        };
      } else {
        targetFile = {
          id: `${Date.now()}`,
          name: file.name,
          size: file.size,
          data: buffer,
          originalData: buffer.slice(0),
          fileHandle: fileHandle,
          uploadDate: new Date().toLocaleDateString('fa-IR'),
        };
      }

      await saveStudyFileToStorage(targetFile);
      const allFiles = await getAllStudyFiles();
      setStudyFiles(allFiles);
      setCurrentFile(targetFile);
      setActiveTab('open-file');
    } catch {
      alert('خطا در خواندن فایل.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await processAndOpenDiskFile(file);
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteStudyFile = async (id: string, fileName?: string) => {
    await deleteStudyFileFromStorage(id, fileName);
    const allFiles = await getAllStudyFiles();
    setStudyFiles(allFiles);
    if (currentFile?.id === id || (fileName && currentFile?.name === fileName)) {
      setCurrentFile(null);
    }
  };

  const handleUpdateStudyFile = async (updatedFile: StudyFile) => {
    setStudyFiles((prev) => prev.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
    if (currentFile?.id === updatedFile.id) {
      setCurrentFile(updatedFile);
    }
    await saveStudyFileToStorage(updatedFile);
  };

  const handleOpenFileAtPage = useCallback(async (file: StudyFile, pageNumber: number) => {
    try {
      const existingEdits = await getFileEditsFromStorage(file.id);
      await saveFileEditsToStorage(file.id, {
        fileId: file.id,
        pageStrokes: existingEdits?.pageStrokes || file.pageStrokes || {},
        stickyNotes: existingEdits?.stickyNotes || file.stickyNotes || [],
        currentPage: pageNumber,
        pageCount: existingEdits?.pageCount || file.pageCount,
        scale: existingEdits?.scale || file.scale,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not update page before opening file:', e);
    }
    setCurrentFile({ ...file, currentPage: pageNumber });
    setActiveTab('open-file');
  }, []);

  const handleUpdateStickyNote = useCallback(
    async (fileId: string, updatedNote: StickyNoteItem) => {
      try {
        const existingEdits = await getFileEditsFromStorage(fileId);
        const targetFile = studyFiles.find((f) => f.id === fileId);
        const notesList = existingEdits?.stickyNotes || targetFile?.stickyNotes || [];
        const updatedNotesList = notesList.map((n) => (n.id === updatedNote.id ? updatedNote : n));

        await saveFileEditsToStorage(fileId, {
          fileId,
          pageStrokes: existingEdits?.pageStrokes || targetFile?.pageStrokes || {},
          stickyNotes: updatedNotesList,
          currentPage: existingEdits?.currentPage || targetFile?.currentPage || 1,
          pageCount: existingEdits?.pageCount || targetFile?.pageCount,
          scale: existingEdits?.scale || targetFile?.scale,
          updatedAt: new Date().toISOString(),
        });

        setStudyFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              return { ...f, stickyNotes: updatedNotesList };
            }
            return f;
          })
        );

        if (currentFile && currentFile.id === fileId) {
          setCurrentFile((prev) => (prev ? { ...prev, stickyNotes: updatedNotesList } : null));
        }
      } catch (err) {
        console.error('Error updating sticky note:', err);
      }
    },
    [studyFiles, currentFile]
  );

  const handleDeleteStickyNote = useCallback(
    async (fileId: string, stickyNoteId: string) => {
      try {
        const existingEdits = await getFileEditsFromStorage(fileId);
        const targetFile = studyFiles.find((f) => f.id === fileId);
        const notesList = existingEdits?.stickyNotes || targetFile?.stickyNotes || [];
        const updatedNotesList = notesList.filter((n) => n.id !== stickyNoteId);

        await saveFileEditsToStorage(fileId, {
          fileId,
          pageStrokes: existingEdits?.pageStrokes || targetFile?.pageStrokes || {},
          stickyNotes: updatedNotesList,
          currentPage: existingEdits?.currentPage || targetFile?.currentPage || 1,
          pageCount: existingEdits?.pageCount || targetFile?.pageCount,
          scale: existingEdits?.scale || targetFile?.scale,
          updatedAt: new Date().toISOString(),
        });

        setStudyFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              return { ...f, stickyNotes: updatedNotesList };
            }
            return f;
          })
        );

        if (currentFile && currentFile.id === fileId) {
          setCurrentFile((prev) => (prev ? { ...prev, stickyNotes: updatedNotesList } : null));
        }
      } catch (err) {
        console.error('Error deleting sticky note:', err);
      }
    },
    [studyFiles, currentFile]
  );

  const handleAddStickyNote = useCallback(
    async (
      fileId: string,
      noteData: {
        pageNumber: number;
        title: string;
        content: string;
        color?: string;
        textColor?: string;
        isBold?: boolean;
      }
    ) => {
      try {
        const existingEdits = await getFileEditsFromStorage(fileId);
        const targetFile = studyFiles.find((f) => f.id === fileId);
        const notesList = existingEdits?.stickyNotes || targetFile?.stickyNotes || [];
        const newSticky: StickyNoteItem = {
          id: `sticky-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          pageNumber: noteData.pageNumber || 1,
          x: 0.15,
          y: 0.15,
          title: noteData.title || `استیکی‌نوت صفحه ${noteData.pageNumber || 1}`,
          content: noteData.content || '',
          color: noteData.color || '#fef08a',
          textColor: noteData.textColor || '#713f12',
          isBold: noteData.isBold ?? false,
          createdAt: new Date().toLocaleDateString('fa-IR'),
        };
        const updatedNotesList = [...notesList, newSticky];

        await saveFileEditsToStorage(fileId, {
          fileId,
          pageStrokes: existingEdits?.pageStrokes || targetFile?.pageStrokes || {},
          stickyNotes: updatedNotesList,
          currentPage: existingEdits?.currentPage || targetFile?.currentPage || 1,
          pageCount: existingEdits?.pageCount || targetFile?.pageCount,
          scale: existingEdits?.scale || targetFile?.scale,
          updatedAt: new Date().toISOString(),
        });

        setStudyFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileId) {
              return { ...f, stickyNotes: updatedNotesList };
            }
            return f;
          })
        );

        if (currentFile && currentFile.id === fileId) {
          setCurrentFile((prev) => (prev ? { ...prev, stickyNotes: updatedNotesList } : null));
        }
      } catch (err) {
        console.error('Error adding sticky note:', err);
      }
    },
    [studyFiles, currentFile]
  );

  const [targetNoteIdToOpen, setTargetNoteIdToOpen] = useState<string | null>(null);

  const handleSwitchToNotes = useCallback((noteId?: string) => {
    if (noteId) {
      setTargetNoteIdToOpen(noteId);
    }
    setActiveTab('notes');
  }, []);

  const handleOpenFilePicker = async () => {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'فایل‌های مطالعه و یادداشت (PDF، متن)',
              accept: {
                'application/pdf': ['.pdf'],
                'text/plain': ['.txt'],
                'text/markdown': ['.md'],
              },
            },
          ],
          multiple: false,
        });
        const diskFile = await handle.getFile();
        await processAndOpenDiskFile(diskFile, handle);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    fileInputRef.current?.click();
  };

  const isStudyingFile = Boolean(currentFile) && activeTab === 'open-file';

  // Guarantee that leaving a file or switching tabs immediately removes all hand tool cursor classes from the body
  useEffect(() => {
    if (!isStudyingFile) {
      document.body.classList.remove('hand-tool-active', 'hand-tool-panning');
    }
  }, [isStudyingFile]);

  return (
    <div
      className={`flex ${
        isStudyingFile
          ? 'flex-row p-0 gap-0 bg-neutral-900'
          : 'flex-col md:flex-row p-1.5 sm:p-3 md:p-4 gap-1.5 sm:gap-3 md:gap-4 bg-neutral-100/90 text-neutral-900'
      } h-[100dvh] w-full min-h-0 select-none overflow-hidden relative`}
      style={{
        paddingTop: isStudyingFile ? undefined : 'max(0.375rem, env(safe-area-inset-top))',
        paddingBottom: isStudyingFile ? undefined : 'max(0.375rem, env(safe-area-inset-bottom))',
        paddingLeft: isStudyingFile ? undefined : 'max(0.375rem, env(safe-area-inset-left))',
        paddingRight: isStudyingFile ? undefined : 'max(0.375rem, env(safe-area-inset-right))',
      }}
    >
      {/* Global Prominent Full-Screen Notification Toast */}
      <PomodoroNotificationToast
        data={pomodoroNotification}
        onClose={() => setPomodoroNotification(null)}
        onStartNext={handleStartNextFromNotification}
      />

      {/* Hidden Global File Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,application/pdf,.txt,.md,text/plain,text/markdown"
        className="hidden"
      />

      {/* Right Side Options Frame: Shown only when not in full-screen file reading */}
      {!isStudyingFile && (
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentFile={currentFile}
          onOpenFilePicker={handleOpenFilePicker}
        />
      )}

      {/* Main Workspace Frame: Full-screen when studying a file */}
      <main
        className={`flex-1 min-h-0 min-w-0 overflow-hidden relative flex flex-col ${
          isStudyingFile
            ? 'w-full h-full rounded-none border-none shadow-none bg-neutral-200'
            : 'bg-white rounded-2xl md:rounded-3xl shadow-xl'
        }`}
      >
        {activeTab === 'open-file' && (
          <OpenFileView
            currentFile={currentFile}
            onFileSelect={setCurrentFile}
            onTriggerPicker={handleOpenFilePicker}
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onSwitchToNotes={() => setActiveTab('notes')}
            pomodoroState={{
              isRunning: pomodoroIsRunning,
              timeLeft: pomodoroTimeLeft,
              mode: pomodoroMode,
              sessionElapsedSeconds,
              onTogglePlay: handleTogglePomodoroPlay,
            }}
            pomodoroSettings={pomodoroSettings}
            onUpdatePomodoroSettings={handleUpdatePomodoroSettings}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            files={studyFiles}
            onOpenFile={(file) => {
              setCurrentFile(file);
              setActiveTab('open-file');
            }}
            onDeleteFile={handleDeleteStudyFile}
            onTriggerNewFile={handleOpenFilePicker}
            onUpdateFile={handleUpdateStudyFile}
            notes={notes}
            onOpenFileAtPage={handleOpenFileAtPage}
            onAddStickyNote={handleAddStickyNote}
            onUpdateStickyNote={handleUpdateStickyNote}
            onDeleteStickyNote={handleDeleteStickyNote}
            onAddNote={handleAddNote}
            onSwitchToNotes={handleSwitchToNotes}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            studyFiles={studyFiles}
            onOpenFileAtPage={handleOpenFileAtPage}
            onUpdateStickyNote={handleUpdateStickyNote}
            onDeleteStickyNote={handleDeleteStickyNote}
            onTriggerNewFile={handleOpenFilePicker}
            initialNoteId={targetNoteIdToOpen}
          />
        )}

        {activeTab === 'pomodoro' && (
          <PomodoroView
            mode={pomodoroMode}
            timeLeft={pomodoroTimeLeft}
            isRunning={pomodoroIsRunning}
            completedCount={pomodoroCompletedCount}
            sessionElapsedSeconds={sessionElapsedSeconds}
            settings={pomodoroSettings}
            onSwitchMode={handleSwitchPomodoroMode}
            onTogglePlay={handleTogglePomodoroPlay}
            onReset={handleResetPomodoro}
            onFinalizeEarly={handleFinalizeSessionEarly}
            onAddTime={handleAddPomodoroTime}
            onUpdateSettings={handleUpdatePomodoroSettings}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            sessions={sessions}
            notes={notes}
            onClearHistory={handleClearSessions}
            onLoadSampleData={handleLoadSampleSessions}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            eyeComfortSettings={eyeComfortSettings}
            onUpdateEyeComfortSettings={setEyeComfortSettings}
            pomodoroSettings={pomodoroSettings}
            onUpdatePomodoroSettings={handleUpdatePomodoroSettings}
            studyFilesCount={studyFiles.length}
            notesCount={notes.length}
            sessionsCount={sessions.length}
            shortcuts={shortcuts}
            onUpdateShortcuts={setShortcuts}
            onResetShortcuts={() => setShortcuts({
              hand: '1',
              select: '2',
              pen: '3',
              highlighter: '4',
              ruler: '5',
              eraser: '6',
              stickyNote: '7',
              quickNotes: '8',
            })}
            onClearSessions={handleClearSessions}
            onClose={() => setActiveTab(currentFile ? 'open-file' : 'library')}
            fileName={currentFile?.name}
          />
        )}
      </main>
    </div>
  );
}
