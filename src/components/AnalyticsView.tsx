import React, { useState, useMemo } from 'react';
import {
  Flame,
  Clock,
  Sparkles,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { PomodoroSession, NoteItem } from '../types';

interface AnalyticsViewProps {
  sessions: PomodoroSession[];
  notes: NoteItem[];
  onClearHistory: () => void;
  onLoadSampleData?: () => void;
}

type TimeFrame = 'today' | 'week' | 'all';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  sessions,
  notes,
  onClearHistory,
  onLoadSampleData,
}) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Helper to identify focused study sessions
  const isStudy = (s: PomodoroSession) =>
    s.type === 'focus' ||
    s.type === 'file-study' ||
    s.type === 'app-usage' ||
    (s.type !== 'short-break' && s.type !== 'long-break');

  const getSessionDate = (s: PomodoroSession): Date => {
    if (s.createdAt) return new Date(s.createdAt);
    if (s.timestamp) {
      const d = new Date(s.timestamp);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Filtered sessions based on timeframe
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return sessions.filter((s) => {
      const d = getSessionDate(s);
      if (timeFrame === 'today') {
        return d >= todayStart;
      }
      if (timeFrame === 'week') {
        return d.getTime() >= now - 7 * 86400000;
      }
      return true;
    });
  }, [sessions, timeFrame]);

  const studySessions = useMemo(() => filteredSessions.filter(isStudy), [filteredSessions]);
  const breakSessions = useMemo(() => filteredSessions.filter((s) => !isStudy(s)), [filteredSessions]);

  // Total Focus Minutes in active timeframe
  const focusMinutes = useMemo(() => {
    return studySessions.reduce((acc, s) => acc + (s.durationMinutes || 25), 0);
  }, [studySessions]);

  const breakMinutes = useMemo(() => {
    return breakSessions.reduce((acc, s) => acc + (s.durationMinutes || 5), 0);
  }, [breakSessions]);

  const focusHours = Math.floor(focusMinutes / 60);
  const remainingMinutes = focusMinutes % 60;

  // Streak Calculation across all-time history
  const streakDays = useMemo(() => {
    const allStudy = sessions.filter(isStudy);
    if (allStudy.length === 0) return 0;

    const uniqueDates = new Set<string>();
    allStudy.forEach((s) => {
      const d = getSessionDate(s);
      if (!isNaN(d.getTime())) {
        uniqueDates.add(d.toISOString().slice(0, 10));
      }
    });

    const sorted = Array.from(uniqueDates).sort().reverse();
    if (sorted.length === 0) return 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (sorted[0] !== todayStr && sorted[0] !== yesterday) return 0;

    let streak = 0;
    let check = new Date(sorted[0]);

    for (let i = 0; i < sorted.length; i++) {
      const exp = check.toISOString().slice(0, 10);
      if (sorted.includes(exp)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [sessions]);

  // Average session length
  const averageSessionDuration = useMemo(() => {
    if (studySessions.length === 0) return 0;
    return Math.round(focusMinutes / studySessions.length);
  }, [studySessions.length, focusMinutes]);

  // Note words
  const totalNoteWords = useMemo(() => {
    return notes.reduce((acc, note) => {
      const words = (note.content || '').trim().split(/\s+/).filter(Boolean);
      return acc + words.length;
    }, 0);
  }, [notes]);

  // Iranian weekly data (شنبه تا جمعه)
  const persianWeekDays = useMemo(() => [
    { name: 'شنبه', short: 'ش', index: 0 },
    { name: 'یکشنبه', short: 'ی', index: 1 },
    { name: 'دوشنبه', short: 'د', index: 2 },
    { name: 'سه‌شنبه', short: 'س', index: 3 },
    { name: 'چهارشنبه', short: 'چ', index: 4 },
    { name: 'پنجشنبه', short: 'پ', index: 5 },
    { name: 'جمعه', short: 'ج', index: 6 },
  ], []);

  const currentJsDay = new Date().getDay();
  const currentPersianIndex = (currentJsDay + 1) % 7;

  const weeklyPills = useMemo(() => {
    const map = persianWeekDays.map((d) => ({
      ...d,
      minutes: 0,
      sessions: 0,
      isToday: d.index === currentPersianIndex,
    }));

    const sevenDaysAgo = Date.now() - 7 * 86400000;

    sessions.forEach((s) => {
      if (!isStudy(s)) return;
      const d = getSessionDate(s);
      if (d.getTime() >= sevenDaysAgo || sessions.length <= 15) {
        const pIndex = (d.getDay() + 1) % 7;
        const target = map.find((item) => item.index === pIndex);
        if (target) {
          target.minutes += s.durationMinutes || 25;
          target.sessions += 1;
        }
      }
    });

    const max = Math.max(...map.map((m) => m.minutes), 60);
    return { list: map, maxMinutes: max };
  }, [sessions, persianWeekDays, currentPersianIndex]);

  // Productivity ratio
  const totalMinutes = focusMinutes + breakMinutes;
  const productivityPercentage = totalMinutes > 0 ? Math.round((focusMinutes / totalMinutes) * 100) : 100;

  // Target comparison (e.g. 15 hours weekly target or 2 hours daily target)
  const targetMinutes = timeFrame === 'today' ? 120 : timeFrame === 'week' ? 900 : 3600;
  const targetProgress = Math.min(100, Math.round((focusMinutes / targetMinutes) * 100));

  const toFa = (val: number | string) => Number(val).toLocaleString('fa-IR');

  return (
    <div
      className="h-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto bg-neutral-50/70 select-none font-sans text-neutral-900"
      dir="rtl"
    >
      <div className="max-w-4xl w-full mx-auto space-y-5 sm:space-y-6">

        {/* =====================================================================
            1. HEADER & CONTROLS (هماهنگ با سبک میز مطالعه و کتابخانه)
            ===================================================================== */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              تحلیل و ریتم مطالعه
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              گزارش عملکرد، استمرار روزانه و ارزیابی زمان‌های مفید تمرکز
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Segmented Timeframe Switcher with animated sliding pill */}
            <div className="relative inline-flex items-center p-1 bg-neutral-100 rounded-2xl border border-neutral-200/80 text-xs font-medium overflow-hidden">
              {/* Sliding background pill with Apple spring physics */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-white shadow-xs transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
                style={{
                  width: 'calc((100% - 8px) / 3)',
                  right:
                    timeFrame === 'today'
                      ? '4px'
                      : timeFrame === 'week'
                      ? 'calc(4px + (100% - 8px) / 3)'
                      : 'calc(4px + ((100% - 8px) / 3) * 2)',
                }}
              />
              <button
                type="button"
                onClick={() => setTimeFrame('today')}
                className={`relative z-10 px-3.5 py-1.5 rounded-xl transition-colors duration-200 text-center font-medium ios-spring-btn ${
                  timeFrame === 'today'
                    ? 'text-neutral-900 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => setTimeFrame('week')}
                className={`relative z-10 px-3.5 py-1.5 rounded-xl transition-colors duration-200 text-center font-medium ios-spring-btn ${
                  timeFrame === 'week'
                    ? 'text-neutral-900 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                ۷ روز اخیر
              </button>
              <button
                type="button"
                onClick={() => setTimeFrame('all')}
                className={`relative z-10 px-3.5 py-1.5 rounded-xl transition-colors duration-200 text-center font-medium ios-spring-btn ${
                  timeFrame === 'all'
                    ? 'text-neutral-900 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                کل تاریخچه
              </button>
            </div>

            {/* Clear History Button */}
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="p-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-red-600 border border-neutral-200/80 transition-colors ios-spring-btn"
                title="شروع مجدد و بازنشانی"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* =====================================================================
            GLOBAL ANIMATED CONTAINER (انیمیشن نرم سراسری هنگام تغییر بازه زمانی)
            ===================================================================== */}
        <div key={timeFrame} className="animate-timeframe-change space-y-5 sm:space-y-6">

        {/* =====================================================================
            2. HERO FOCUS CARD (رینگ تمرکز + شاخص‌های سه‌گانه با رنگ‌بندی هماهنگ)
            ===================================================================== */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            
            {/* Center: Clean Progress Ring */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="#f3f4f6"
                    strokeWidth="11"
                    fill="none"
                  />
                  {/* Active Progress Stroke */}
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    stroke="#171717"
                    strokeWidth="11"
                    strokeDasharray={2 * Math.PI * 68}
                    strokeDashoffset={2 * Math.PI * 68 * (1 - targetProgress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    fill="none"
                  />
                </svg>

                {/* Inner Stat */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
                    {focusHours > 0
                      ? `${toFa(focusHours)}:${toFa(remainingMinutes.toString().padStart(2, '0'))}`
                      : `${toFa(remainingMinutes)}د`}
                  </span>
                  <span className="text-xs font-medium text-neutral-500 mt-0.5">
                    {focusHours > 0 ? 'ساعت تمرکز مفید' : 'دقیقه تمرکز'}
                  </span>
                  <span className="text-[11px] font-medium text-neutral-600 mt-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200/60">
                    {toFa(targetProgress)}٪ از هدف
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Three Key Metric Columns & Balance Bar */}
            <div className="md:col-span-7 flex flex-col justify-center space-y-5">
              
              <div className="grid grid-cols-3 gap-3 sm:gap-4 pb-4 border-b border-neutral-100">
                {/* Metric 1: Streak */}
                <div className="p-3 rounded-2xl bg-neutral-50/70 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>استمرار</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-neutral-900">
                    {toFa(streakDays)}
                    <span className="text-xs font-normal text-neutral-400 mr-1">روز</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">پیوسته</p>
                </div>

                {/* Metric 2: Average Duration */}
                <div className="p-3 rounded-2xl bg-neutral-50/70 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>میانگین</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-neutral-900">
                    {toFa(averageSessionDuration)}
                    <span className="text-xs font-normal text-neutral-400 mr-1">دقیقه</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">هر نشست</p>
                </div>

                {/* Metric 3: Notes & Words */}
                <div className="p-3 rounded-2xl bg-neutral-50/70 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    <span>واژگان</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-neutral-900">
                    {toFa(totalNoteWords)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">در {toFa(notes.length)} یادداشت</p>
                </div>
              </div>

              {/* Productivity Ratio Bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-600 mb-2">
                  <span className="font-semibold text-neutral-800">شاخص تمرکز خالص</span>
                  <span className="font-mono font-medium">{toFa(productivityPercentage)}٪</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden flex">
                  <div
                    style={{ width: `${productivityPercentage}%` }}
                    className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                  <span>{toFa(focusMinutes)} دقیقه مطالعه مفید</span>
                  <span>{toFa(breakMinutes)} دقیقه استراحت</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* =====================================================================
            3. WEEKLY HORIZON (افق ۷ روزه با کارت‌های هماهنگ و رنگ‌بندی روشن و خوانا)
            ===================================================================== */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                افق ریتم مطالعه در طول هفته
              </h2>
            </div>
            <span className="text-xs text-neutral-400">شنبه تا جمعه</span>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {weeklyPills.list.map((day) => {
              const isSelected = selectedDayIndex === day.index;
              const ratio = Math.min(100, (day.minutes / weeklyPills.maxMinutes) * 100);

              return (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => setSelectedDayIndex(isSelected ? null : day.index)}
                  className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                    day.isToday
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : isSelected
                      ? 'border-neutral-400 bg-neutral-100 text-neutral-900'
                      : 'border-neutral-200/70 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  {/* Day Label */}
                  <span
                    className={`text-xs font-semibold ${
                      day.isToday ? 'text-white' : 'text-neutral-700'
                    }`}
                  >
                    <span className="hidden sm:inline">{day.name}</span>
                    <span className="sm:hidden">{day.short}</span>
                  </span>

                  {/* Level Pill */}
                  <div
                    className={`w-2.5 sm:w-3 h-12 rounded-full my-2.5 p-0.5 flex items-end ${
                      day.isToday ? 'bg-neutral-800' : 'bg-neutral-200/80'
                    }`}
                  >
                    <div
                      style={{ height: `${Math.max(12, ratio)}%` }}
                      className={`w-full rounded-full transition-all duration-300 ${
                        day.isToday
                          ? 'bg-white'
                          : day.minutes > 0
                          ? 'bg-neutral-800'
                          : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Minutes Label */}
                  <span
                    className={`text-[10px] font-medium ${
                      day.isToday ? 'text-neutral-200' : 'text-neutral-500'
                    }`}
                  >
                    {day.minutes > 0 ? `${toFa(day.minutes)}د` : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Day Detail Expansion */}
          {selectedDayIndex !== null && (
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 px-1">
              <span>
                گزارش {weeklyPills.list[selectedDayIndex].name}:{' '}
                <strong className="text-neutral-900 font-bold">
                  {toFa(weeklyPills.list[selectedDayIndex].minutes)} دقیقه تمرکز
                </strong>{' '}
                در {toFa(weeklyPills.list[selectedDayIndex].sessions)} نشست
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayIndex(null)}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-medium"
              >
                بستن
              </button>
            </div>
          )}
        </section>

        {/* =====================================================================
            4. RECENT ACTIVITY FLOW (جریان نشست‌های اخیر با ردیف‌های تمیز و روشن)
            ===================================================================== */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900">
              جریان اخیر فعالیت‌ها
            </h2>
            {onLoadSampleData && sessions.length === 0 && (
              <button
                type="button"
                onClick={onLoadSampleData}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xl text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                درج داده‌های نمونه
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-neutral-600">
                هنوز رویدادی ثبت نشده است
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                با شروع تایمر پومودورو یا باز کردن اسناد، آمار مطالعه در این بخش به‌روز خواهد شد.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {sessions.slice(0, 5).map((session, i) => {
                const isFoc = isStudy(session);
                const sDate = getSessionDate(session);
                const timeStr = !isNaN(sDate.getTime())
                  ? sDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                  : '';
                const dateStr = !isNaN(sDate.getTime())
                  ? sDate.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })
                  : '';

                return (
                  <div key={session.id || i} className="py-2.5 sm:py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFoc ? 'bg-emerald-500' : 'bg-neutral-300'
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {session.fileName
                            ? `مطالعه فایل ${session.fileName}`
                            : isFoc
                            ? 'نشست تمرکز پومودورو'
                            : 'استراحت و بازیابی ذهن'}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {dateStr} • ساعت {timeStr}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full font-medium ${
                          isFoc
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {toFa(session.durationMinutes || 25)} دقیقه
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        </div>

        {/* =====================================================================
            5. RESET CONFIRMATION MODAL
            ===================================================================== */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
            <div className="w-full max-w-xs rounded-2xl bg-white border border-neutral-200 p-5 shadow-2xl space-y-3">
              <h3 className="font-bold text-sm text-neutral-900">بازنشانی تاریخچه مطالعه</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                تمام نشست‌های ثبت‌شده پاکسازی خواهند شد. آیا از ادامه اطمینان دارید؟
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setShowResetModal(false);
                  }}
                  className="px-3.5 py-1.5 text-xs rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  حذف تاریخچه
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
