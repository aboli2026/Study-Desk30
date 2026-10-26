import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Plus,
  Minus,
  Check,
  Sparkles,
  Coffee,
  Maximize2,
  Minimize2,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { PomodoroMode, PomodoroSettings } from '../types';
import { PomodoroSettingsModal } from './PomodoroSettingsModal';
import { playMinimalPomodoroSound } from '../utils/pomodoroAudio';

export interface PomodoroViewProps {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  completedCount: number;
  settings: PomodoroSettings;
  sessionElapsedSeconds?: number;
  onSwitchMode: (newMode: PomodoroMode) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onFinalizeEarly?: () => void;
  onAddTime: (minutes: number) => void;
  onUpdateSettings: (newSettings: PomodoroSettings) => void;
}

export const PomodoroView: React.FC<PomodoroViewProps> = ({
  mode,
  timeLeft,
  isRunning,
  completedCount,
  settings,
  sessionElapsedSeconds = 0,
  onSwitchMode,
  onTogglePlay,
  onReset,
  onFinalizeEarly,
  onAddTime,
  onUpdateSettings,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Total seconds calculation
  const getModeTotalSeconds = useCallback(
    (currentMode: PomodoroMode): number => {
      switch (currentMode) {
        case 'focus':
          return settings.focusDuration * 60;
        case 'short-break':
          return settings.shortBreakDuration * 60;
        case 'long-break':
          return settings.longBreakDuration * 60;
      }
    },
    [settings]
  );

  const totalSeconds = getModeTotalSeconds(mode);
  const progressFraction = Math.min(1, Math.max(0, (totalSeconds - timeLeft) / (totalSeconds || 1)));

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const elapsedMins = Math.round(sessionElapsedSeconds / 60);
  const hasElapsedProgress = sessionElapsedSeconds >= 60;

  // Circular SVG Gauge dimensions
  const radius = 145;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressFraction * circumference;

  // Sound label
  const soundNameMap: Record<string, string> = {
    crystal: 'کریستالی مینیمال',
    zen: 'ناقوس ذن',
    marimba: 'ماریمبا چوبی',
    bell: 'زنگ ملایم',
  };

  // Keyboard Shortcuts: Space to play/pause, R to reset, F to toggle fullscreen, Esc to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        isSettingsOpen
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ق') {
        e.preventDefault();
        onReset();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'ب') {
        e.preventDefault();
        setIsFullscreenMode((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreenMode) {
        e.preventDefault();
        setIsFullscreenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onReset, isFullscreenMode, isSettingsOpen]);

  // Cycle round counter
  const totalRounds = settings.roundsBeforeLongBreak || 4;
  const currentRound = (completedCount % totalRounds) + 1;

  // Progress stroke color
  const progressColor =
    mode === 'focus' ? '#171717' : mode === 'short-break' ? '#059669' : '#4f46e5';

  return (
    <div
      className={`w-full h-full flex flex-col justify-between select-none font-sans bg-neutral-50/70 text-neutral-900 transition-all overflow-y-auto ${
        isFullscreenMode ? 'fixed inset-0 z-50 bg-white p-3 sm:p-6 md:p-10' : 'p-3 sm:p-6 md:p-8'
      }`}
      dir="rtl"
    >
      {/* Settings Modal */}
      <PomodoroSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={onUpdateSettings}
      />

      {/* =====================================================================
          1. TOP NAVIGATION BAR (نوار بالای تمام‌صفحه)
          ===================================================================== */}
      <header className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
        {/* Row 1 on mobile / Right section on desktop: Title, cycle & quick mobile actions */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-neutral-900">
              تایمر پومودورو
            </span>
            {isRunning && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono mr-1 sm:mr-2">
              <span>·</span>
              <span>دوره {currentRound} از {totalRounds}</span>
            </div>
          </div>

          {/* Quick Settings & Fullscreen for mobile screens */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 text-xs text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer"
              title="تنظیمات زمان‌ها و صدا"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreenMode(!isFullscreenMode)}
              className="p-1.5 rounded-xl cursor-pointer bg-neutral-100 text-neutral-700"
              title={isFullscreenMode ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
            >
              {isFullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center: Mode Selector Tabs (متقارن، هم‌اندازه و کاملاً تراز) */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100/90 rounded-2xl w-full sm:w-[420px] max-w-full">
          <button
            type="button"
            onClick={() => onSwitchMode('focus')}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-xl cursor-pointer transition-all ios-spring-btn whitespace-nowrap ${
              mode === 'focus'
                ? 'bg-white text-neutral-900 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>مطالعه</span>
            <span className="text-[10px] font-mono opacity-60">
              {settings.focusDuration}m
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchMode('short-break')}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-xl cursor-pointer transition-all ios-spring-btn whitespace-nowrap ${
              mode === 'short-break'
                ? 'bg-white text-neutral-900 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>استراحت کوتاه</span>
            <span className="text-[10px] font-mono opacity-60">
              {settings.shortBreakDuration}m
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchMode('long-break')}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-xl cursor-pointer transition-all ios-spring-btn whitespace-nowrap ${
              mode === 'long-break'
                ? 'bg-white text-neutral-900 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>استراحت طولانی</span>
            <span className="text-[10px] font-mono opacity-60">
              {settings.longBreakDuration}m
            </span>
          </button>
        </div>

        {/* Left: Settings and Fullscreen toggle (Desktop) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer transition-all ios-spring-btn"
            title="تنظیمات زمان‌ها و صدا"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>تنظیمات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreenMode(!isFullscreenMode)}
            className={`p-2 rounded-xl cursor-pointer transition-all ios-spring-btn ${
              isFullscreenMode
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
            title={isFullscreenMode ? 'خروج از تمام‌صفحه [Esc]' : 'تمام‌صفحه [کلید F]'}
          >
            {isFullscreenMode ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. CENTER HERO STAGE: CIRCULAR SVG GAUGE & TIMER (عقربه دایره‌ای و تایمر بزرگ)
          ===================================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-4">
        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center my-2 sm:my-5">
          <svg
            className="w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 max-h-[44vh] max-w-[44vh] -rotate-90 transform-gpu"
            viewBox="0 0 320 320"
          >
            {/* Background Track Circle */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Dynamic Progress Circle */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
            />
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-neutral-500 mb-1.5">
              {mode === 'focus' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>نشست تمرکز و مطالعه</span>
                </>
              ) : mode === 'short-break' ? (
                <>
                  <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                  <span>استراحت کوتاه</span>
                </>
              ) : (
                <>
                  <Coffee className="w-3.5 h-3.5 text-indigo-600" />
                  <span>استراحت طولانی</span>
                </>
              )}
            </div>

            {/* Huge Monospace Timer */}
            <div className="text-5xl sm:text-7xl md:text-8xl font-mono font-bold tracking-tight text-neutral-900 tabular-nums">
              {formattedTime}
            </div>

            {/* Elapsed Time & Save Status */}
            <div className="mt-3">
              {hasElapsedProgress ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{elapsedMins} دقیقه ثبت‌شده در آمار</span>
                </div>
              ) : (
                <span className="text-xs text-neutral-400">
                  {isRunning ? 'در حال محاسبه زمان مطالعه...' : 'آماده برای شروع'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Add / Subtract Time */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-6">
          <button
            type="button"
            onClick={() => onAddTime(-5)}
            className="flex items-center gap-0.5 px-2.5 py-1 text-[11px] font-mono text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer ios-spring-tool"
            title="کاهش ۵ دقیقه"
          >
            <Minus className="w-3 h-3" />
            <span>۵ دقیقه</span>
          </button>
          <button
            type="button"
            onClick={() => onAddTime(1)}
            className="flex items-center gap-0.5 px-2.5 py-1 text-[11px] font-mono text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer ios-spring-tool"
            title="افزودن ۱ دقیقه"
          >
            <Plus className="w-3 h-3" />
            <span>۱ دقیقه</span>
          </button>
          <button
            type="button"
            onClick={() => onAddTime(5)}
            className="flex items-center gap-0.5 px-2.5 py-1 text-[11px] font-mono text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer ios-spring-tool"
            title="افزودن ۵ دقیقه"
          >
            <Plus className="w-3 h-3" />
            <span>۵ دقیقه</span>
          </button>
          <button
            type="button"
            onClick={() => onAddTime(10)}
            className="flex items-center gap-0.5 px-2.5 py-1 text-[11px] font-mono text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer ios-spring-tool"
            title="افزودن ۱۰ دقیقه"
          >
            <Plus className="w-3 h-3" />
            <span>۱۰ دقیقه</span>
          </button>
        </div>

        {/* =====================================================================
            3. CORE ACTION CONTROLS (دکمه‌های اصلی کنترل)
            ===================================================================== */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base cursor-pointer flex items-center justify-center gap-2.5 transition-all ios-spring-btn ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-lg'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>توقف موقت</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {hasElapsedProgress
                    ? 'ادامه مطالعه'
                    : mode === 'focus'
                    ? 'شروع جلسه تمرکز'
                    : 'شروع استراحت'}
                </span>
              </>
            )}
          </button>

          {/* Finish & Record Early Button */}
          <button
            type="button"
            onClick={() => {
              if (onFinalizeEarly && (hasElapsedProgress || isRunning)) {
                onFinalizeEarly();
              }
            }}
            disabled={!hasElapsedProgress && !isRunning}
            className={`px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ios-spring-btn ${
              hasElapsedProgress || isRunning
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-lg shadow-emerald-600/25'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
            }`}
            title="پایان دادن به این نشست و ثبت قطعی در تاریخچه و آمار عملکرد"
          >
            <Check className="w-4 h-4" />
            <span>
              {hasElapsedProgress ? `ثبت نشست (${elapsedMins}m)` : 'پایان و ثبت'}
            </span>
          </button>

          {/* Reset Timer Button */}
          <button
            type="button"
            onClick={onReset}
            className="p-3.5 sm:p-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-2xl cursor-pointer transition-colors ios-spring-tool"
            title="بازنشانی تایمر [کلید R]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* =====================================================================
          4. BOTTOM INFORMATION BAR (اطلاعات وضعیت و کلیدهای میانبر)
          ===================================================================== */}
      <footer className="w-full max-w-5xl mx-auto pt-3 border-t border-neutral-200/60 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-mono">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تکمیل‌شده امروز: {completedCount} دوره</span>
          </div>

          <div
            onClick={() => playMinimalPomodoroSound(settings.soundType, settings.soundVolume)}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-800 cursor-pointer text-xs"
            title="کلیک برای تست صدای آلارم"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>صدای آلارم: {soundNameMap[settings.soundType] || 'کریستالی'}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-neutral-400 text-[11px]">
            <span>[Space] شروع/توقف</span>
            <span>·</span>
            <span>[R] بازنشانی</span>
            <span>·</span>
            <span>[F] تمام‌صفحه</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
