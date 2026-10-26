import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Expand,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Hand,
  MousePointer2,
  Pencil,
  Highlighter,
  StickyNote,
  Eraser,
  CircleDot,
  MousePointerClick,
  Crosshair,
  Ruler,
  Bold,
  Keyboard,
  RotateCcw,
  Check,
  Search,
  Copy,
  Clock,
  Settings,
  Palette,
  Sun,
  Moon,
  Eye,
  Sliders,
  SlidersHorizontal,
  Save,
  HardDrive,
  Download,
  Edit3,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { StudyFile, DrawingStroke, StickyNoteItem, PomodoroMode, PomodoroSettings, EyeComfortSettings, EyeComfortMode, ToolShortcuts, NoteItem, CapsulePosition, isCapsuleVertical } from '../types';
import { PdfPage } from './PdfPage';
import { StickyNoteDrawer } from './StickyNoteDrawer';
import { SettingsView } from './SettingsView';
import { NotesView } from './NotesView';
import { FlatHandIcon } from './FlatHandIcon';
import { AppleCapsuleSlider } from './AppleCapsuleSlider';
import {
  getAllStudyFiles,
  saveStudyFileToStorage,
  deleteStudyFileFromStorage,
  saveFileEditsToStorage,
  getFileEditsFromStorage,
  registerFileHandle,
  getFileHandle,
} from '../utils/fileStorage';
import { exportAnnotatedPdf } from '../utils/exportPdf';

// Configure PDF worker from same-origin static public directory (avoids Vite module resolution and iframe CORS issues)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
}

// Standard, beautifully proportioned 2D flat palm (open) and fist (grabbing) vector cursors (compact 20px)
const CURSOR_HAND_OPEN = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512">
    <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 272c0 1.5 0 3.1 .1 4.6L67.6 283c-16-15.2-41.3-14.6-56.6 1.4s-14.6 41.3 1.4 56.6L124.8 448c43.1 41.1 100.4 64 160 64l19.2 0c97.2 0 176-78.8 176-176l0-208c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 176c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208z" fill="rgba(0,0,0,0.25)" transform="translate(10, 14)" />
    <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 272c0 1.5 0 3.1 .1 4.6L67.6 283c-16-15.2-41.3-14.6-56.6 1.4s-14.6 41.3 1.4 56.6L124.8 448c43.1 41.1 100.4 64 160 64l19.2 0c97.2 0 176-78.8 176-176l0-208c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 176c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208z" fill="#FFFFFF" stroke="#18181B" stroke-width="34" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`
)}`;

const CURSOR_HAND_CLOSED = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 512 512">
    <path d="M192 0c17.7 0 32 14.3 32 32l0 112-64 0 0-112c0-17.7 14.3-32 32-32zM64 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 80-64 0 0-80zm192 0c0-17.7 14.3-32 32-32s32 14.3 32 32l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96zm96 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 64c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64zm-96 88l0-.6c9.4 5.4 20.3 8.6 32 8.6c13.2 0 25.4-4 35.6-10.8c8.7 24.9 32.5 42.8 60.4 42.8c11.7 0 22.6-3.1 32-8.6l0 8.6c0 52.3-25.1 98.8-64 128l0 96c0 17.7-14.3 32-32 32l-160 0c-17.7 0-32-14.3-32-32l0-78.4c-17.3-7.9-33.2-18.8-46.9-32.5L69.5 357.5C45.5 333.5 32 300.9 32 267l0-27c0-35.3 28.7-64 64-64l88 0c22.1 0 40 17.9 40 40s-17.9 40-40 40l-56 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l56 0c39.8 0 72-32.2 72-72z" fill="rgba(0,0,0,0.25)" transform="translate(42, 14)" />
    <g transform="translate(32, 0)">
      <path d="M192 0c17.7 0 32 14.3 32 32l0 112-64 0 0-112c0-17.7 14.3-32 32-32zM64 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 80-64 0 0-80zm192 0c0-17.7 14.3-32 32-32s32 14.3 32 32l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96zm96 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 64c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64zm-96 88l0-.6c9.4 5.4 20.3 8.6 32 8.6c13.2 0 25.4-4 35.6-10.8c8.7 24.9 32.5 42.8 60.4 42.8c11.7 0 22.6-3.1 32-8.6l0 8.6c0 52.3-25.1 98.8-64 128l0 96c0 17.7-14.3 32-32 32l-160 0c-17.7 0-32-14.3-32-32l0-78.4c-17.3-7.9-33.2-18.8-46.9-32.5L69.5 357.5C45.5 333.5 32 300.9 32 267l0-27c0-35.3 28.7-64 64-64l88 0c22.1 0 40 17.9 40 40s-17.9 40-40 40l-56 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l56 0c39.8 0 72-32.2 72-72z" fill="#FFFFFF" stroke="#18181B" stroke-width="34" stroke-linejoin="round" stroke-linecap="round" />
    </g>
  </svg>`
)}`;

const EMPTY_STROKES: DrawingStroke[] = [];
const EMPTY_STICKY_NOTES: StickyNoteItem[] = [];

export type { ToolShortcuts };

export const DEFAULT_SHORTCUTS: ToolShortcuts = {
  hand: '1',
  select: '2',
  pen: '3',
  highlighter: '4',
  ruler: '5',
  eraser: '6',
  stickyNote: '7',
  quickNotes: '8',
};

const SHORTCUT_STORAGE_KEY = 'study_capsule_shortcuts';

// Bidirectional QWERTY English <-> Persian keyboard mapping
export const EN_TO_FA_KEY_MAP: Record<string, string> = {
  q: 'ض',
  w: 'ص',
  e: 'ث',
  r: 'ق',
  t: 'ف',
  y: 'غ',
  u: 'ع',
  i: 'ه',
  o: 'خ',
  p: 'ح',
  '[': 'ج',
  ']': 'چ',
  a: 'ش',
  s: 'س',
  d: 'ی',
  f: 'ب',
  g: 'ل',
  h: 'ا',
  j: 'ت',
  k: 'ن',
  l: 'م',
  ';': 'ک',
  "'": 'گ',
  z: 'ظ',
  x: 'ط',
  c: 'ز',
  v: 'ر',
  b: 'ذ',
  n: 'د',
  m: 'پ',
  ',': 'و',
  '1': '۱',
  '2': '۲',
  '3': '۳',
  '4': '۴',
  '5': '۵',
  '6': '۶',
  '7': '۷',
  '8': '۸',
  '9': '۹',
  '0': '۰',
};

export const FA_TO_EN_KEY_MAP: Record<string, string> = Object.entries(EN_TO_FA_KEY_MAP).reduce(
  (acc, [en, fa]) => {
    acc[fa] = en;
    return acc;
  },
  {} as Record<string, string>
);
// Additional common Persian / Arabic variants on Persian keyboards
FA_TO_EN_KEY_MAP['ي'] = 'd';
FA_TO_EN_KEY_MAP['ك'] = ';';
FA_TO_EN_KEY_MAP['آ'] = 'h';
FA_TO_EN_KEY_MAP['أ'] = 'h';
FA_TO_EN_KEY_MAP['إ'] = 'h';
FA_TO_EN_KEY_MAP['ژ'] = 'c';
FA_TO_EN_KEY_MAP['ؤ'] = 'r';
FA_TO_EN_KEY_MAP['ء'] = 'm';

/**
 * Standardize pressed key to a Latin letter or standard digit
 */
export const normalizeShortcutKey = (e: KeyboardEvent): string => {
  if (e.code && e.code.startsWith('Key')) {
    return e.code.replace('Key', '').toLowerCase();
  }
  if (e.code && e.code.startsWith('Digit')) {
    return e.code.replace('Digit', '');
  }
  if (e.code && e.code.startsWith('Numpad') && /^\d$/.test(e.code.replace('Numpad', ''))) {
    return e.code.replace('Numpad', '');
  }
  const faToEn = FA_TO_EN_KEY_MAP[e.key.toLowerCase()];
  if (faToEn) {
    return faToEn.toLowerCase();
  }
  return e.key.toLowerCase();
};

/**
 * Matches key event with a target shortcut key across both English & Persian layouts,
 * plus optional alternative number shortcut (e.g. 1-7).
 */
export const isShortcutMatch = (
  e: KeyboardEvent,
  targetKey: string,
  altNumKey?: string
): boolean => {
  if (!targetKey) return false;
  const target = targetKey.toLowerCase();
  const pressedKey = (e.key || '').toLowerCase();
  const pressedCode = (e.code || '').toLowerCase();

  const candidateTargets = altNumKey ? [target, altNumKey.toLowerCase()] : [target];

  for (const t of candidateTargets) {
    // 1. Direct e.key match
    if (pressedKey === t) return true;

    // 2. Physical code match for Latin letter (e.g. target is 'p', e.code is 'KeyP')
    if (pressedCode === ('key' + t).toLowerCase()) return true;

    // 3. Physical code match for Digit (e.g. target is '1', e.code is 'Digit1' or 'Numpad1')
    if (pressedCode === 'digit' + t || pressedCode === 'numpad' + t) return true;

    // 4. Normalized key from code or Persian reverse map
    const norm = normalizeShortcutKey(e);
    if (norm === t) return true;

    // 5. If target itself was stored as Persian (e.g. 'ح'), normalize target and compare
    const normT = FA_TO_EN_KEY_MAP[t] || t;
    if (norm === normT) return true;

    // 6. Persian character equivalent
    const faEquiv = EN_TO_FA_KEY_MAP[t];
    if (faEquiv && pressedKey === faEquiv) return true;
  }

  return false;
};

/**
 * Formats shortcut key for user display (e.g. 'P (ح)' or '3')
 */
export const formatShortcutLabel = (key: string): string => {
  if (!key) return '';
  const clean = key.toLowerCase();
  const en = FA_TO_EN_KEY_MAP[clean];
  if (en) {
    return `${en.toUpperCase()} (${clean})`;
  }
  const fa = EN_TO_FA_KEY_MAP[clean];
  if (fa && /^[a-z]$/.test(clean)) {
    return `${clean.toUpperCase()} (${fa})`;
  }
  return key.toUpperCase();
};

interface OpenFileViewProps {
  currentFile: StudyFile | null;
  onFileSelect: (file: StudyFile | null) => void;
  onTriggerPicker?: () => void;
  notes?: NoteItem[];
  onAddNote?: (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote?: (id: string, title: string, content: string, extra?: Partial<NoteItem>) => void;
  onDeleteNote?: (id: string) => void;
  onSwitchToNotes?: () => void;
  pomodoroState?: {
    isRunning: boolean;
    timeLeft: number;
    mode: PomodoroMode;
    sessionElapsedSeconds?: number;
    onTogglePlay: () => void;
  };
  pomodoroSettings?: PomodoroSettings;
  onUpdatePomodoroSettings?: (newSettings: PomodoroSettings) => void;
}

export const OpenFileView: React.FC<OpenFileViewProps> = ({
  currentFile,
  onFileSelect,
  onTriggerPicker,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onSwitchToNotes,
  pomodoroState,
  pomodoroSettings,
  onUpdatePomodoroSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // File list state
  const [savedFiles, setSavedFiles] = useState<StudyFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);

  // Load saved files from IndexedDB
  const loadSavedFiles = useCallback(async () => {
    try {
      setIsLoadingFiles(true);
      const files = await getAllStudyFiles();
      setSavedFiles(files);
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadSavedFiles();
  }, [loadSavedFiles]);

  // Deduplicated list of files for gallery (ensures no duplicate file records are rendered)
  const uniqueSavedFiles = useMemo(() => {
    const seen = new Set<string>();
    return savedFiles.filter((file) => {
      const key = (file.name || '').trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [savedFiles]);

  // PDF Document State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const totalPagesRef = useRef<number>(0);
  const [visiblePage, setVisiblePage] = useState<number>(1);
  const [inputPage, setInputPage] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [isFitMode, setIsFitMode] = useState<boolean>(true);
  const isFitModeRef = useRef<boolean>(true);
  const fitScaleRef = useRef<number>(1.0);
  const isFitWidthLocked = isFitMode || scale <= (fitScaleRef.current + 0.02);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Tool State
  const [activeTool, setActiveTool] = useState<'hand' | 'select' | 'pen' | 'highlighter' | 'ruler' | 'eraser' | 'sticky-note'>('hand');
  const [selectedItem, setSelectedItem] = useState<{
    type: 'note' | 'stroke';
    id: string;
    pageNumber: number;
  } | null>(null);
  // Hand and Select Settings State
  const [isHandSettingsOpen, setIsHandSettingsOpen] = useState<boolean>(false);
  const [isSelectSettingsOpen, setIsSelectSettingsOpen] = useState<boolean>(false);

  // Pen Settings State
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penWidth, setPenWidth] = useState<number>(2);
  const [isPenSettingsOpen, setIsPenSettingsOpen] = useState<boolean>(false);

  // Highlighter State
  const [highlighterColor, setHighlighterColor] = useState<string>('#ffea00');
  const [highlighterWidth, setHighlighterWidth] = useState<number>(18);
  const [autoStraighten, setAutoStraighten] = useState<boolean>(true);
  const [isHighlighterSettingsOpen, setIsHighlighterSettingsOpen] = useState<boolean>(false);

  // Ruler / Underline State (ابزار خط‌کش / آندرلاین)
  const [rulerColor, setRulerColor] = useState<string>('#2563eb');
  const [rulerWidth, setRulerWidth] = useState<number>(2.5);
  const [rulerLock90, setRulerLock90] = useState<boolean>(true); // قفل 90 درجه فعال به صورت پیشفرض
  const [isRulerSettingsOpen, setIsRulerSettingsOpen] = useState<boolean>(false);

  // Eraser Settings State
  const [eraserMode, setEraserMode] = useState<'area' | 'object'>(() => {
    try {
      const saved = localStorage.getItem('study_eraser_mode');
      if (saved === 'object' || saved === 'area') return saved;
    } catch {}
    return 'area';
  });
  const [eraserSize, setEraserSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_eraser_size');
      if (saved) return Number(saved);
    } catch {}
    return 28;
  });
  const [isEraserSettingsOpen, setIsEraserSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('study_eraser_mode', eraserMode);
    } catch {}
  }, [eraserMode]);

  useEffect(() => {
    try {
      localStorage.setItem('study_eraser_size', String(eraserSize));
    } catch {}
  }, [eraserSize]);

  // Sticky Note Tool Settings State
  const [isStickyNoteSettingsOpen, setIsStickyNoteSettingsOpen] = useState<boolean>(false);

  // Tool Shortcuts State
  const [shortcuts, setShortcuts] = useState<ToolShortcuts>(() => {
    try {
      const saved = localStorage.getItem(SHORTCUT_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SHORTCUTS;
  });
  const [listeningShortcutFor, setListeningShortcutFor] = useState<keyof ToolShortcuts | null>(null);

  // Persist shortcuts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcuts));
    } catch {
      // storage error
    }
  }, [shortcuts]);

  // Save Status Indicator & Exit Modal State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [showSavedToast, setShowSavedToast] = useState<string | null>(null);

  // Eye Comfort & Reading Settings State (تنظیمات راحتی چشم، نور صفحه، زرد کردن و طوسی تیره کردن فایل)
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
    } catch (e) {
      console.error('Failed to parse eye comfort settings:', e);
    }
    return {
      brightness: 100,
      colorMode: 'normal',
      warmth: 50,
    };
  });
  const [isEyeComfortOpen, setIsEyeComfortOpen] = useState<boolean>(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  // Right-click Quick Context Settings (تغییر تم و تنظیم روشنایی صفحه با کلیک راست)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);



  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    e.preventDefault();
    const menuWidth = 320;
    const menuHeight = 310;
    const padding = 16;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - padding);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - padding);
    setContextMenuPos({ x: Math.max(padding, x), y: Math.max(padding, y) });
  }, []);

  // Dismiss context menu on outside click or Escape key
  useEffect(() => {
    if (!contextMenuPos) return;
    const handleDismiss = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenuPos(null);
      }
    };
    window.addEventListener('mousedown', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuPos]);

  // Capsule Position State (موقعیت قرارگیری کپسول ابزار روی صفحه)
  const [capsulePosition, setCapsulePosition] = useState<CapsulePosition>(() => {
    try {
      const saved = localStorage.getItem('study_capsule_position');
      if (saved) return saved as CapsulePosition;
    } catch {}
    return 'bottom-center';
  });

  const isVerticalCapsule = isCapsuleVertical(capsulePosition);

  const getCapsulePositionClasses = (pos: CapsulePosition) => {
    switch (pos) {
      case 'top-center':
        return 'top-16 sm:top-20 left-1/2 -translate-x-1/2 flex-row capsule-top capsule-horizontal';
      case 'right-center':
        return 'top-1/2 -translate-y-1/2 right-2.5 sm:right-4 flex-col capsule-vertical capsule-vertical-right';
      case 'left-center':
        return 'top-1/2 -translate-y-1/2 left-2.5 sm:left-4 flex-col capsule-vertical capsule-vertical-left';
      case 'right-top':
      case 'top-right':
        return 'top-16 sm:top-20 right-2.5 sm:right-4 flex-col capsule-vertical capsule-vertical-right';
      case 'left-top':
      case 'top-left':
        return 'top-16 sm:top-20 left-2.5 sm:left-4 flex-col capsule-vertical capsule-vertical-left';
      case 'right-bottom':
      case 'bottom-right':
        return 'bottom-3 sm:bottom-6 right-2.5 sm:right-4 flex-col capsule-vertical capsule-vertical-right';
      case 'left-bottom':
      case 'bottom-left':
        return 'bottom-3 sm:bottom-6 left-2.5 sm:left-4 flex-col capsule-vertical capsule-vertical-left';
      case 'bottom-center':
      default:
        return 'bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex-row capsule-bottom capsule-horizontal';
    }
  };

  // Persist Eye Comfort Settings
  useEffect(() => {
    try {
      localStorage.setItem('study_eye_comfort_settings', JSON.stringify(eyeComfortSettings));
    } catch (e) {
      console.error('Failed to save eye comfort settings:', e);
    }
  }, [eyeComfortSettings]);

  // Global hotkeys (Alt+N to toggle Notes, Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcut: Alt + N (or Alt + د on Persian layout) to toggle notebook modal
      if (e.altKey && (e.key.toLowerCase() === 'n' || e.key === 'د' || e.code === 'KeyN')) {
        e.preventDefault();
        setIsNotesModalOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isNotesModalOpen) {
          setIsNotesModalOpen(false);
          return;
        }
        if (isEyeComfortOpen) {
          setIsEyeComfortOpen(false);
          return;
        }
        if (isFocusMode) {
          setIsFocusMode(false);
          try {
            if (document.fullscreenElement) {
              document.exitFullscreen?.().catch(() => {});
            }
          } catch {}
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEyeComfortOpen, isFocusMode, isNotesModalOpen]);

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
  const [activeStickyNote, setActiveStickyNote] = useState<StickyNoteItem | null>(null);
  const [isStickyDrawerOpen, setIsStickyDrawerOpen] = useState<boolean>(false);

  const currentFileAttachedNotes = useMemo(() => {
    if (!currentFile || !notes) return [];
    const fileNameClean = (currentFile.name || '').trim().toLowerCase();
    return notes.filter(
      (n) =>
        (n.attachedFileId && n.attachedFileId === currentFile.id) ||
        (n.attachedFileName && n.attachedFileName.trim().toLowerCase() === fileNameClean)
    );
  }, [currentFile, notes]);

  const currentPageStickyNotes = useMemo(() => {
    return stickyNotes.filter((n) => n.pageNumber === visiblePage);
  }, [stickyNotes, visiblePage]);

  const otherPagesStickyNotes = useMemo(() => {
    return stickyNotes.filter((n) => n.pageNumber !== visiblePage);
  }, [stickyNotes, visiblePage]);


  const [pageStrokes, setPageStrokes] = useState<Record<number, DrawingStroke[]>>({});

  // Refs to guarantee immediate, race-condition-free access during saves and unmounts
  const pageStrokesRef = useRef<Record<number, DrawingStroke[]>>({});
  const stickyNotesRef = useRef<StickyNoteItem[]>([]);
  const visiblePageRef = useRef<number>(1);
  const scaleRef = useRef<number>(1.2);
  const loadedFileIdRef = useRef<string | null>(null);
  const isEditsLoadedRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<any>(null);
  const hasSessionEditsRef = useRef<boolean>(false);
  const loadedDocFileIdRef = useRef<string | null>(null);
  const loadedDocBufferRef = useRef<ArrayBuffer | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Sync refs with state
  useEffect(() => {
    visiblePageRef.current = visiblePage;
  }, [visiblePage]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Load sticky notes and strokes when currentFile changes
  useEffect(() => {
    hasSessionEditsRef.current = false;
    if (!currentFile?.id) {
      loadedFileIdRef.current = null;
      isEditsLoadedRef.current = false;
      pageStrokesRef.current = {};
      stickyNotesRef.current = [];
      setStickyNotes([]);
      setPageStrokes({});
      return;
    }

    const fileId = currentFile.id;
    let isCancelled = false;

    // Reset loaded flag so auto-save never writes empty state during load!
    isEditsLoadedRef.current = false;
    loadedFileIdRef.current = null;

    const loadData = async () => {
      try {
        const edits = await getFileEditsFromStorage(fileId);
        if (isCancelled) return;

        const loadedNotes = edits?.stickyNotes || [];
        const loadedStrokes = edits?.pageStrokes || {};
        const savedPage = edits?.currentPage || 1;
        const savedScale = edits?.scale;

        pageStrokesRef.current = loadedStrokes;
        stickyNotesRef.current = loadedNotes;
        visiblePageRef.current = savedPage;

        setStickyNotes(loadedNotes);
        setPageStrokes(loadedStrokes);

        if (savedScale && savedScale >= 0.5 && savedScale <= 3.0) {
          setScale(savedScale);
          scaleRef.current = savedScale;
        }

        loadedFileIdRef.current = fileId;
        isEditsLoadedRef.current = true;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error loading edits:', err);
        if (!isCancelled) {
          loadedFileIdRef.current = fileId;
          isEditsLoadedRef.current = true;
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id]);

  // Debounced & immediate save trigger to IndexedDB and localStorage
  const triggerSave = useCallback((immediate: boolean = false) => {
    if (!currentFile?.id || !isEditsLoadedRef.current || loadedFileIdRef.current !== currentFile.id) {
      return;
    }

    const fileId = currentFile.id;
    const currentStrokes = pageStrokesRef.current;
    const currentNotes = stickyNotesRef.current;
    const currentPage = visiblePageRef.current;
    const currentScale = scaleRef.current;

    const doSave = async () => {
      setSaveStatus('saving');
      try {
        await saveFileEditsToStorage(fileId, {
          fileId,
          pageStrokes: currentStrokes,
          stickyNotes: currentNotes,
          currentPage,
          pageCount: totalPagesRef.current || totalPages || undefined,
          scale: currentScale,
          updatedAt: new Date().toISOString(),
        });
        hasSessionEditsRef.current = false;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save edits:', err);
        setSaveStatus('saved');
      }
    };

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (immediate) {
      doSave();
    } else {
      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(doSave, 350);
    }
  }, [currentFile?.id]);

  const annotatedPagesCount = useMemo(() => {
    return Object.keys(pageStrokes).filter((p) => (pageStrokes[Number(p)] || []).length > 0).length;
  }, [pageStrokes]);

  // Manual save trigger (via button, Ctrl+S, or Exit modal)
  // Saves all vector annotations, sticky notes, current page, and scale interactively into persistent storage WITHOUT destructive rasterization!
  const handleManualSave = useCallback(async () => {
    if (!currentFile?.id || !isEditsLoadedRef.current || loadedFileIdRef.current !== currentFile.id) {
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus('saving');
    try {
      const fileId = currentFile.id;
      const currentStrokes = pageStrokesRef.current;
      const currentNotes = stickyNotesRef.current;
      const currentPage = visiblePageRef.current;
      const currentScale = scaleRef.current;
      const totalP = totalPagesRef.current || totalPages || undefined;

      // 1. Save all interactive edits to IndexedDB and localStorage
      await saveFileEditsToStorage(fileId, {
        fileId,
        pageStrokes: currentStrokes,
        stickyNotes: currentNotes,
        currentPage,
        pageCount: totalP,
        scale: currentScale,
        updatedAt: new Date().toISOString(),
      });

      // 2. Ensure base clean data is preserved (never flatten into bitmap pixels)
      const baseData = currentFile.originalData || currentFile.data;
      const updatedFileRecord: StudyFile = {
        ...currentFile,
        data: baseData,
        originalData: baseData,
        pageStrokes: currentStrokes,
        stickyNotes: currentNotes,
        currentPage,
        pageCount: totalP,
        scale: currentScale,
        lastModified: new Date().toISOString(),
      };

      await saveStudyFileToStorage(updatedFileRecord);

      // 3. Update currentFile in state
      onFileSelect(updatedFileRecord);

      hasSessionEditsRef.current = false;
      setSaveStatus('saved');

      setShowSavedToast(
        `تغییرات فایل ${currentFile.name} ذخیره شد ✓ (تمام یادداشت‌ها و هایلایت‌ها به صورت تعاملی و قابل ویرایش هستند)`
      );
      setTimeout(() => setShowSavedToast(null), 3500);
      await loadSavedFiles();
    } catch (err) {
      console.error('Failed to save edits interactively:', err);
      setSaveStatus('saved');
      alert('خطا در ذخیره تغییرات روی فایل.');
    }
  }, [currentFile, loadSavedFiles, onFileSelect, totalPages]);


  // Ctrl+S / Cmd+S listener for quick manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Request Exit: Always open the Exit Modal providing the blue Save & Exit option
  const handleRequestExit = useCallback(() => {
    setIsExitModalOpen(true);
  }, []);

  // Confirm Save & Exit: guarantees baking and saving directly to file before closing
  const handleConfirmSaveAndExit = useCallback(async () => {
    await handleManualSave();
    document.body.classList.remove('hand-tool-active', 'hand-tool-panning');
    setIsExitModalOpen(false);
    setActiveTool('select');
    setIsPanning(false);
    await loadSavedFiles();
    onFileSelect(null);
  }, [handleManualSave, loadSavedFiles, onFileSelect]);

  // Confirm Discard & Exit: exits without saving latest unsaved edits
  const handleConfirmDiscardAndExit = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    document.body.classList.remove('hand-tool-active', 'hand-tool-panning');
    setIsExitModalOpen(false);
    setActiveTool('select');
    setIsPanning(false);
    await loadSavedFiles();
    onFileSelect(null);
  }, [loadSavedFiles, onFileSelect]);

  // Download with latest edits baked into PDF (all strokes, highlighters, sticky notes burned in so Adobe Acrobat and external viewers show them)
  const handleDownloadWithEdits = useCallback(async () => {
    if (!currentFile) return;
    const rawBuffer = currentFile.originalData || currentFile.data;
    if (!rawBuffer) {
      alert('اطلاعات فایل برای ایجاد خروجی دانلود در دسترس نیست.');
      return;
    }

    setIsExportingPdf(true);
    try {
      // 1. Ensure latest session edits are saved to persistent storage
      await handleManualSave();

      // 2. Clone raw array buffer for PDFDocument
      const bufferCopy = rawBuffer.slice(0);
      const currentStrokes = pageStrokesRef.current || pageStrokes;
      const currentNotes = stickyNotesRef.current || stickyNotes;

      // 3. Bake highlighters, pens, ruler lines, and sticky notes directly into PDF pages
      await exportAnnotatedPdf({
        pdfData: bufferCopy,
        fileName: currentFile.name,
        pageStrokes: currentStrokes,
        stickyNotes: currentNotes,
      });

      setShowSavedToast(
        `فایل «${currentFile.name}» با تمام آخرین ادیت‌ها دانلود شد (قابل نمایش در کلیه برنامه‌ها مثل Adobe Acrobat) ✓`
      );
      setTimeout(() => setShowSavedToast(null), 4500);
    } catch (err) {
      console.error('Failed to export annotated PDF:', err);
      alert('خطا در اعمال ادیت‌ها و ایجاد خروجی PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [currentFile, handleManualSave, pageStrokes, stickyNotes]);

  // Download with latest edits and cleanly exit file
  const handleConfirmDownloadAndExit = useCallback(async () => {
    try {
      await handleDownloadWithEdits();
      document.body.classList.remove('hand-tool-active', 'hand-tool-panning');
      setIsExitModalOpen(false);
      setActiveTool('select');
      setIsPanning(false);
      await loadSavedFiles();
      onFileSelect(null);
    } catch (err) {
      console.error('Failed to download and exit:', err);
    }
  }, [handleDownloadWithEdits, loadSavedFiles, onFileSelect]);

  // Direct Exit File fallback
  const handleExitFile = handleRequestExit;

  // Safety net on page refresh / unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentFile?.id && isEditsLoadedRef.current && loadedFileIdRef.current === currentFile.id) {
        try {
          const payload = {
            fileId: currentFile.id,
            pageStrokes: pageStrokesRef.current,
            stickyNotes: stickyNotesRef.current,
            currentPage: visiblePageRef.current,
            pageCount: totalPagesRef.current || totalPages || undefined,
            scale: scaleRef.current,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(`study_edits_${currentFile.id}`, JSON.stringify(payload));
          localStorage.setItem(`study_notes_${currentFile.id}`, JSON.stringify(stickyNotesRef.current));
          localStorage.setItem(`study_strokes_${currentFile.id}`, JSON.stringify(pageStrokesRef.current));
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (currentFile?.id && isEditsLoadedRef.current && loadedFileIdRef.current === currentFile.id) {
        saveFileEditsToStorage(currentFile.id, {
          fileId: currentFile.id,
          pageStrokes: pageStrokesRef.current,
          stickyNotes: stickyNotesRef.current,
          currentPage: visiblePageRef.current,
          pageCount: totalPagesRef.current || totalPages || undefined,
          scale: scaleRef.current,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    };
  }, [currentFile?.id, totalPages]);

  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const handleAddStroke = useCallback((pageNum: number, stroke: DrawingStroke) => {
    hasSessionEditsRef.current = true;
    setPageStrokes((prev) => {
      const updated = {
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), stroke],
      };
      pageStrokesRef.current = updated;
      return updated;
    });
    triggerSave(false);
  }, [triggerSave]);

  const handleUpdateStroke = useCallback((pageNum: number, strokeId: string, updatedStroke: DrawingStroke) => {
    hasSessionEditsRef.current = true;
    setPageStrokes((prev) => {
      const updated = {
        ...prev,
        [pageNum]: (prev[pageNum] || []).map((s) => (s.id === strokeId ? updatedStroke : s)),
      };
      pageStrokesRef.current = updated;
      return updated;
    });
    triggerSave(false);
  }, [triggerSave]);

  const handleDeleteStroke = useCallback((pageNum: number, strokeId: string) => {
    hasSessionEditsRef.current = true;
    setPageStrokes((prev) => {
      const updated = {
        ...prev,
        [pageNum]: (prev[pageNum] || []).filter((s) => s.id !== strokeId),
      };
      pageStrokesRef.current = updated;
      return updated;
    });
    setSelectedItem((prev) => (prev?.type === 'stroke' && prev.id === strokeId ? null : prev));
    triggerSave(false);
  }, [triggerSave]);

  const handleDeleteStrokes = useCallback((pageNum: number, strokeIds: string[]) => {
    if (!strokeIds || strokeIds.length === 0) return;
    hasSessionEditsRef.current = true;
    const idsSet = new Set(strokeIds);
    setPageStrokes((prev) => {
      const pageList = prev[pageNum];
      if (!pageList) return prev;
      const updatedList = pageList.filter((s) => !idsSet.has(s.id));
      if (updatedList.length === pageList.length) return prev;
      const updated = {
        ...prev,
        [pageNum]: updatedList,
      };
      pageStrokesRef.current = updated;
      return updated;
    });
    setSelectedItem((prev) => (prev?.type === 'stroke' && idsSet.has(prev.id) ? null : prev));
    triggerSave(false);
  }, [triggerSave]);

  const handleClearPageAnnotations = useCallback((pageNum: number) => {
    hasSessionEditsRef.current = true;
    setPageStrokes((prev) => {
      const updated = {
        ...prev,
        [pageNum]: [],
      };
      pageStrokesRef.current = updated;
      return updated;
    });
    setStickyNotes((prev) => {
      const updated = prev.filter((n) => n.pageNumber !== pageNum);
      stickyNotesRef.current = updated;
      return updated;
    });
    setSelectedItem(null);
    triggerSave(true);
  }, [triggerSave]);

  const handleMoveStickyNote = useCallback((noteId: string, pageNumber: number, newX: number, newY: number) => {
    hasSessionEditsRef.current = true;
    setStickyNotes((prev) => {
      const updated = prev.map((n) => (n.id === noteId ? { ...n, x: newX, y: newY, pageNumber } : n));
      stickyNotesRef.current = updated;
      return updated;
    });
    triggerSave(true);
  }, [triggerSave]);

  const handleAddStickyNote = useCallback((pageNum: number, x: number, y: number) => {
    hasSessionEditsRef.current = true;
    const newNote: StickyNoteItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: pageNum,
      x,
      y,
      title: 'یادداشت جدید',
      content: '',
      color: '#fef08a',
      textColor: '#171717',
      isBold: false,
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };
    setStickyNotes((prev) => {
      const updated = [...prev, newNote];
      stickyNotesRef.current = updated;
      return updated;
    });
    setActiveStickyNote(newNote);
    setIsStickyDrawerOpen(true);
    triggerSave(true);
  }, [triggerSave]);

  const handleOpenStickyNote = useCallback((note: StickyNoteItem) => {
    setActiveStickyNote(note);
    setIsStickyDrawerOpen(true);
  }, []);

  const handleUpdateStickyNote = useCallback((updated: StickyNoteItem) => {
    hasSessionEditsRef.current = true;
    setActiveStickyNote(updated);
    setStickyNotes((prev) => {
      const updatedList = prev.map((n) => (n.id === updated.id ? updated : n));
      stickyNotesRef.current = updatedList;
      return updatedList;
    });
    triggerSave(false);
  }, [triggerSave]);

  const handleDeleteStickyNote = useCallback((id: string) => {
    hasSessionEditsRef.current = true;
    setStickyNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      stickyNotesRef.current = updated;
      return updated;
    });
    setIsStickyDrawerOpen(false);
    setActiveStickyNote(null);
    setSelectedItem((prev) => (prev?.type === 'note' && prev.id === id ? null : prev));
    triggerSave(true);
  }, [triggerSave]);

  // Pre-group sticky notes by page number for optimal memoization
  const stickyNotesByPage = useMemo(() => {
    const map: Record<number, StickyNoteItem[]> = {};
    stickyNotes.forEach((n) => {
      if (!map[n.pageNumber]) map[n.pageNumber] = [];
      map[n.pageNumber].push(n);
    });
    return map;
  }, [stickyNotes]);

  // Clear selection when active tool changes away from select
  useEffect(() => {
    if (activeTool !== 'select') {
      setSelectedItem(null);
    }
  }, [activeTool]);

  const handleZoomIn = useCallback(() => {
    setIsFitMode(false);
    isFitModeRef.current = false;
    setScale((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const nextScale = Math.max(Number((prev - 0.15).toFixed(2)), 0.35);
      if (nextScale <= fitScaleRef.current) {
        setIsFitMode(true);
        isFitModeRef.current = true;
      }
      return nextScale;
    });
  }, []);

  const closeAllSettings = useCallback(() => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
  }, []);

  // Close any open tool settings popover when clicking/tapping anywhere outside
  const isAnyToolSettingsOpen =
    isHandSettingsOpen ||
    isSelectSettingsOpen ||
    isPenSettingsOpen ||
    isHighlighterSettingsOpen ||
    isRulerSettingsOpen ||
    isEraserSettingsOpen ||
    isStickyNoteSettingsOpen;

  useEffect(() => {
    if (!isAnyToolSettingsOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        closeAllSettings();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isAnyToolSettingsOpen, closeAllSettings]);

  const handleResetShortcut = useCallback((tool: keyof ToolShortcuts, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShortcuts((prev) => ({
      ...prev,
      [tool]: DEFAULT_SHORTCUTS[tool],
    }));
    setListeningShortcutFor(null);
  }, []);

  const handleResetAllShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
    setListeningShortcutFor(null);
  }, []);

  // Keyboard shortcut listener:
  // 1. Shortcut assignment when listening (supports English & Persian keyboard layouts)
  // 2. Zoom in (+) and Zoom out (-)
  // 3. Tool switching via configurable shortcuts (seamless in English & Persian layouts, plus 1-7 keys)
  // 4. Delete selected notes/strokes
  // 5. Escape to close popovers/deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If actively recording a shortcut for a tool
      if (listeningShortcutFor) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
          setListeningShortcutFor(null);
          return;
        }
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
          return;
        }
        const assignedKey = normalizeShortcutKey(e);
        setShortcuts((prev) => ({
          ...prev,
          [listeningShortcutFor]: assignedKey,
        }));
        setListeningShortcutFor(null);
        return;
      }

      // Check if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      // 2. Zoom shortcuts (+ and -)
      // Supports +, = (unshifted on standard US keyboards), and NumpadAdd
      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Supports -, _ (shifted), and NumpadSubtract
      if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // 3. Delete selected items (Delete / Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItem) {
          e.preventDefault();
          if (selectedItem.type === 'note') {
            handleDeleteStickyNote(selectedItem.id);
          } else if (selectedItem.type === 'stroke') {
            handleDeleteStroke(selectedItem.pageNumber, selectedItem.id);
          }
          return;
        }
      }

      // 4. Escape to cancel selection or close popovers
      if (e.key === 'Escape') {
        if (selectedItem) {
          setSelectedItem(null);
        }
        closeAllSettings();
        return;
      }

      // 5. Tool switching shortcuts (ignore when holding Ctrl / Cmd / Alt)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (isShortcutMatch(e, shortcuts.hand, '1')) {
        e.preventDefault();
        setActiveTool('hand');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.select, '2')) {
        e.preventDefault();
        setActiveTool('select');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.pen, '3')) {
        e.preventDefault();
        setActiveTool('pen');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.highlighter, '4')) {
        e.preventDefault();
        setActiveTool('highlighter');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.ruler, '5')) {
        e.preventDefault();
        setActiveTool('ruler');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.eraser, '6')) {
        e.preventDefault();
        setActiveTool('eraser');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.stickyNote, '7')) {
        e.preventDefault();
        setActiveTool('sticky-note');
        closeAllSettings();
      } else if (isShortcutMatch(e, shortcuts.quickNotes || '8', '8')) {
        e.preventDefault();
        setIsNotesModalOpen((prev) => !prev);
        closeAllSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    listeningShortcutFor,
    selectedItem,
    handleDeleteStickyNote,
    handleDeleteStroke,
    shortcuts,
    handleZoomIn,
    handleZoomOut,
    closeAllSettings,
  ]);

  const handleHandClick = () => {
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'hand') {
      setActiveTool('hand');
    } else {
      setIsHandSettingsOpen((prev) => !prev);
    }
  };

  const handleHandDoubleClick = () => {
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('hand');
    setIsHandSettingsOpen(true);
  };

  const handleSelectClick = () => {
    setIsHandSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'select') {
      setActiveTool('select');
    } else {
      setIsSelectSettingsOpen((prev) => !prev);
    }
  };

  const handleSelectDoubleClick = () => {
    setIsHandSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('select');
    setIsSelectSettingsOpen(true);
  };

  const handlePenClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'pen') {
      setActiveTool('pen');
    } else {
      setIsPenSettingsOpen((prev) => !prev);
    }
  };

  const handlePenDoubleClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('pen');
    setIsPenSettingsOpen(true);
  };

  const handleHighlighterClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'highlighter') {
      setActiveTool('highlighter');
    } else {
      setIsHighlighterSettingsOpen((prev) => !prev);
    }
  };

  const handleHighlighterDoubleClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('highlighter');
    setIsHighlighterSettingsOpen(true);
  };

  const handleRulerClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'ruler') {
      setActiveTool('ruler');
    } else {
      setIsRulerSettingsOpen((prev) => !prev);
    }
  };

  const handleRulerDoubleClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('ruler');
    setIsRulerSettingsOpen(true);
  };

  const handleEraserClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'eraser') {
      setActiveTool('eraser');
    } else {
      setIsEraserSettingsOpen((prev) => !prev);
    }
  };

  const handleEraserDoubleClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsStickyNoteSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('eraser');
    setIsEraserSettingsOpen(true);
  };

  const handleStickyNoteClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setListeningShortcutFor(null);
    if (activeTool !== 'sticky-note') {
      setActiveTool('sticky-note');
    } else {
      setIsStickyNoteSettingsOpen((prev) => !prev);
    }
  };

  const handleStickyNoteDoubleClick = () => {
    setIsHandSettingsOpen(false);
    setIsSelectSettingsOpen(false);
    setIsPenSettingsOpen(false);
    setIsHighlighterSettingsOpen(false);
    setIsRulerSettingsOpen(false);
    setIsEraserSettingsOpen(false);
    setListeningShortcutFor(null);
    setActiveTool('sticky-note');
    setIsStickyNoteSettingsOpen(true);
  };

  // Smooth universal pointer listener for Hand tool drag & pan
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!panLastPointRef.current || !scrollContainerRef.current) return;
      const dx = e.clientX - panLastPointRef.current.x;
      const dy = e.clientY - panLastPointRef.current.y;
      panLastPointRef.current = { x: e.clientX, y: e.clientY };

      // Instant delta-based scrolling: perfectly handles RTL/LTR across Chrome, Safari, Firefox, and touchscreens!
      scrollContainerRef.current.scrollBy({
        left: -dx,
        top: -dy,
        behavior: 'instant' as ScrollBehavior,
      });
    };

    const handleWindowPointerUp = () => {
      setIsPanning(false);
      panLastPointRef.current = null;
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isPanning]);

  // Sync cursor classes on document body so no child element ever switches cursor back to arrow
  // Crucial: Only active when a file is open (Boolean(currentFile)), never in the file picker / empty gallery
  useEffect(() => {
    if (Boolean(currentFile) && activeTool === 'hand') {
      document.body.classList.add('hand-tool-active');
      if (isPanning) {
        document.body.classList.add('hand-tool-panning');
      } else {
        document.body.classList.remove('hand-tool-panning');
      }
    } else {
      document.body.classList.remove('hand-tool-active');
      document.body.classList.remove('hand-tool-panning');
    }
    return () => {
      document.body.classList.remove('hand-tool-active');
      document.body.classList.remove('hand-tool-panning');
    };
  }, [currentFile, activeTool, isPanning]);

  // Ensure that whenever currentFile is null (file closed / picker gallery), cursor and tool revert cleanly
  useEffect(() => {
    if (!currentFile) {
      document.body.classList.remove('hand-tool-active', 'hand-tool-panning');
      setIsPanning(false);
      setActiveTool('select');
    }
  }, [currentFile]);

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'hand' && scrollContainerRef.current) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      setIsPanning(true);
      panLastPointRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
      try {
        scrollContainerRef.current.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !panLastPointRef.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const rawDx = e.clientX - panLastPointRef.current.x;
    const dy = e.clientY - panLastPointRef.current.y;
    panLastPointRef.current = { x: e.clientX, y: e.clientY };

    // Strictly lock horizontal panning if isFitWidthLocked is true or if content fits without overflow
    // When in Fit Mode, horizontal displacement is 100% blocked (dx = 0)
    const allowHorizontal = !isFitWidthLocked && (container.scrollWidth > container.clientWidth + 12);
    const dx = allowHorizontal ? rawDx : 0;

    container.scrollBy({
      left: -dx,
      top: -dy,
      behavior: 'instant' as ScrollBehavior,
    });
  };

  const handleContainerScroll = () => {
    if (isFitWidthLocked && scrollContainerRef.current) {
      if (scrollContainerRef.current.scrollLeft !== 0) {
        scrollContainerRef.current.scrollLeft = 0;
      }
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      panLastPointRef.current = null;
      try {
        scrollContainerRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };


  // Compute Fit Width automatically on load, resize, and manual toggle
  const computeFitWidth = useCallback(async (doc: pdfjsLib.PDFDocumentProxy) => {
    try {
      const container = scrollContainerRef.current;
      if (!container) return;

      // 1. Get current visible page (or page 1) to determine true document page dimensions
      const targetPageNum = visiblePageRef.current && visiblePageRef.current >= 1 ? visiblePageRef.current : 1;
      const curPage = await doc.getPage(Math.min(targetPageNum, doc.numPages));
      const baseViewport = curPage.getViewport({ scale: 1 });

      // 2. Measure actual available width in the scroll container
      const compStyle = window.getComputedStyle(container);
      const padLeft = parseFloat(compStyle.paddingLeft) || 0;
      const padRight = parseFloat(compStyle.paddingRight) || 0;

      // In modern browsers, container.clientWidth is the inner width minus vertical scrollbar (if present)
      const containerClientWidth = container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 600);

      // Available width inside container padding with 2px buffer for page borders
      const availableWidth = Math.max(containerClientWidth - padLeft - padRight - 2, 160);

      // Calculate precision scale factor (up to 3 decimal places for pixel-perfect fit)
      const exactScale = availableWidth / baseViewport.width;
      const clampedScale = Math.max(0.25, Math.min(3.5, Number(exactScale.toFixed(3))));

      fitScaleRef.current = clampedScale;
      scaleRef.current = clampedScale;
      setScale(clampedScale);
      setIsFitMode(true);
      isFitModeRef.current = true;

      // Lock horizontal scroll position strictly to 0
      container.scrollLeft = 0;
    } catch {
      setScale(1.0);
    }
  }, []);

  // Automatically re-compute fit width on window resize / orientation change / container dimension change
  useEffect(() => {
    const container = scrollContainerRef.current;
    let resizeTimeout: any;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (pdfDoc && isFitModeRef.current) {
          computeFitWidth(pdfDoc);
        }
      }, 60);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(container);
    }

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [pdfDoc, computeFitWidth]);

  const scrollToPage = useCallback((pageNum: number) => {
    if (pageNum < 1) return;
    const element = document.getElementById(`pdf-page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handlePageVisible = useCallback((pageNum: number) => {
    setVisiblePage(pageNum);
    visiblePageRef.current = pageNum;
    triggerSave(false);
  }, [triggerSave]);

  // Load PDF when currentFile changes
  useEffect(() => {
    if (!currentFile || !currentFile.data) {
      loadedDocFileIdRef.current = null;
      loadedDocBufferRef.current = null;
      setPdfDoc(null);
      setTotalPages(0);
      setVisiblePage(1);
      setInputPage('1');
      return;
    }

    const rawBuffer = currentFile.originalData || currentFile.data;
    // Prevent redundant PDF re-parsing if the same file buffer is already active in pdfDoc
    if (
      currentFile.id === loadedDocFileIdRef.current &&
      rawBuffer === loadedDocBufferRef.current &&
      pdfDoc
    ) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const loadDoc = async () => {
      try {
        const bufferCopy = rawBuffer.slice(0);
        const origin = window.location.origin;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({
          data: bufferCopy,
          cMapUrl: `${origin}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${origin}/standard_fonts/`,
          enableXfa: true,
          disableFontFace: true,
          useSystemFonts: false,
        });

        const doc = await loadingTask.promise;

        if (isCancelled) return;
        loadedDocFileIdRef.current = currentFile.id;
        loadedDocBufferRef.current = rawBuffer;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        totalPagesRef.current = doc.numPages;

        // Restore saved page position if available
        const savedPage = visiblePageRef.current;
        const targetPage = savedPage && savedPage >= 1 && savedPage <= doc.numPages ? savedPage : 1;
        setVisiblePage(targetPage);
        setInputPage(String(targetPage));

        // Immediately persist pageCount to the file storage record
        if (currentFile?.id) {
          saveFileEditsToStorage(currentFile.id, {
            fileId: currentFile.id,
            pageStrokes: pageStrokesRef.current,
            stickyNotes: stickyNotesRef.current,
            currentPage: targetPage,
            pageCount: doc.numPages,
            scale: scaleRef.current,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }

        setIsLoading(false);

        // Automatically open fitted to width with accurate DOM metrics after render
        setTimeout(() => {
          if (!isCancelled && doc) {
            computeFitWidth(doc);
          }
        }, 50);

        // Smoothly scroll to the last viewed/edited page
        if (targetPage > 1) {
          setTimeout(() => {
            scrollToPage(targetPage);
          }, 350);
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        console.error('Error rendering PDF:', err);
        setErrorMsg('خطا در بارگذاری فایل PDF. ممکن است فایل آسیب دیده یا رمزگذاری شده باشد.');
        setIsLoading(false);
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
    };
  }, [currentFile, computeFitWidth, scrollToPage, pdfDoc]);

  // Keep input page in sync with scroll
  useEffect(() => {
    setInputPage(String(visiblePage));
  }, [visiblePage]);

  // Handle file addition / upload (reusing existing file if same name to avoid duplicates)
  const processAndSaveFile = async (file: File, fileHandle?: any) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('لطفاً یک فایل با پسوند PDF انتخاب کنید.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const targetName = (file.name || '').trim().toLowerCase();

      // Check if file already exists in library to prevent duplicates
      const existing = savedFiles.find(
        (f) => (f.name || '').trim().toLowerCase() === targetName
      );

      let targetFile: StudyFile;
      if (existing) {
        // Reuse existing file entry and ID to maintain bookmarks, page position, and notes
        targetFile = {
          ...existing,
          size: file.size,
          data: buffer,
          originalData: buffer.slice(0),
          fileHandle: fileHandle || existing.fileHandle || getFileHandle(existing.id) || getFileHandle(targetName),
        };
      } else {
        targetFile = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          data: buffer,
          originalData: buffer.slice(0),
          fileHandle: fileHandle,
          uploadDate: new Date().toLocaleDateString('fa-IR'),
        };
      }

      if (fileHandle) {
        registerFileHandle(targetFile.id, fileHandle);
        registerFileHandle(targetName, fileHandle);
      }

      await saveStudyFileToStorage(targetFile);
      await loadSavedFiles();
      onFileSelect(targetFile);
    } catch {
      alert('خطا در خواندن و ذخیره فایل.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSaveFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndSaveFile(file);
    }
  };

  const handleDeleteFile = async (id: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`آیا از حذف «${fileName}» از لیست اطمینان دارید؟`)) {
      await deleteStudyFileFromStorage(id, fileName);
      await loadSavedFiles();
      if (currentFile?.id === id || currentFile?.name === fileName) {
        onFileSelect(null);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} بایت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
  };

  const cleanFileName = (name?: string): string => {
    if (!name) return 'فایل بدون نام';
    return name.replace(/\.pdf$/i, '').trim() || name;
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(inputPage, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      scrollToPage(num);
    } else {
      setInputPage(String(visiblePage));
    }
  };

  const handleFitWidth = useCallback(() => {
    if (pdfDoc) {
      setIsFitMode(true);
      isFitModeRef.current = true;
      computeFitWidth(pdfDoc);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
      }
    }
  }, [pdfDoc, computeFitWidth]);

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const nextState = !prev;
      if (nextState) {
        // Automatically request browser fullscreen if available
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }
        } catch {}
        // Automatically fit file to full screen width
        setTimeout(() => {
          if (pdfDoc) {
            handleFitWidth();
          }
        }, 150);
      } else {
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
        } catch {}
      }
      return nextState;
    });
  };

  // Listen to browser fullscreen changes (e.g. Esc key pressed)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false);
        setTimeout(() => {
          if (pdfDoc && isFitModeRef.current) {
            handleFitWidth();
          }
        }, 150);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFocusMode, pdfDoc, handleFitWidth]);

  const handleResetZoom = useCallback(() => {
    if (isFitMode) {
      setIsFitMode(false);
      isFitModeRef.current = false;
      setScale(1.2);
    } else {
      handleFitWidth();
    }
  }, [isFitMode, handleFitWidth]);

  // VIEW 1: FILE GALLERY / SELECTION (When no file is open)
  if (!currentFile) {
    const handleTrigger = async () => {
      if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
        try {
          // @ts-ignore
          const [handle] = await window.showOpenFilePicker({
            types: [
              {
                description: 'فایل‌های PDF',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
            multiple: false,
          });
          const diskFile = await handle.getFile();
          await processAndSaveFile(diskFile, handle);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }
      if (onTriggerPicker) {
        onTriggerPicker();
      } else {
        fileInputRef.current?.click();
      }
    };

    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto bg-neutral-50/50 cursor-default select-auto">
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {/* Header & Upload Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>فایل‌های مطالعه</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                یک فایل را برای مطالعه انتخاب کنید یا از دکمه زیر فایل جدیدی باز نمایید.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,application/pdf"
                className="hidden"
              />
              <button
                onClick={handleTrigger}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>باز کردن فایل جدید از دستگاه</span>
              </button>
            </div>
          </div>

          {/* List / Cards of Saved Files */}
          <div>
            {isLoadingFiles ? (
              <div className="p-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال بارگذاری فایل‌ها...</span>
              </div>
            ) : uniqueSavedFiles.length === 0 ? (
              <div className="p-12 bg-white border border-neutral-200 rounded-2xl text-center flex flex-col items-center justify-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4 text-neutral-800">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">هنوز فایلی باز نشده است</h3>
                <p className="text-xs text-neutral-500 mb-6 max-w-sm">
                  برای باز کردن و مطالعه جزوه یا کتاب خود، روی دکمه زیر کلیک کنید تا پنجره انتخاب فایل باز شود.
                </p>
                <button
                  onClick={handleTrigger}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>انتخاب و باز کردن فایل PDF</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-800">
                    لیست فایل‌های آماده برای مطالعه ({uniqueSavedFiles.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {uniqueSavedFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => onFileSelect(file)}
                      className="p-4 rounded-2xl border border-neutral-200/80 hover:border-neutral-300 hover:shadow-md bg-white transition-all cursor-pointer flex items-center justify-between group ios-spring-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-600 flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="text-xs md:text-sm font-bold text-neutral-800 group-hover:text-black truncate leading-snug"
                            title={file.name}
                          >
                            {cleanFileName(file.name)}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 font-mono">
                            <span>{formatFileSize(file.size)}</span>
                            {file.currentPage && file.currentPage > 1 && (
                              <>
                                <span>·</span>
                                <span>صفحه {file.currentPage}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 mr-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ios-spring-tool"
                          title="حذف فایل از لیست"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold px-3 py-1.5 bg-neutral-900 group-hover:bg-neutral-800 text-white rounded-xl transition-colors shadow-2xs ios-spring-btn">
                          مطالعه
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: FULL-SCREEN PDF READER (When a file is open)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`w-full h-full flex flex-col bg-neutral-200/90 overflow-hidden ${
        isFocusMode ? 'fixed inset-0 z-50 bg-neutral-900' : 'relative'
      }`}
    >
      {/* Full-Screen File Header Bar & Navigation Controls */}
      <header
        className={`bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shrink-0 z-30 select-none transition-all duration-300 shadow-2xs ${
          isFocusMode
            ? 'h-0 py-0 opacity-0 pointer-events-none overflow-hidden border-b-0'
            : 'h-13 opacity-100'
        }`}
      >
        <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 max-w-full">
          {/* Right Section: Exit Button & File Info */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {/* Exit Button (Red style) */}
            <button
              onClick={handleExitFile}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-95 rounded-xl shadow-xs shadow-rose-600/20 transition-all cursor-pointer shrink-0 group"
              title="خروج از فایل"
            >
              <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover:translate-x-0.5" />
              <span className="hidden xs:inline">خروج</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-[1px] bg-neutral-200 shrink-0 hidden xs:block" />

            {/* File Info */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h3
                    className="text-xs sm:text-sm font-bold text-neutral-800 truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[180px] md:max-w-xs"
                    title={currentFile.name}
                  >
                    {currentFile.name}
                  </h3>
                  {saveStatus === 'saving' ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-full shrink-0 font-medium border border-amber-200/60">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span className="hidden md:inline">در حال ذخیره...</span>
                    </span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                      title="تمام تغییرات ذخیره است"
                    />
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-mono tabular-nums truncate hidden sm:block">
                  {formatFileSize(currentFile.size)} {totalPages > 0 ? `· ${totalPages} صفحه` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Center Section: Page Navigation & Zoom Controls */}
          <div className="flex items-center bg-neutral-100 border border-neutral-200/70 p-0.5 sm:p-1 rounded-2xl shadow-2xs gap-0.5 shrink-0">
            {/* Page Step Prev */}
            <button
              onClick={() => scrollToPage(visiblePage - 1)}
              disabled={visiblePage <= 1 || isLoading}
              className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="صفحه قبلی"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            {/* Jump to Page Form */}
            <form onSubmit={handlePageInputSubmit} className="flex items-center text-xs px-0.5">
              <input
                type="text"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onBlur={handlePageInputSubmit}
                className="w-7 sm:w-9 text-center font-mono font-bold tabular-nums text-neutral-900 bg-white border border-neutral-200/80 rounded-md py-0.5 px-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
              <span className="text-neutral-400 mx-1 font-mono tabular-nums text-[10px] sm:text-[11px]">
                / {totalPages || 1}
              </span>
            </form>

            {/* Page Step Next */}
            <button
              onClick={() => scrollToPage(visiblePage + 1)}
              disabled={visiblePage >= totalPages || isLoading}
              className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="صفحه بعدی"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Divider */}
            <div className="h-4 w-[1px] bg-neutral-200 mx-0.5 hidden sm:block" />

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              className="hidden sm:flex p-1 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="کوچک‌نمایی (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Zoom % */}
            <button
              onClick={handleResetZoom}
              className="hidden md:flex px-1.5 py-0.5 text-[11px] font-mono font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-white rounded-md tabular-nums transition-colors cursor-pointer"
              title="اندازه پیش‌فرض (۱۲۰٪)"
            >
              {Math.round(scale * 100)}%
            </button>

            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              className="hidden sm:flex p-1 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              title="بزرگ‌نمایی (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Fit width */}
            <button
              onClick={handleFitWidth}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all ${
                isFitMode
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white'
              }`}
              title="فیت به عرض صفحه"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">فیت</span>
            </button>
          </div>

          {/* Left Section: Pomodoro, Notes, Settings, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Mini Pomodoro Capsule */}
            {pomodoroState && (
              <button
                onClick={pomodoroState.onTogglePlay}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer ${
                  pomodoroState.isRunning
                    ? 'bg-amber-500/10 text-amber-900 border-amber-300 shadow-2xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 border-neutral-200/80'
                }`}
                title={
                  pomodoroState.isRunning
                    ? `پومودورو فعال (${pomodoroState.mode === 'focus' ? 'تمرکز' : 'استراحت'}) - کلیک برای توقف`
                    : 'پومودورو متوقف - کلیک برای ادامه'
                }
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="tabular-nums text-xs">
                  {String(Math.floor(pomodoroState.timeLeft / 60)).padStart(2, '0')}:
                  {String(pomodoroState.timeLeft % 60).padStart(2, '0')}
                </span>
                {pomodoroState.isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            )}

            {/* Sticky Notes Side Drawer Button */}
            <button
              onClick={() => {
                if (stickyNotes.length > 0) {
                  const currentNote = stickyNotes.find((n) => n.pageNumber === visiblePage) || stickyNotes[0];
                  setActiveStickyNote(currentNote);
                  setIsStickyDrawerOpen(true);
                } else {
                  handleAddStickyNote(visiblePage, 120, 120);
                }
              }}
              className={`relative p-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isStickyDrawerOpen
                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                  : stickyNotes.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                  : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 border-neutral-200/80'
              }`}
              title={
                stickyNotes.length > 0
                  ? `یادداشت‌های چسبان (${stickyNotes.length} یادداشت) - کلیک برای باز کردن در پنل کناری`
                  : 'افزودن یادداشت چسبان به این صفحه'
              }
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-600" />
              {stickyNotes.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none shadow-xs">
                  {stickyNotes.length}
                </span>
              )}
            </button>

            {/* Notes Drawer Button */}
            <button
              onClick={() => setIsNotesModalOpen(true)}
              className={`relative p-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isNotesModalOpen
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                  : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 border-neutral-200/80'
              }`}
              title="دفترچه یادداشت"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {notes && notes.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none shadow-xs">
                  {notes.length}
                </span>
              )}
            </button>

            {/* Settings / Eye Comfort Button */}
            <button
              onClick={() => setIsEyeComfortOpen(true)}
              className={`relative p-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isEyeComfortOpen
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                  : eyeComfortSettings.colorMode !== 'normal' || eyeComfortSettings.brightness !== 100
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                  : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 border-neutral-200/80'
              }`}
              title="تنظیمات راحتی چشم و نور صفحه"
            >
              <Settings className="w-3.5 h-3.5" />
              {(eyeComfortSettings.colorMode !== 'normal' || eyeComfortSettings.brightness !== 100) && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </button>


            {/* Fullscreen Button (Black style) */}
            <button
              onClick={handleToggleFocusMode}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              title="حالت تمام صفحه"
            >
              <Expand className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">تمام صفحه</span>
            </button>
          </div>
        </div>
      </header>

      {/* 100% Full Width & Height Continuous Scroll PDF Canvas */}
      <div
        ref={scrollContainerRef}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerCancel={handleContainerPointerUp}
        onScroll={handleContainerScroll}
        style={{
          touchAction: activeTool === 'hand' ? 'none' : (isFitWidthLocked ? 'pan-y' : 'auto'),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          overscrollBehaviorX: 'none',
          scrollbarGutter: 'stable',
          cursor:
            activeTool === 'hand'
              ? isPanning
                ? `url('/cursors/closedhand.svg') 10 10, url('${CURSOR_HAND_CLOSED}') 10 10, grabbing`
                : `url('/cursors/openhand.svg') 10 10, url('${CURSOR_HAND_OPEN}') 10 10, grab`
              : 'default',
        }}
        className={`flex-1 overflow-y-auto ${
          isFitWidthLocked ? 'overflow-x-hidden' : 'overflow-x-auto'
        } p-2 sm:p-4 md:p-6 w-full select-none transition-colors duration-300 ${
          activeTool === 'hand'
            ? isPanning
              ? 'hand-tool-container is-panning'
              : 'hand-tool-container'
            : ''
        } ${
          eyeComfortSettings.colorMode === 'dark-gray'
            ? 'bg-[#151518]'
            : eyeComfortSettings.colorMode === 'yellow'
            ? 'bg-[#f4efe4]'
            : eyeComfortSettings.colorMode === 'soft-gray'
            ? 'bg-[#e8e8ed]'
            : isFocusMode
            ? 'bg-neutral-900'
            : 'bg-neutral-200/90'
        }`}
      >
        {isLoading && (
          <div className="my-auto flex flex-col items-center justify-center text-neutral-600 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
            <span className="text-xs">در حال بارگذاری و فیت کردن صفحات جزوه...</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-auto flex flex-col items-center justify-center text-rose-600 gap-2">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs">{errorMsg}</span>
          </div>
        )}

        {/* Continuous Page Stack with Proper Centering and Overflow Expansion */}
        {!isLoading && pdfDoc && (
          <div
            className={`min-w-full flex flex-col items-center py-2 ${isFitWidthLocked ? 'w-full' : 'w-max'}`}
            style={{
              filter: `brightness(${eyeComfortSettings.brightness}%)`,
              willChange: 'filter',
            }}
          >
            {pageNumbers.map((num) => (
              <PdfPage
                key={num}
                pdfDoc={pdfDoc}
                pageNumber={num}
                scale={scale}
                isFitMode={isFitWidthLocked}
                eyeComfortSettings={eyeComfortSettings}
                onVisible={handlePageVisible}
                activeTool={activeTool}
                eraserMode={eraserMode}
                eraserSize={eraserSize}
                penColor={penColor}
                penWidth={penWidth}
                highlighterColor={highlighterColor}
                highlighterWidth={highlighterWidth}
                autoStraighten={autoStraighten}
                rulerColor={rulerColor}
                rulerWidth={rulerWidth}
                rulerLock90={rulerLock90}
                strokes={pageStrokes[num] || EMPTY_STROKES}
                onAddStroke={handleAddStroke}
                onUpdateStroke={handleUpdateStroke}
                onDeleteStroke={handleDeleteStroke}
                onDeleteStrokes={handleDeleteStrokes}
                onClearPageAnnotations={handleClearPageAnnotations}
                stickyNotes={stickyNotesByPage[num] || EMPTY_STICKY_NOTES}
                onAddStickyNote={handleAddStickyNote}
                onMoveStickyNote={handleMoveStickyNote}
                onDeleteStickyNote={handleDeleteStickyNote}
                onOpenStickyNote={handleOpenStickyNote}
                selectedItem={selectedItem}
                onSelectItem={setSelectedItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Tools Capsule (کپسول ابزار با موقعیت شناور و قابل جابه‌جایی) */}
      <div
        ref={toolbarRef}
        className={`absolute z-40 bg-white shadow-[0_12px_36px_rgba(0,0,0,0.14)] flex items-center select-none animate-ios-jelly overflow-visible transition-[top,bottom,left,right,transform] duration-200 transform-gpu max-w-[calc(100vw-16px)] sm:max-w-fit ${
          isVerticalCapsule
            ? 'px-1.5 sm:px-2 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl gap-1 sm:gap-1.5'
            : 'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full gap-1 sm:gap-1.5'
        } ${getCapsulePositionClasses(capsulePosition)}`}
      >
        {/* Hand Tool (ابزار دست - جابه‌جایی) with Double-Click Settings Popover */}
        <div className="relative shrink-0">
          <button
            onClick={handleHandClick}
            onDoubleClick={handleHandDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'hand'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار دست (نشانگر و جابه‌جایی صفحه) [${formatShortcutLabel(shortcuts.hand)}] یا کلید ۱`}
          >
            <FlatHandIcon className="w-4 h-4 shrink-0" />
            {!isVerticalCapsule && (
              <span className={activeTool === 'hand' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>دست</span>
            )}
          </button>

          {/* Hand Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isHandSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
                <div className="flex items-center gap-1.5">
                  <FlatHandIcon className="w-4 h-4 text-neutral-800" />
                  <span className="text-xs font-bold text-neutral-900">تنظیمات ابزار دست</span>
                </div>
                <button
                  onClick={() => setIsHandSettingsOpen(false)}
                  className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                  title="بستن تنظیمات"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Description */}
              <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed whitespace-normal">
                با ابزار دست می‌توانید آزادانه در صفحات فایل PDF اسکرول کنید و صفحه را به هر جهت جابه‌جا نمایید.
              </p>

              {/* Shortcut Setting */}
              <div className="pt-2.5 mt-1 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setListeningShortcutFor(listeningShortcutFor === 'hand' ? null : 'hand')}
                    className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                      listeningShortcutFor === 'hand'
                        ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                    }`}
                    title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                  >
                    {listeningShortcutFor === 'hand' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.hand)}
                  </button>
                  {shortcuts.hand !== DEFAULT_SHORTCUTS.hand && (
                    <button
                      type="button"
                      onClick={(e) => handleResetShortcut('hand', e)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                      title="بازنشانی شورتکات به پیش‌فرض"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />

        {/* Select Tool (ابزار سلکت - انتخاب و جابه‌جایی ادیت‌ها) with Double-Click Settings Popover */}
        <div className="relative shrink-0">
          <button
            onClick={handleSelectClick}
            onDoubleClick={handleSelectDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'select'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار سلکت (انتخاب و جابه‌جایی) [${formatShortcutLabel(shortcuts.select)}] یا کلید ۲`}
          >
            <MousePointer2 className="w-4 h-4 shrink-0" />
            {!isVerticalCapsule && (
              <span className={activeTool === 'select' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>سلکت</span>
            )}
          </button>

          {/* Select Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isSelectSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
              {/* Popover Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
                <div className="flex items-center gap-1.5">
                  <MousePointer2 className="w-4 h-4 text-neutral-800" />
                  <span className="text-xs font-bold text-neutral-900">تنظیمات ابزار سلکت</span>
                </div>
                <button
                  onClick={() => setIsSelectSettingsOpen(false)}
                  className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                  title="بستن تنظیمات"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Description */}
              <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed whitespace-normal">
                با ابزار سلکت می‌توانید روی خطوط کشیده‌شده یا یادداشت‌ها کلیک کنید تا آن‌ها را جابه‌جا کرده یا حذف نمایید.
              </p>

              {/* Shortcut Setting */}
              <div className="pt-2.5 mt-1 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setListeningShortcutFor(listeningShortcutFor === 'select' ? null : 'select')}
                    className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                      listeningShortcutFor === 'select'
                        ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                    }`}
                    title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                  >
                    {listeningShortcutFor === 'select' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.select)}
                  </button>
                  {shortcuts.select !== DEFAULT_SHORTCUTS.select && (
                    <button
                      type="button"
                      onClick={(e) => handleResetShortcut('select', e)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                      title="بازنشانی شورتکات به پیش‌فرض"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />

        {/* Pen Tool (ابزار مداد) with Double-Click Settings Popover */}
        <div className="relative shrink-0">
          <button
            onClick={handlePenClick}
            onDoubleClick={handlePenDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool relative ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'pen'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار مداد [${formatShortcutLabel(shortcuts.pen)}] یا کلید ۳ (دوبار کلیک برای تنظیمات)`}
          >
            <Pencil className="w-4 h-4 shrink-0" />
            {!isVerticalCapsule && (
              <span className={activeTool === 'pen' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>مداد</span>
            )}
            {/* Color Indicator Dot */}
            <span
              className={`rounded-full border border-white/60 shadow-2xs shrink-0 ${
                isVerticalCapsule ? 'absolute bottom-1 right-1 w-2 h-2' : 'w-2.5 h-2.5'
              }`}
              style={{ backgroundColor: penColor }}
            />
          </button>

          {/* Smooth Animated Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isPenSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">تنظیمات مداد</span>
              </div>
              <button
                onClick={() => setIsPenSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                title="بستن تنظیمات"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Color Selection (انتخاب رنگ) */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-neutral-500 block mb-2">انتخاب رنگ:</span>
              <div className="flex items-center justify-between gap-1.5">
                {[
                  { hex: '#ef4444', label: 'قرمز' },
                  { hex: '#2563eb', label: 'آبی' },
                  { hex: '#16a34a', label: 'سبز' },
                  { hex: '#171717', label: 'مشکی (تطبیقی با حالت تاریک)' },
                  { hex: '#ffffff', label: 'سفید' },
                  { hex: '#d97706', label: 'نارنجی' },
                  { hex: '#9333ea', label: 'بنفش' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setPenColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full cursor-pointer shadow-2xs relative flex items-center justify-center ios-spring-tool ${
                      c.hex.toLowerCase() === '#ffffff' ? 'border border-neutral-300' : ''
                    } ${
                      penColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                        : ''
                    }`}
                    title={c.label}
                  />
                ))}

                {/* Custom Color Input */}
                <label
                  className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0 ios-spring-tool"
                  title="رنگ دلخواه"
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    }}
                  />
                  <input
                    type="color"
                    value={penColor}
                    onChange={(e) => setPenColor(e.target.value)}
                    className="absolute opacity-0 inset-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Thickness Selection (ضخامت خط) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-500">ضخامت خط:</span>
                <span className="text-xs font-mono font-bold text-neutral-900 tabular-nums">
                  {penWidth} px
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
                className="w-full accent-neutral-900 cursor-pointer h-1.5 bg-neutral-200 rounded-lg appearance-none"
              />

              {/* Live Line Preview */}
              <div className="mt-3 p-2 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-center h-8">
                <div
                  style={{
                    height: `${penWidth}px`,
                    backgroundColor: penColor,
                    borderRadius: `${penWidth / 2}px`,
                  }}
                  className="w-4/5 transition-all"
                />
              </div>
            </div>

            {/* Shortcut Setting (شورتکات کیبورد) */}
            <div className="pt-2.5 mt-3 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setListeningShortcutFor(listeningShortcutFor === 'pen' ? null : 'pen')}
                  className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                    listeningShortcutFor === 'pen'
                      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                  }`}
                  title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                >
                  {listeningShortcutFor === 'pen' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.pen)}
                </button>
                {shortcuts.pen !== DEFAULT_SHORTCUTS.pen && (
                  <button
                    type="button"
                    onClick={(e) => handleResetShortcut('pen', e)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                    title="بازنشانی شورتکات به پیش‌فرض"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Divider */}
        <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />

        {/* Highlighter Tool (ابزار هایلایتر) */}
        <div className="relative shrink-0">
          <button
            onClick={handleHighlighterClick}
            onDoubleClick={handleHighlighterDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool relative ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'highlighter'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار هایلایتر [${formatShortcutLabel(shortcuts.highlighter)}] یا کلید ۴ (دوبار کلیک برای تنظیمات)`}
          >
            <Highlighter className="w-4 h-4 shrink-0" />
            {!isVerticalCapsule && (
              <span className={activeTool === 'highlighter' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>هایلایت</span>
            )}
            {/* Color Indicator Dot */}
            <span
              className={`rounded-full border border-white/60 shadow-2xs shrink-0 ${
                isVerticalCapsule ? 'absolute bottom-1 right-1 w-2 h-2' : 'w-2.5 h-2.5'
              }`}
              style={{ backgroundColor: highlighterColor }}
            />
          </button>

          {/* Smooth Animated Highlighter Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isHighlighterSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <Highlighter className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">تنظیمات هایلایتر</span>
              </div>
              <button
                onClick={() => setIsHighlighterSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                title="بستن تنظیمات"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Auto-Straighten Option (صاف کردن خودکار) */}
            <div className="mb-3.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3 whitespace-normal">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-800">صاف کردن خودکار</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      autoStraighten ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {autoStraighten ? 'روشن' : 'خاموش'}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 leading-tight mt-0.5 whitespace-normal">
                  تبدیل لرزش دست به خط صاف روی متن
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoStraighten((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ios-spring-tool ${
                  autoStraighten ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
                title={autoStraighten ? 'صاف کردن خودکار: روشن' : 'صاف کردن خودکار: خاموش'}
              >
                <span
                  style={{
                    left: autoStraighten ? '22px' : '2px',
                  }}
                  className="pointer-events-none absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ease-in-out"
                />
              </button>
            </div>

            {/* Color Selection (انتخاب رنگ هایلایتر) */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-neutral-500 block mb-2">رنگ هایلایت:</span>
              <div className="flex items-center justify-between gap-1.5">
                {[
                  { hex: '#ffea00', label: 'زرد فسفری درخشان' },
                  { hex: '#00e676', label: 'سبز فسفری زنده' },
                  { hex: '#00e5ff', label: 'آبی فیروزه‌ای براق' },
                  { hex: '#ff2d87', label: 'صورتی نئونی پرانرژی' },
                  { hex: '#ff6d00', label: 'نارنجی فسفری تابان' },
                  { hex: '#b347ff', label: 'بنفش الکتریک درخشان' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setHighlighterColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full cursor-pointer shadow-2xs relative flex items-center justify-center ios-spring-tool ${
                      highlighterColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                        : ''
                    }`}
                    title={c.label}
                  />
                ))}

                {/* Custom Color Input */}
                <label
                  className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0 ios-spring-tool"
                  title="رنگ دلخواه"
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    }}
                  />
                  <input
                    type="color"
                    value={highlighterColor}
                    onChange={(e) => setHighlighterColor(e.target.value)}
                    className="absolute opacity-0 inset-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Thickness Selection (ضخامت خط هایلایت) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-500">ضخامت هایلایت:</span>
                <span className="text-xs font-mono font-bold text-neutral-900 tabular-nums">
                  {highlighterWidth} px
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="8"
                max="36"
                step="2"
                value={highlighterWidth}
                onChange={(e) => setHighlighterWidth(Number(e.target.value))}
                className="w-full accent-neutral-900 cursor-pointer h-1.5 bg-neutral-200 rounded-lg appearance-none"
              />

              {/* Live Preview */}
              <div className="mt-3 p-2 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-center h-10 overflow-hidden relative">
                <span className="text-xs text-neutral-800 font-bold z-10 select-none">متن نمونه جزوه</span>
                <div
                  style={{
                    height: `${Math.min(highlighterWidth, 24)}px`,
                    backgroundColor: highlighterColor,
                    opacity: 0.45,
                  }}
                  className="absolute w-4/5 rounded-xs"
                />
              </div>
            </div>

            {/* Shortcut Setting (شورتکات کیبورد) */}
            <div className="pt-2.5 mt-3 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setListeningShortcutFor(listeningShortcutFor === 'highlighter' ? null : 'highlighter')}
                  className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                    listeningShortcutFor === 'highlighter'
                      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                  }`}
                  title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                >
                  {listeningShortcutFor === 'highlighter' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.highlighter)}
                </button>
                {shortcuts.highlighter !== DEFAULT_SHORTCUTS.highlighter && (
                  <button
                    type="button"
                    onClick={(e) => handleResetShortcut('highlighter', e)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                    title="بازنشانی شورتکات به پیش‌فرض"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Divider */}
        <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />

        {/* Ruler / Underline Tool (ابزار خط‌کش / آندرلاین) with 90-degree lock toggle & settings */}
        <div className="relative shrink-0">
          <button
            onClick={handleRulerClick}
            onDoubleClick={handleRulerDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool relative ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'ruler'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار خط‌کش / آندرلاین [${formatShortcutLabel(shortcuts.ruler)}] یا کلید ۵ (دوبار کلیک برای تنظیمات)`}
          >
            <Ruler className="w-4 h-4 shrink-0" />
            {!isVerticalCapsule && (
              <span className={activeTool === 'ruler' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>خط‌کش</span>
            )}
            {/* Color Indicator Dot */}
            <span
              className={`rounded-full border border-white/60 shadow-2xs shrink-0 ${
                isVerticalCapsule ? 'absolute bottom-1 right-1 w-2 h-2' : 'w-2.5 h-2.5'
              }`}
              style={{ backgroundColor: rulerColor }}
            />
          </button>

          {/* Ruler Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isRulerSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">تنظیمات خط‌کش / آندرلاین</span>
              </div>
              <button
                onClick={() => setIsRulerSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                title="بستن تنظیمات"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 90-Degree Lock Toggle (قفل ۹۰ درجه برای جلوگیری از خط شیب‌دار) */}
            <div className="flex items-center justify-between gap-3 p-2.5 mb-3 bg-neutral-50 rounded-xl border border-neutral-100 whitespace-normal">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-800">قفل ۹۰ درجه</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      rulerLock90 ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {rulerLock90 ? 'روشن' : 'خاموش'}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 leading-tight mt-0.5 whitespace-normal">
                  کشیدن خط کاملاً افقی یا عمودی بدون شیب
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRulerLock90((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ios-spring-tool ${
                  rulerLock90 ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
                title={rulerLock90 ? 'قفل ۹۰ درجه: روشن' : 'قفل ۹۰ درجه: خاموش'}
              >
                <span
                  style={{
                    left: rulerLock90 ? '22px' : '2px',
                  }}
                  className="pointer-events-none absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ease-in-out"
                />
              </button>
            </div>

            {/* Color Selection (انتخاب رنگ خط‌کش) */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-neutral-500 block mb-2">رنگ خط:</span>
              <div className="flex items-center justify-between gap-1.5">
                {[
                  { hex: '#2563eb', label: 'آبی' },
                  { hex: '#ef4444', label: 'قرمز' },
                  { hex: '#16a34a', label: 'سبز' },
                  { hex: '#171717', label: 'مشکی (تطبیقی با حالت تاریک)' },
                  { hex: '#ffffff', label: 'سفید' },
                  { hex: '#d97706', label: 'نارنجی' },
                  { hex: '#9333ea', label: 'بنفش' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setRulerColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full cursor-pointer shadow-2xs relative flex items-center justify-center ios-spring-tool ${
                      c.hex.toLowerCase() === '#ffffff' ? 'border border-neutral-300' : ''
                    } ${
                      rulerColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                        : ''
                    }`}
                    title={c.label}
                  />
                ))}

                {/* Custom Color Input */}
                <label
                  className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0 ios-spring-tool"
                  title="رنگ دلخواه"
                >
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    }}
                  />
                  <input
                    type="color"
                    value={rulerColor}
                    onChange={(e) => setRulerColor(e.target.value)}
                    className="absolute opacity-0 inset-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Thickness Selection (ضخامت خط‌کش) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-500">ضخامت خط:</span>
                <span className="text-xs font-mono font-bold text-neutral-900 tabular-nums">
                  {rulerWidth} px
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={rulerWidth}
                onChange={(e) => setRulerWidth(Number(e.target.value))}
                className="w-full accent-neutral-900 cursor-pointer h-1.5 bg-neutral-200 rounded-lg appearance-none"
              />

              {/* Live Preview */}
              <div className="mt-3 p-2 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-center h-8">
                <div
                  style={{
                    height: `${rulerWidth}px`,
                    backgroundColor: rulerColor,
                    borderRadius: `${rulerWidth / 2}px`,
                  }}
                  className="w-4/5 transition-all"
                />
              </div>
            </div>

            {/* Shortcut Setting (شورتکات کیبورد) */}
            <div className="pt-2.5 mt-3 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setListeningShortcutFor(listeningShortcutFor === 'ruler' ? null : 'ruler')}
                  className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                    listeningShortcutFor === 'ruler'
                      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                  }`}
                  title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                >
                  {listeningShortcutFor === 'ruler' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.ruler)}
                </button>
                {shortcuts.ruler !== DEFAULT_SHORTCUTS.ruler && (
                  <button
                    type="button"
                    onClick={(e) => handleResetShortcut('ruler', e)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                    title="بازنشانی شورتکات به پیش‌فرض"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Divider */}
        <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />

        {/* Eraser Tool (ابزار پاک‌کن) with Popover Settings */}
        <div className="relative shrink-0">
          <button
            onClick={handleEraserClick}
            onDoubleClick={handleEraserDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1.5 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'eraser'
                ? eraserMode === 'object'
                  ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                  : 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار پاک‌کن (${eraserMode === 'object' ? 'حالت ادیت خاص' : 'حالت دایره‌ای'}) [${formatShortcutLabel(shortcuts.eraser)}] یا کلید ۶ (دوبار کلیک برای تنظیمات)`}
          >
            {eraserMode === 'object' ? (
              <Crosshair className="w-4 h-4 shrink-0 text-amber-200" />
            ) : (
              <Eraser className="w-4 h-4 shrink-0" />
            )}
            {!isVerticalCapsule && (
              <span className={activeTool === 'eraser' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>
                پاک‌کن
              </span>
            )}
          </button>

          {/* Eraser Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isEraserSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <Eraser className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">تنظیمات پاک‌کن</span>
              </div>
              <button
                onClick={() => setIsEraserSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                title="بستن تنظیمات"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Eraser Mode Selection (دو آپشن پاک‌کن) */}
            <div className="mb-3 space-y-2">
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                نوع عملکرد پاک‌کن:
              </label>

              {/* Option 1: Area / Circle Eraser */}
              <button
                type="button"
                onClick={() => setEraserMode('area')}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  eraserMode === 'area'
                    ? 'border-rose-500 bg-rose-50/70 ring-1 ring-rose-500 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    eraserMode === 'area' ? 'bg-rose-500 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <CircleDot className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      پاک‌کردن داخل دایره (ناحیه‌ای)
                    </span>
                    {eraserMode === 'area' && (
                      <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                        فعال
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    هر خط، هایلایت یا نوشته‌ای که داخل محدوده دایره قرار بگیرد پاک می‌شود.
                  </p>
                </div>
              </button>

              {/* Option 2: Object / Specific Edit Eraser */}
              <button
                type="button"
                onClick={() => setEraserMode('object')}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  eraserMode === 'object'
                    ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    eraserMode === 'object' ? 'bg-amber-500 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  <MousePointerClick className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">
                      پاک‌کردن یک ادیت خاص (انتخابی)
                    </span>
                    {eraserMode === 'object' && (
                      <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                        فعال
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    با کلیک روی یک خط یا یادداشت خاص، فقط همان ادیت انتخاب‌شده پاک می‌شود.
                  </p>
                </div>
              </button>
            </div>

            {/* Area Mode: Circle Size Controls */}
            {eraserMode === 'area' && (
              <div className="p-2.5 mb-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-neutral-700">اندازه دایره پاک‌کن:</span>
                  <span className="text-[11px] font-mono font-semibold text-neutral-600">{eraserSize}px</span>
                </div>

                {/* Presets */}
                <div className="flex gap-1.5 mb-2.5">
                  {[
                    { label: 'ریز', size: 16 },
                    { label: 'متوسط', size: 28 },
                    { label: 'بزرگ', size: 48 },
                  ].map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => setEraserSize(preset.size)}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer transition-all ${
                        eraserSize === preset.size
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {preset.label} ({preset.size})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="12"
                    max="64"
                    step="2"
                    value={eraserSize}
                    onChange={(e) => setEraserSize(Number(e.target.value))}
                    className="flex-1 accent-rose-500 cursor-pointer"
                  />
                  {/* Visual Circle Preview */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <div
                      style={{
                        width: `${Math.min(30, Math.max(8, eraserSize * 0.6))}px`,
                        height: `${Math.min(30, Math.max(8, eraserSize * 0.6))}px`,
                      }}
                      className="rounded-full border-2 border-rose-500 bg-rose-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Object Mode: Helpful Guidance */}
            {eraserMode === 'object' && (
              <div className="p-2.5 mb-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 mb-1">
                  <Crosshair className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>راهنمای حالت ادیت خاص:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  نشانگر را روی خط، هایلایت یا یادداشت موردنظر ببرید تا کادر هدف قرمز نمایان شود؛ با یک کلیک تنها همان ادیت حذف شده و بقیه ادیت‌ها دست‌نخورده باقی می‌مانند.
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleClearPageAnnotations(visiblePage);
                  setIsEraserSettingsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl cursor-pointer shadow-xs whitespace-normal text-center leading-snug ios-spring-btn"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>پاک کردن تمام یادداشت‌های این صفحه ({visiblePage})</span>
              </button>
            </div>

            {/* Shortcut Setting (شورتکات کیبورد) */}
            <div className="pt-2.5 mt-3 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setListeningShortcutFor(listeningShortcutFor === 'eraser' ? null : 'eraser')}
                  className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                    listeningShortcutFor === 'eraser'
                      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                  }`}
                  title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                >
                  {listeningShortcutFor === 'eraser' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.eraser)}
                </button>
                {shortcuts.eraser !== DEFAULT_SHORTCUTS.eraser && (
                  <button
                    type="button"
                    onClick={(e) => handleResetShortcut('eraser', e)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                    title="بازنشانی شورتکات به پیش‌فرض"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Divider */}
        <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />

        {/* Sticky Note Tool (ابزار یادداشت چسبان) with Double-Click Settings Popover */}
        <div className="relative shrink-0">
          <button
            onClick={handleStickyNoteClick}
            onDoubleClick={handleStickyNoteDoubleClick}
            className={`flex items-center justify-center rounded-full cursor-pointer shrink-0 ios-spring-tool ${
              isVerticalCapsule
                ? 'w-9 h-9 sm:w-10 sm:h-10 p-0'
                : 'gap-1 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
            } ${
              activeTool === 'sticky-note'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            title={`ابزار یادداشت چسبان [${formatShortcutLabel(shortcuts.stickyNote)}] یا کلید ۷ (دوبار کلیک برای تنظیمات)`}
          >
            <StickyNote className="w-4 h-4 shrink-0" />
            {!isVerticalCapsule && (
              <span className={activeTool === 'sticky-note' ? 'hidden md:inline whitespace-nowrap text-xs font-semibold' : 'hidden xl:inline whitespace-nowrap text-xs'}>یادداشت</span>
            )}
          </button>

          {/* Sticky Note Settings Popover (اکستند شده ژله‌ای مستقیم از خود دکمه) */}
          <div className="ios-popover-anchor">
            <div
              className={`w-72 sm:w-80 bg-white rounded-2xl shadow-2xl p-4 whitespace-normal ios-popover-bubble ${
                isStickyNoteSettingsOpen ? 'ios-popover-bubble-open' : 'ios-popover-bubble-closed pointer-events-none invisible opacity-0'
              }`}
            >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">تنظیمات یادداشت چسبان</span>
              </div>
              <button
                onClick={() => setIsStickyNoteSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/25 cursor-pointer shrink-0 ios-spring-btn"
                title="بستن تنظیمات"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Description */}
            <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed whitespace-normal">
              با انتخاب این ابزار و کلیک روی هر نقطه از صفحات فایل، یک برگه یادداشت چسبان برای نکته‌برداری ایجاد می‌شود.
            </p>

            {/* Shortcut Setting */}
            <div className="pt-2.5 mt-1 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] font-semibold text-neutral-600">شورتکات کیبورد:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setListeningShortcutFor(listeningShortcutFor === 'stickyNote' ? null : 'stickyNote')}
                  className={`px-2.5 py-0.5 min-w-[36px] text-center text-xs font-mono font-bold rounded-lg border cursor-pointer ios-spring-btn ${
                    listeningShortcutFor === 'stickyNote'
                      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 animate-pulse'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200'
                  }`}
                  title="کلیک کنید و یک کلید کیبورد را فشار دهید (انگلیسی یا فارسی)"
                >
                  {listeningShortcutFor === 'stickyNote' ? 'فشار دهید...' : formatShortcutLabel(shortcuts.stickyNote)}
                </button>
                {shortcuts.stickyNote !== DEFAULT_SHORTCUTS.stickyNote && (
                  <button
                    type="button"
                    onClick={(e) => handleResetShortcut('stickyNote', e)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer ios-spring-tool"
                    title="بازنشانی شورتکات به پیش‌فرض"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Full-Screen Exit inside Capsule (در حالت تمام صفحه برای دسترسی سریع و تمرکز کامل) */}
        {isFocusMode && (
          <>
            <div className={isVerticalCapsule ? "w-5 h-px bg-neutral-200 shrink-0 my-0.5" : "w-px h-4 bg-neutral-200 shrink-0"} />
            <button
              onClick={handleToggleFocusMode}
              className={`flex items-center justify-center rounded-full text-xs font-semibold text-neutral-800 hover:text-white hover:bg-neutral-900 cursor-pointer shrink-0 ios-spring-tool ${
                isVerticalCapsule ? 'w-9 h-9 sm:w-10 sm:h-10 p-0' : 'gap-1.5 px-3 py-1.5'
              }`}
              title="خروج از حالت تمام صفحه (یا کلید Esc)"
            >
              <Minimize2 className="w-4 h-4 shrink-0" />
              {!isVerticalCapsule && <span className="text-[11px] font-bold">خروج</span>}
            </button>
          </>
        )}
      </div>

      {/* Side Drawer Window for Sticky Note (پنجره باز شونده از کنار صفحه با قابلیت ادیت هر بخش انتخابی از متن) */}
      <StickyNoteDrawer
        note={activeStickyNote}
        isOpen={isStickyDrawerOpen}
        onClose={() => setIsStickyDrawerOpen(false)}
        onUpdate={handleUpdateStickyNote}
        onDelete={handleDeleteStickyNote}
        allNotes={stickyNotes}
        onSelectNote={(n) => setActiveStickyNote(n)}
        onNavigateToPage={(p) => scrollToPage(p)}
      />

      {/* Apple Settings Modal */}
      {isEyeComfortOpen && (
        <SettingsView
          isModal={true}
          eyeComfortSettings={eyeComfortSettings}
          onUpdateEyeComfortSettings={setEyeComfortSettings}
          pomodoroSettings={pomodoroSettings}
          onUpdatePomodoroSettings={onUpdatePomodoroSettings}
          shortcuts={shortcuts}
          onUpdateShortcuts={setShortcuts}
          onResetShortcuts={handleResetAllShortcuts}
          capsulePosition={capsulePosition}
          onUpdateCapsulePosition={setCapsulePosition}
          onClose={() => setIsEyeComfortOpen(false)}
          fileName={currentFile.name}
        />
      )}

      {/* Quick Notes Modal Dialog (پنجره شناور دفترچه یادداشت اصلی با انیمیشن کپسولی نرم) */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4 md:p-6 transition-opacity duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] max-h-[850px] flex flex-col overflow-hidden relative animate-ios-modal transform-gpu will-change-transform">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/90 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900">دفترچه یادداشت (میز مطالعه)</h3>
                    {notes && notes.length > 0 && (
                      <span className="text-[10px] bg-neutral-200 text-neutral-700 font-bold px-2 py-0.5 rounded-full font-mono">
                        {notes.length} یادداشت
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    دسترسی سریع به یادداشت‌ها، پوشه‌ها و ثبت نکات بدون خروج از فایل مطالعه
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSwitchToNotes && (
                  <button
                    onClick={() => {
                      setIsNotesModalOpen(false);
                      onSwitchToNotes();
                    }}
                    className="px-2.5 py-1 text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-200 bg-white shadow-2xs"
                    title="مشاهده یادداشت‌ها در صفحه اصلی"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">مشاهده در صفحه اصلی</span>
                  </button>
                )}
                <button
                  onClick={() => setIsNotesModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/30 transition-transform cursor-pointer ios-spring-btn shrink-0"
                  title="خروج و بستن پنجره (Esc یا Alt+N)"
                  aria-label="خروج و بستن"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Modal Body: NotesView */}
            <div className="flex-1 overflow-hidden">
              {notes && onAddNote && onUpdateNote && onDeleteNote ? (
                <NotesView
                  notes={notes}
                  onAddNote={onAddNote}
                  onUpdateNote={onUpdateNote}
                  onDeleteNote={onDeleteNote}
                  studyFiles={
                    uniqueSavedFiles && uniqueSavedFiles.length > 0
                      ? uniqueSavedFiles.map((f) => (f.id === currentFile?.id ? { ...f, stickyNotes } : f))
                      : currentFile
                      ? [{ ...currentFile, stickyNotes }]
                      : []
                  }
                  onOpenFileAtPage={(_file, p) => {
                    setIsNotesModalOpen(false);
                    scrollToPage(p);
                  }}
                  onUpdateStickyNote={(_fileId, updated) => handleUpdateStickyNote(updated)}
                  onDeleteStickyNote={(_fileId, noteId) => handleDeleteStickyNote(noteId)}
                />
              ) : (
                <div className="p-8 text-center text-xs text-neutral-400">یادداشتی یافت نشد.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Save Toast Notification */}
      {showSavedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 backdrop-blur-xs text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-ios-popover-open border border-neutral-700 pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{showSavedToast}</span>
        </div>
      )}

      {/* Save Reminder Modal Dialog (یادآوری ذخیره تغییرات قبل از خروج) */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-ios-modal transform-gpu will-change-transform border border-neutral-100">
            <div className="flex flex-col items-center text-center">
              {/* Blue Save Icon Container */}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-xs mb-3">
                <Save className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                خروج از فایل مطالعه
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                آیا می‌خواهید تغییرات، نکات و یادداشت‌های این فایل ذخیره شوند؟
              </p>
            </div>

            {/* Change details box */}
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/70 text-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  <span>یادداشت‌های چسبان:</span>
                </span>
                <span className="font-bold text-neutral-900 font-mono">
                  {stickyNotes.length} مورد
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                  <span>صفحات دارای حاشیه‌نویسی:</span>
                </span>
                <span className="font-bold text-neutral-900 font-mono">
                  {annotatedPagesCount} صفحه
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>آخرین صفحه مطالعه:</span>
                </span>
                <span className="font-bold text-neutral-900 font-mono">
                  صفحه {visiblePage} از {totalPages}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-1">
              {/* Option to Download with latest edits baked in & Exit */}
              <button
                onClick={handleConfirmDownloadAndExit}
                disabled={isExportingPdf}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/30 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                title="دانلود نسخه PDF نهایی همراه با یادداشت‌ها و هایلایت‌ها به صورت دائمی برای نمایش در سایر نرم‌افزارها"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>در حال اعمال ادیت‌ها و دانلود PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    <span>دانلود PDF با آخرین ادیت‌ها و خروج</span>
                  </>
                )}
              </button>

              {/* Option to Save in Blue */}
              <button
                onClick={handleConfirmSaveAndExit}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-500/30 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Save className="w-4 h-4 text-white" />
                <span>ذخیره تغییرات در برنامه و خروج</span>
              </button>

              {/* Exit without saving */}
              <button
                onClick={handleConfirmDiscardAndExit}
                className="w-full py-2 px-4 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 border border-neutral-200/80 hover:border-rose-200 text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.99]"
              >
                <span>خروج بدون ذخیره</span>
              </button>

              {/* Cancel */}
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="w-full py-1.5 text-xs text-neutral-400 hover:text-neutral-700 font-medium transition-colors cursor-pointer"
              >
                <span>انصراف و ادامه مطالعه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-Click Quick Context Menu (دسترسی سریع، باز و خلوت به یادداشت‌ها و استیکی‌نوت‌ها) */}
      {contextMenuPos && (
        <>
          {/* Subtle backdrop to close on outside click (سبک و بدون فشار بلور پردازشی) */}
          <div
            className="fixed inset-0 z-[9998] bg-black/25"
            onClick={() => setContextMenuPos(null)}
          />

          <div
            ref={contextMenuRef}
            style={{
              top: contextMenuPos.y,
              left: contextMenuPos.x,
              transformOrigin: 'top right',
            }}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-[320px] max-w-[92vw] bg-white rounded-3xl shadow-2xl border border-neutral-200/90 p-4 sm:p-5 flex flex-col gap-4 animate-ios-jelly select-none overflow-hidden text-neutral-800 transform-gpu will-change-transform"
          >
            {/* Header: Title and Close button */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <Palette className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900">
                    تنظیمات نمایش
                  </h4>
                  <p className="text-[10px] text-neutral-400">
                    تم و روشنایی صفحه مطالعه
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContextMenuPos(null)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center shadow-md shadow-rose-500/30 cursor-pointer shrink-0 transition-transform ios-spring-btn"
                title="خروج و بستن (Esc)"
                aria-label="خروج و بستن"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* بخش ۱: تغییر تم */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-neutral-500" />
                  <span>تغییر تم</span>
                </span>
                <span className="text-[11px] font-medium text-neutral-500">
                  {eyeComfortSettings.colorMode === 'normal'
                    ? 'عادی'
                    : eyeComfortSettings.colorMode === 'yellow'
                    ? 'کاغذ زرد'
                    : eyeComfortSettings.colorMode === 'dark-gray'
                    ? 'تاریک'
                    : 'طوسی'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* تم عادی */}
                <button
                  type="button"
                  onClick={() =>
                    setEyeComfortSettings((prev) => ({ ...prev, colorMode: 'normal' }))
                  }
                  className={`py-2 px-1 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 border ios-spring-btn ${
                    eyeComfortSettings.colorMode === 'normal'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm ring-2 ring-neutral-900/10'
                      : 'border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white border border-neutral-300 shadow-2xs flex items-center justify-center ios-spring-tool">
                    {eyeComfortSettings.colorMode === 'normal' && (
                      <Check className="w-3 h-3 text-neutral-900 stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold">عادی</span>
                </button>

                {/* تم کاغذ زرد */}
                <button
                  type="button"
                  onClick={() =>
                    setEyeComfortSettings((prev) => ({ ...prev, colorMode: 'yellow' }))
                  }
                  className={`py-2 px-1 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 border ios-spring-btn ${
                    eyeComfortSettings.colorMode === 'yellow'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                      : 'border-amber-200/80 bg-amber-50/70 hover:bg-amber-100/70 text-amber-900'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#fbf0d9] border border-amber-300 shadow-2xs flex items-center justify-center ios-spring-tool">
                    {eyeComfortSettings.colorMode === 'yellow' && (
                      <Check className="w-3 h-3 text-amber-950 stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold">زرد</span>
                </button>

                {/* تم تاریک */}
                <button
                  type="button"
                  onClick={() =>
                    setEyeComfortSettings((prev) => ({ ...prev, colorMode: 'dark-gray' }))
                  }
                  className={`py-2 px-1 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 border ios-spring-btn ${
                    eyeComfortSettings.colorMode === 'dark-gray'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm ring-2 ring-neutral-800'
                      : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-100'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#18181b] border border-neutral-600 shadow-2xs flex items-center justify-center ios-spring-tool">
                    {eyeComfortSettings.colorMode === 'dark-gray' && (
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold">تاریک</span>
                </button>

                {/* تم طوسی */}
                <button
                  type="button"
                  onClick={() =>
                    setEyeComfortSettings((prev) => ({ ...prev, colorMode: 'soft-gray' }))
                  }
                  className={`py-2 px-1 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 border ios-spring-btn ${
                    eyeComfortSettings.colorMode === 'soft-gray'
                      ? 'border-neutral-800 bg-neutral-800 text-white shadow-sm ring-2 ring-neutral-600/20'
                      : 'border-neutral-300 bg-[#eaebee] hover:bg-neutral-200 text-neutral-800'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#eaebee] border border-neutral-400 shadow-2xs flex items-center justify-center ios-spring-tool">
                    {eyeComfortSettings.colorMode === 'soft-gray' && (
                      <Check className="w-3 h-3 text-neutral-900 stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold">طوسی</span>
                </button>
              </div>
            </div>

            {/* خط جداکننده باریک */}
            <div className="h-px bg-neutral-100 shrink-0" />

            {/* بخش ۲: تنظیم روشنایی صفحه (بدون پریست) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>تنظیم روشنایی صفحه</span>
                </span>
                <span className="font-mono font-bold text-neutral-900 tabular-nums bg-neutral-100 px-2 py-0.5 rounded-lg text-[11px]">
                  {eyeComfortSettings.brightness}٪
                </span>
              </div>

              {/* اسلایدر بدون پریست */}
              <div className="pt-1">
                <AppleCapsuleSlider
                  value={Math.min(100, eyeComfortSettings.brightness)}
                  min={30}
                  max={100}
                  step={1}
                  onChange={(val) =>
                    setEyeComfortSettings((prev) => ({ ...prev, brightness: Math.min(100, val) }))
                  }
                  color={eyeComfortSettings.colorMode === 'yellow' ? 'amber' : 'neutral'}
                  leftIcon={<Sun className="w-3.5 h-3.5" />}
                  className="h-10"
                />
              </div>
            </div>

            {/* خط جداکننده */}
            <div className="h-px bg-neutral-100 shrink-0" />

            {/* بخش ۳: یادداشت‌ها و نکات فایل */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>یادداشت‌ها و نکات</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {notes?.length || 0} یادداشت
                </span>
              </div>

              {/* دکمه باز کردن پنجره اصلی یادداشت‌ها */}
              <button
                type="button"
                onClick={() => {
                  setContextMenuPos(null);
                  setIsNotesModalOpen(true);
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white transition-all cursor-pointer text-xs font-bold shadow-sm"
                title="باز کردن پنجره اصلی یادداشت‌ها"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>باز کردن پنجره اصلی یادداشت‌ها</span>
                </div>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                  {notes?.length || 0}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
