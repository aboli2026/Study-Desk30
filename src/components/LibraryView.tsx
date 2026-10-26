import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Trash2,
  Search,
  Play,
  Calendar,
  HardDrive,
  StickyNote,
  Edit3,
  Bookmark,
  AlertTriangle,
  Plus,
  Download,
  Loader2,
  Folder,
  FolderPlus,
  Tag,
  Star,
  MoreVertical,
  Check,
  X,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
  Clock,
  ArrowDownAZ,
  ArrowUpAZ,
} from 'lucide-react';
import { StudyFile, FileCategory, NoteItem, StickyNoteItem } from '../types';
import { getFileEditsFromStorage } from '../utils/fileStorage';
import { exportAnnotatedPdf } from '../utils/exportPdf';

interface LibraryViewProps {
  files: StudyFile[];
  onOpenFile: (file: StudyFile) => void;
  onDeleteFile: (id: string, fileName?: string) => void;
  onTriggerNewFile?: () => void;
  onUpdateFile?: (file: StudyFile) => void;
  notes?: NoteItem[];
  onOpenFileAtPage?: (file: StudyFile, pageNumber: number) => void;
  onAddStickyNote?: (
    fileId: string,
    note: {
      pageNumber: number;
      title: string;
      content: string;
      color?: string;
      textColor?: string;
      isBold?: boolean;
    }
  ) => void;
  onUpdateStickyNote?: (fileId: string, updatedNote: StickyNoteItem) => void;
  onDeleteStickyNote?: (fileId: string, stickyNoteId: string) => void;
  onAddNote?: (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSwitchToNotes?: (noteId?: string) => void;
}

export const CATEGORY_COLOR_CONFIG: Record<
  string,
  { name: string; bg: string; text: string; border: string; dot: string; ring: string }
> = {
  blue: {
    name: 'آبی',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    ring: 'focus:ring-blue-500',
  },
  emerald: {
    name: 'زمردی',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    ring: 'focus:ring-emerald-500',
  },
  amber: {
    name: 'کهربایی',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    ring: 'focus:ring-amber-500',
  },
  violet: {
    name: 'بنفش',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    ring: 'focus:ring-purple-500',
  },
  rose: {
    name: 'رز',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    ring: 'focus:ring-rose-500',
  },
  cyan: {
    name: 'فیروزه‌ای',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    ring: 'focus:ring-cyan-500',
  },
  orange: {
    name: 'نارنجی',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    ring: 'focus:ring-orange-500',
  },
  neutral: {
    name: 'دودی',
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    border: 'border-neutral-200',
    dot: 'bg-neutral-500',
    ring: 'focus:ring-neutral-500',
  },
};

// Initial categories (empty by default - user creates custom categories)
const DEFAULT_CATEGORIES: FileCategory[] = [];

const CATEGORIES_STORAGE_KEY = 'study_file_categories';
const SORT_STORAGE_KEY = 'study_file_sort_by';

export type SortOption =
  | 'last-edited'
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc';

export const SORT_OPTIONS: Record<
  SortOption,
  { label: string; shortLabel: string; icon: React.FC<{ className?: string }> }
> = {
  'last-edited': { label: 'آخرین ادیت (تغییرات اخیر)', shortLabel: 'آخرین ادیت', icon: Edit3 },
  newest: { label: 'جدیدترین فایل‌ها (تاریخ افزودن)', shortLabel: 'جدیدترین', icon: Clock },
  oldest: { label: 'قدیمی‌ترین فایل‌ها', shortLabel: 'قدیمی‌ترین', icon: Calendar },
  'name-asc': { label: 'نام فایل (الف تا ی)', shortLabel: 'الف تا ی', icon: ArrowDownAZ },
  'name-desc': { label: 'نام فایل (ی تا الف)', shortLabel: 'ی تا الف', icon: ArrowUpAZ },
  'size-desc': { label: 'بیشترین حجم فایل', shortLabel: 'بزرگ‌ترین', icon: HardDrive },
  'size-asc': { label: 'کمترین حجم فایل', shortLabel: 'کم‌حجم‌ترین', icon: HardDrive },
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  files,
  onOpenFile,
  onDeleteFile,
  onTriggerNewFile,
  onUpdateFile,
  notes = [],
  onOpenFileAtPage,
  onAddStickyNote,
  onUpdateStickyNote,
  onDeleteStickyNote,
  onAddNote,
  onSwitchToNotes,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [fileToDelete, setFileToDelete] = useState<StudyFile | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleFileContextMenu = (file: StudyFile, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenuFileId(file.id);
  };

  // Sorting state persisted in localStorage
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved && saved in SORT_OPTIONS) return saved as SortOption;
    } catch {}
    return 'newest';
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortBy);
    } catch {}
  }, [sortBy]);

  // Categories state loaded from localStorage (cleaned of legacy mock categories)
  const [categories, setCategories] = useState<FileCategory[]>(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If it contains old mock categories (cat-university, cat-summaries, etc.), wipe them cleanly
          const hasOldMocks = parsed.some(
            (c: any) =>
              c.id === 'cat-university' ||
              c.id === 'cat-summaries' ||
              c.id === 'cat-books' ||
              c.id === 'cat-research' ||
              c.id === 'cat-exams'
          );
          if (hasOldMocks) {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify([]));
            return [];
          }
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Save categories on change
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch {}
  }, [categories]);

  // Category Modal State (Add or Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FileCategory | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryColorInput, setCategoryColorInput] = useState('blue');
  const [categoryToDelete, setCategoryToDelete] = useState<FileCategory | null>(null);

  // File Category Dropdown Popover Anchor
  const [activePickerFileId, setActivePickerFileId] = useState<string | null>(null);
  const pickerDropdownRef = useRef<HTMLDivElement | null>(null);

  // Active context menu for file card (3-dot options)
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);
  const menuDropdownRef = useRef<HTMLDivElement | null>(null);

  // Category Submenu Dropdown Popover Anchor (زیرمجموعه کشویی دسته‌بندی‌ها)
  const [isCategorySubmenuOpen, setIsCategorySubmenuOpen] = useState(false);
  const categorySubmenuRef = useRef<HTMLDivElement | null>(null);

  // Close picker and dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerDropdownRef.current && !pickerDropdownRef.current.contains(e.target as Node)) {
        setActivePickerFileId(null);
      }
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(e.target as Node)) {
        setActiveMenuFileId(null);
      }
      if (categorySubmenuRef.current && !categorySubmenuRef.current.contains(e.target as Node)) {
        setIsCategorySubmenuOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    if (activePickerFileId || activeMenuFileId || isCategorySubmenuOpen || isSortDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [activePickerFileId, activeMenuFileId, isCategorySubmenuOpen, isSortDropdownOpen]);

  const cleanFileName = (name?: string): string => {
    if (!name) return 'فایل بدون نام';
    return name.replace(/\.pdf$/i, '').trim() || name;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} بایت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatLastModified = (isoStr?: string): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const time = d.getTime();
      if (isNaN(time) || time <= 0) return '';
      const now = Date.now();
      const diffMs = now - time;
      if (diffMs < 0) return 'همین الان';
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'همین الان';
      if (diffMinutes < 60) return `${diffMinutes} دقیقه قبل`;
      if (diffHours < 24) return `${diffHours} ساعت قبل`;
      if (diffDays === 1) return 'دیروز';
      if (diffDays < 7) return `${diffDays} روز قبل`;
      return d.toLocaleDateString('fa-IR');
    } catch {
      return '';
    }
  };

  // Deduplicate files by name to ensure no duplicates in library
  const uniqueFiles = useMemo(() => {
    const seen = new Set<string>();
    return files.filter((f) => {
      const key = (f.name || '').trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [files]);

  // Counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: uniqueFiles.length,
      favorites: uniqueFiles.filter((f) => f.isFavorite).length,
      uncategorized: uniqueFiles.filter((f) => !f.category).length,
    };
    for (const cat of categories) {
      counts[cat.id] = uniqueFiles.filter((f) => f.category === cat.id).length;
    }
    return counts;
  }, [uniqueFiles, categories]);

  // Filtered files according to category and search query
  const filteredFiles = useMemo(() => {
    let list = uniqueFiles;

    // 1. Filter by category
    if (selectedCategory === 'favorites') {
      list = list.filter((f) => f.isFavorite);
    } else if (selectedCategory === 'uncategorized') {
      list = list.filter((f) => !f.category);
    } else if (selectedCategory !== 'all') {
      list = list.filter((f) => f.category === selectedCategory);
    }

    // 2. Filter by search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((f) => {
        const nameMatch = (f.name || '').toLowerCase().includes(q);
        const tagMatch = (f.tags || []).some((t) => t.toLowerCase().includes(q));
        const catObj = categories.find((c) => c.id === f.category);
        const catMatch = catObj ? catObj.name.toLowerCase().includes(q) : false;
        return nameMatch || tagMatch || catMatch;
      });
    }

    // Sort: Keep favorites pinned first, then order by selected sortBy
    const getUploadTimestamp = (f: StudyFile): number => {
      if (f.uploadDate) {
        const t = new Date(f.uploadDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      const idNum = Number(f.id);
      if (!isNaN(idNum) && idNum > 1000000000) return idNum;
      if (f.lastModified) {
        const t = new Date(f.lastModified).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    const hasEdits = (f: StudyFile): boolean => {
      if (f.lastModified) return true;
      if (f.stickyNotes && f.stickyNotes.length > 0) return true;
      if (f.pageStrokes && Object.values(f.pageStrokes).some((s) => s.length > 0)) return true;
      return false;
    };

    const getLastEditTimestamp = (f: StudyFile): number => {
      if (f.lastModified) {
        const t = new Date(f.lastModified).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (f.stickyNotes && f.stickyNotes.length > 0) {
        const noteTimes = f.stickyNotes
          .map((n) => new Date(n.createdAt).getTime())
          .filter((t) => !isNaN(t) && t > 0);
        if (noteTimes.length > 0) return Math.max(...noteTimes);
      }
      return getUploadTimestamp(f);
    };

    return [...list].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      switch (sortBy) {
        case 'last-edited': {
          const editedA = hasEdits(a);
          const editedB = hasEdits(b);
          if (editedA && !editedB) return -1;
          if (!editedA && editedB) return 1;
          const tA = getLastEditTimestamp(a);
          const tB = getLastEditTimestamp(b);
          if (tA !== tB) return tB - tA;
          return (a.name || '').localeCompare(b.name || '', 'fa');
        }
        case 'newest': {
          const tA = getUploadTimestamp(a);
          const tB = getUploadTimestamp(b);
          if (tA !== tB) return tB - tA;
          return (a.name || '').localeCompare(b.name || '', 'fa');
        }
        case 'oldest': {
          const tA = getUploadTimestamp(a);
          const tB = getUploadTimestamp(b);
          if (tA !== tB) return tA - tB;
          return (a.name || '').localeCompare(b.name || '', 'fa');
        }
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '', 'fa');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '', 'fa');
        case 'size-desc':
          return (b.size || 0) - (a.size || 0);
        case 'size-asc':
          return (a.size || 0) - (b.size || 0);
        default:
          return 0;
      }
    });
  }, [uniqueFiles, selectedCategory, searchQuery, categories, sortBy]);

  const activeSelectedCat = categories.find((c) => c.id === selectedCategory);
  const activeCatCfg = activeSelectedCat
    ? CATEGORY_COLOR_CONFIG[activeSelectedCat.color] || CATEGORY_COLOR_CONFIG.blue
    : null;

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      onDeleteFile(fileToDelete.id, fileToDelete.name);
      setFileToDelete(null);
    }
  };

  const handleExport = async (file: StudyFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!file.data) return;
    setExportingId(file.id);
    try {
      const edits = await getFileEditsFromStorage(file.id);
      await exportAnnotatedPdf({
        pdfData: file.originalData || file.data,
        fileName: file.name,
        pageStrokes: edits?.pageStrokes || file.pageStrokes || {},
        stickyNotes: edits?.stickyNotes || file.stickyNotes || [],
      });
    } catch (err) {
      console.error('Failed to export file from library:', err);
      alert('خطا در دانلود فایل ادیت‌شده.');
    } finally {
      setExportingId(null);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (file: StudyFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = { ...file, isFavorite: !file.isFavorite };
    if (onUpdateFile) {
      onUpdateFile(updated);
    }
  };

  // Assign category to file
  const handleAssignCategory = (file: StudyFile, categoryId: string | undefined) => {
    const updated: StudyFile = { ...file, category: categoryId || undefined };
    if (onUpdateFile) {
      onUpdateFile(updated);
    }
    setActivePickerFileId(null);
  };

  // Open modal to create a new category
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setCategoryColorInput('blue');
    setIsCategoryModalOpen(true);
  };

  // Open modal to edit existing category
  const handleOpenEditCategory = (cat: FileCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setCategoryNameInput(cat.name);
    setCategoryColorInput(cat.color || 'blue');
    setIsCategoryModalOpen(true);
  };

  // Save new or edited category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = categoryNameInput.trim();
    if (!name) return;

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id ? { ...c, name, color: categoryColorInput } : c
        )
      );
    } else {
      const newCat: FileCategory = {
        id: `cat-${Date.now()}`,
        name,
        color: categoryColorInput,
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, newCat]);
    }
    setIsCategoryModalOpen(false);
  };

  // Delete a category
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const catId = categoryToDelete.id;

    // Remove category from files (make them uncategorized)
    if (onUpdateFile) {
      uniqueFiles.forEach((file) => {
        if (file.category === catId) {
          onUpdateFile({ ...file, category: undefined });
        }
      });
    }

    setCategories((prev) => prev.filter((c) => c.id !== catId));
    if (selectedCategory === catId) {
      setSelectedCategory('all');
    }
    setCategoryToDelete(null);
  };

  const getCategoryObj = (catId?: string) => {
    if (!catId) return null;
    return categories.find((c) => c.id === catId) || null;
  };

  return (
    <div
      className="h-full flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto bg-neutral-50/60 select-none"
      dir="rtl"
    >
      <div className="max-w-4xl w-full mx-auto space-y-4 sm:space-y-5">
        {/* Apple-style In-App Delete File Confirmation Dialog */}
        {fileToDelete && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setFileToDelete(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-ios-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  حذف فایل از کتابخانه
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  آیا از حذف فایل{' '}
                  <span className="font-bold text-neutral-800">«{fileToDelete.name}»</span> از
                  کتابخانه اطمینان دارید؟
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  className="flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer ios-spring-btn transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>بله، حذف شود</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Category Confirmation Dialog */}
        {categoryToDelete && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setCategoryToDelete(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-ios-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Folder className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-neutral-900">
                  حذف دسته‌بندی «{categoryToDelete.name}»
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  با حذف این دسته، فایل‌های داخل آن حذف نخواهند شد و تنها به حالت «بدون دسته‌بندی» منتقل می‌شوند.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  className="flex-1 py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-sm ios-spring-btn"
                >
                  حذف دسته‌بندی
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Category Modal */}
        {isCategoryModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsCategoryModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-ios-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {editingCategory ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer ios-spring-tool"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                    نام دسته‌بندی:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="مثلاً: ریاضی مهندسی، زیست‌شناسی، رفرنس‌ها..."
                    value={categoryNameInput}
                    onChange={(e) => setCategoryNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-2">
                    رنگ برچسب:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(CATEGORY_COLOR_CONFIG).map(([colorKey, cfg]) => {
                      const isSelected = categoryColorInput === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setCategoryColorInput(colorKey)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ios-spring-tool transition-all ${
                            cfg.bg
                          } ${cfg.text} ${
                            isSelected
                              ? 'ring-2 ring-neutral-900 border-neutral-400 shadow-xs'
                              : 'border-transparent hover:opacity-85'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                          <span className="text-[11px] truncate">{cfg.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl cursor-pointer shadow-xs ios-spring-btn"
                  >
                    {editingCategory ? 'ذخیره' : 'ایجاد دسته'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-3xl shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="p-1.5 rounded-xl bg-neutral-900 text-white shadow-md">
                <BookOpen className="w-4 h-4" />
              </span>
              <h1 className="text-base sm:text-xl font-bold text-neutral-900">
                کتابخانه و دسته‌بندی فایل‌ها
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500">
              مدیریت جزوات، دسته‌بندی‌های موضوعی، برگزیده‌ها و پیگیری پیشرفت مطالعه
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-start sm:self-center">
            <span className="text-xs font-mono font-semibold text-neutral-600 bg-neutral-100 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs">
              {uniqueFiles.length} فایل
            </span>
            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl cursor-pointer ios-spring-btn shadow-xs"
              title="ایجاد دسته موضوعی جدید"
            >
              <FolderPlus className="w-3.5 h-3.5 text-neutral-600" />
              <span>دسته جدید</span>
            </button>
            {onTriggerNewFile && (
              <button
                type="button"
                onClick={onTriggerNewFile}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer ios-spring-btn shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فایل جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Unified Search, Categories & Sort Toolbar (قالب واحد و منظم برای جستجو، دسته‌بندی و ترتیب فایل‌ها) */}
        {uniqueFiles.length > 0 && (
          <div
            className={`bg-white rounded-2xl shadow-lg p-3 space-y-2.5 select-none relative ${
              isCategorySubmenuOpen || isSortDropdownOpen ? 'z-40' : 'z-20'
            }`}
          >
            {/* Upper Row: Search Input + Sort Dropdown */}
            <div className="flex items-center gap-2">
              {/* Search Bar with Clear Button */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="جستجوی عنوان فایل، نام درس یا دسته‌بندی..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-8 py-2 bg-neutral-50/80 hover:bg-neutral-50 focus:bg-white border border-neutral-200/80 focus:border-neutral-400 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-200 cursor-pointer transition-colors"
                    title="پاک کردن جستجو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown Button & Popover */}
              <div className="relative shrink-0" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ios-spring-btn shrink-0 ${
                    sortBy !== 'newest'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/80'
                  }`}
                  title="مرتب‌سازی و ترتیب فایل‌ها"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">
                    ترتیب: {SORT_OPTIONS[sortBy]?.shortLabel || 'جدیدترین'}
                  </span>
                  <span className="inline sm:hidden">
                    {SORT_OPTIONS[sortBy]?.shortLabel || 'ترتیب'}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 opacity-60 ${
                      isSortDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Sort Dropdown Popover */}
                {isSortDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-2xl p-1.5 z-50 animate-ios-jelly origin-top-left select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2.5 py-1.5 text-[11px] font-bold text-neutral-400 border-b border-neutral-100 mb-1 flex items-center justify-between">
                      <span>ترتیب فایل‌ها</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    </div>

                    <div className="space-y-0.5">
                      {(Object.keys(SORT_OPTIONS) as SortOption[]).map((key) => {
                        const opt = SORT_OPTIONS[key];
                        const Icon = opt.icon;
                        const isCurrent = sortBy === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSortBy(key);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-neutral-900 text-white font-bold shadow-xs'
                                : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon
                                className={`w-3.5 h-3.5 ${
                                  isCurrent ? 'text-white' : 'text-neutral-500'
                                }`}
                              />
                              <span>{opt.label}</span>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lower Row: Category Pills & Submenu Filter & Quick Status */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-100/90 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1">
                {/* 1. All Files (همه فایل‌ها) */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ios-spring-btn shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>همه فایل‌ها</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedCategory === 'all'
                        ? 'bg-neutral-700 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {categoryCounts.all}
                  </span>
                </button>

                {/* 2. Favorites (برگزیده‌ها ⭐) */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('favorites')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ios-spring-btn shrink-0 ${
                    selectedCategory === 'favorites'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-neutral-700 hover:bg-amber-50/70 hover:text-amber-800'
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 shrink-0 ${
                      selectedCategory === 'favorites' ? 'fill-current text-white' : 'text-amber-500'
                    }`}
                  />
                  <span>برگزیده‌ها</span>
                  {categoryCounts.favorites > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        selectedCategory === 'favorites'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {categoryCounts.favorites}
                    </span>
                  )}
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-neutral-200 shrink-0 hidden sm:block" />

                {/* 3. Category Submenu Dropdown (زیرمجموعه کشویی دسته‌بندی‌ها) */}
                <div className="relative shrink-0" ref={categorySubmenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategorySubmenuOpen(!isCategorySubmenuOpen)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ios-spring-btn shrink-0 ${
                      activeSelectedCat && activeCatCfg
                        ? `${activeCatCfg.bg} ${activeCatCfg.text} ${activeCatCfg.border} shadow-2xs`
                        : selectedCategory === 'uncategorized'
                        ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                        : isCategorySubmenuOpen
                        ? 'bg-neutral-100 text-neutral-900 border-neutral-300'
                        : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200/90'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    {activeSelectedCat && activeCatCfg ? (
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${activeCatCfg.dot}`} />
                        <span>دسته: {activeSelectedCat.name}</span>
                      </span>
                    ) : selectedCategory === 'uncategorized' ? (
                      <span>دسته‌بندی‌نشده</span>
                    ) : (
                      <span>دسته‌بندی‌ها</span>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 opacity-60 ${
                        isCategorySubmenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Submenu Dropdown Popover with global iOS jelly animation */}
                  {isCategorySubmenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-2xl p-2 z-50 animate-ios-jelly origin-top-right select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-2 px-2 border-b border-neutral-100 mb-1">
                        <span className="text-[11px] font-bold text-neutral-500">
                          انتخاب دسته‌بندی
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategorySubmenuOpen(false);
                            handleOpenAddCategory();
                          }}
                          className="text-[11px] font-bold text-neutral-800 hover:text-black flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>دسته جدید</span>
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                        {/* Option to clear category filter */}
                        {selectedCategory !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('all');
                              setIsCategorySubmenuOpen(false);
                            }}
                            className="w-full text-right px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100/80 rounded-xl flex items-center justify-between border border-rose-200 transition-colors cursor-pointer mb-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>حذف فیلتر دسته‌بندی (نمایش همه)</span>
                            </div>
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        )}

                        {/* All Categories Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('all');
                            setIsCategorySubmenuOpen(false);
                          }}
                          className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 cursor-pointer transition-colors ${
                            selectedCategory === 'all'
                              ? 'font-bold bg-neutral-100 text-neutral-900'
                              : 'text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                            <span>همه دسته‌بندی‌ها</span>
                          </div>
                          {selectedCategory === 'all' && (
                            <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                          )}
                        </button>

                        {/* Categories List */}
                        {categories.map((cat) => {
                          const cfg = CATEGORY_COLOR_CONFIG[cat.color] || CATEGORY_COLOR_CONFIG.blue;
                          const isCurrent = selectedCategory === cat.id;
                          const count = categoryCounts[cat.id] || 0;

                          return (
                            <div
                              key={cat.id}
                              className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                isCurrent ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(cat.id);
                                  setIsCategorySubmenuOpen(false);
                                }}
                                className="flex items-center gap-2 min-w-0 flex-1 text-right text-xs cursor-pointer py-0.5"
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                                <span
                                  className={`truncate ${
                                    isCurrent ? 'font-bold text-neutral-900' : 'text-neutral-700'
                                  }`}
                                >
                                  {cat.name}
                                </span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                    isCurrent
                                      ? 'bg-neutral-900 text-white'
                                      : `${cfg.bg} ${cfg.text} border ${cfg.border}`
                                  }`}
                                >
                                  {count}
                                </span>

                                {/* Edit Trigger */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditCategory(cat, e);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200 rounded-md transition-opacity cursor-pointer"
                                  title="ویرایش دسته"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>

                                {/* Delete Trigger */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCategoryToDelete(cat);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-opacity cursor-pointer"
                                  title="حذف دسته"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Empty state when no custom categories created yet */}
                        {categories.length === 0 && (
                          <div className="py-4 px-3 text-center text-neutral-400">
                            <Folder className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-neutral-400" />
                            <p className="text-xs text-neutral-500 font-medium">
                              هیچ دسته‌بندی ایجاد نشده است
                            </p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              می‌توانید با دکمه «دسته جدید» بالا دسته دلخواه بسازید
                            </p>
                          </div>
                        )}

                        {/* Uncategorized files option */}
                        {categoryCounts.uncategorized > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('uncategorized');
                              setIsCategorySubmenuOpen(false);
                            }}
                            className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 cursor-pointer transition-colors ${
                              selectedCategory === 'uncategorized'
                                ? 'font-bold bg-neutral-100 text-neutral-900'
                                : 'text-neutral-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                              <span>دسته‌بندی‌نشده</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-500 font-bold">
                              {categoryCounts.uncategorized}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status / Filter Reset Button */}
              <div className="flex items-center gap-2 shrink-0">
                {(selectedCategory !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="پاک کردن فیلترها و جستجو"
                  >
                    <X className="w-3 h-3" />
                    <span>پاکسازی فیلتر</span>
                  </button>
                )}

                <span className="text-[11px] text-neutral-400 font-mono">
                  {filteredFiles.length} {filteredFiles.length === uniqueFiles.length ? 'فایل' : 'نتیجه'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {uniqueFiles.length === 0 ? (
          <div className="p-10 sm:p-14 bg-white rounded-3xl text-center flex flex-col items-center justify-center shadow-lg space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                کتابخانه هنوز خالی است
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                با انتخاب هر فایل PDF، فایل به صورت خودکار با تمام یادداشت‌ها، دسته‌بندی‌ها و صفحه جاری در این
                لیست قرار می‌گیرد.
              </p>
            </div>
            {onTriggerNewFile && (
              <button
                type="button"
                onClick={onTriggerNewFile}
                className="mt-2 px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer ios-spring-btn shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>انتخاب اولین فایل</span>
              </button>
            )}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl text-center text-xs text-neutral-500 space-y-2 shadow-md">
            <div>
              فایلی در دسته‌بندی انتخاب‌شده {searchQuery ? `یا با عنوان «${searchQuery}»` : ''} پیدا نشد.
            </div>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-bold text-neutral-900 underline cursor-pointer"
              >
                مشاهده همه فایل‌ها
              </button>
            )}
          </div>
        ) : (
          /* ========================================================
             CLEAN & MINIMALIST FILES GRID (کارت‌های خلوت و تمیز فایل‌ها)
             ======================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredFiles.map((file) => {
              const currentPage = file.currentPage && file.currentPage > 0 ? file.currentPage : 1;
              const pageCount = file.pageCount && file.pageCount > 0 ? file.pageCount : 0;
              const percent = pageCount > 0 ? Math.min(100, Math.round((currentPage / pageCount) * 100)) : 0;
              const isCompleted = pageCount > 0 && currentPage >= pageCount;

              const fileCategory = getCategoryObj(file.category);
              const categoryColorCfg = fileCategory
                ? CATEGORY_COLOR_CONFIG[fileCategory.color] || CATEGORY_COLOR_CONFIG.blue
                : null;

              const isMenuOpen = activeMenuFileId === file.id;
              const attachedNotesCount = notes.filter(
                (n) =>
                  n.attachedFileId === file.id ||
                  (n.attachedFileName &&
                    n.attachedFileName.trim().toLowerCase() ===
                      (file.name || '').trim().toLowerCase())
              ).length;
              const stickyNotesCount = file.stickyNotes?.length || 0;

              return (
                <div
                  key={file.id}
                  onClick={() => onOpenFile(file)}
                  onContextMenu={(e) => handleFileContextMenu(file, e)}
                  className={`group relative bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/75 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3.5 ios-spring-card ${
                    isMenuOpen ? 'z-40 ring-2 ring-neutral-900/10' : 'z-10'
                  }`}
                >
                  {/* Top Row: File icon + Quiet Category + (Star & 3-Dot Options) */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                        <FileText className="w-4 h-4" />
                      </div>

                      {/* Quiet Category Indicator (Zero-Pill discipline) */}
                      {fileCategory && categoryColorCfg ? (
                        <div className="flex items-center gap-1.5 min-w-0 text-xs text-neutral-500 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${categoryColorCfg.dot}`} />
                          <span className="truncate max-w-[130px]">{fileCategory.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 font-normal">بدون دسته</span>
                      )}
                    </div>

                    {/* Left Actions: Star & 3-Dot Menu */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(file, e)}
                        className={`p-1.5 rounded-lg cursor-pointer ios-spring-tool transition-all ${
                          file.isFavorite
                            ? 'text-amber-500'
                            : 'text-neutral-300 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                        }`}
                        title={file.isFavorite ? 'حذف از برگزیده‌ها' : 'افزودن به برگزیده‌ها'}
                      >
                        <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>

                      {/* 3-Dot Options Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuFileId(isMenuOpen ? null : file.id);
                          }}
                          className={`p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer ios-spring-tool transition-colors ${
                            isMenuOpen ? 'bg-neutral-100 text-neutral-900' : ''
                          }`}
                          title="عملیات فایل"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* 3-Dot Popover Menu */}
                        {isMenuOpen && (
                          <div
                            ref={menuDropdownRef}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-1.5 z-50 animate-ios-jelly origin-top-left text-xs select-none"
                          >
                            {/* Direct Main Notes Access */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuFileId(null);
                                onSwitchToNotes?.();
                              }}
                              className="w-full text-right px-2.5 py-2 rounded-xl flex items-center justify-between text-neutral-900 hover:bg-amber-100/70 transition-colors cursor-pointer font-bold mb-1.5 bg-amber-50 border border-amber-200/80 shadow-2xs"
                              title="مشاهده در صفحه اصلی یادداشت‌ها"
                            >
                              <span className="flex items-center gap-1.5">
                                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                                <span>مشاهده در بخش یادداشت‌ها</span>
                              </span>
                              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full font-mono font-bold">
                                {stickyNotesCount + attachedNotesCount}
                              </span>
                            </button>

                            {/* Category Selector Submenu */}
                            <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 flex items-center justify-between">
                              <span>دسته‌بندی فایل</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuFileId(null);
                                  handleOpenAddCategory();
                                }}
                                className="text-neutral-600 hover:text-neutral-900 flex items-center gap-0.5 text-[10px] cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>دسته جدید</span>
                              </button>
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-0.5 mb-1 pb-1 border-b border-neutral-100">
                              <button
                                type="button"
                                onClick={() => {
                                  handleAssignCategory(file, undefined);
                                  setActiveMenuFileId(null);
                                }}
                                className={`w-full text-right px-2 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                  !file.category
                                    ? 'bg-neutral-100 font-bold text-neutral-900'
                                    : 'text-neutral-600 hover:bg-neutral-50'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                                  <span>بدون دسته‌بندی</span>
                                </span>
                                {!file.category && <Check className="w-3.5 h-3.5 text-neutral-700" />}
                              </button>

                              {categories.map((c) => {
                                const cfg = CATEGORY_COLOR_CONFIG[c.color] || CATEGORY_COLOR_CONFIG.blue;
                                const isCurrent = file.category === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      handleAssignCategory(file, c.id);
                                      setActiveMenuFileId(null);
                                    }}
                                    className={`w-full text-right px-2 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                      isCurrent
                                        ? 'bg-neutral-100 font-bold text-neutral-900'
                                        : 'text-neutral-700 hover:bg-neutral-50'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                                      <span className="truncate">{c.name}</span>
                                    </span>
                                    {isCurrent && <Check className="w-3.5 h-3.5 text-neutral-700 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Download */}
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveMenuFileId(null);
                                handleExport(file, e);
                              }}
                              disabled={exportingId === file.id}
                              className="w-full text-right px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              {exportingId === file.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-neutral-500" />
                              )}
                              <span>دانلود فایل با یادداشت‌ها</span>
                            </button>

                            {/* Favorite */}
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveMenuFileId(null);
                                handleToggleFavorite(file, e);
                              }}
                              className="w-full text-right px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  file.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-neutral-500'
                                }`}
                              />
                              <span>{file.isFavorite ? 'حذف از برگزیده‌ها' : 'افزودن به برگزیده‌ها'}</span>
                            </button>

                            <div className="border-t border-neutral-100 my-1" />

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuFileId(null);
                                setFileToDelete(file);
                              }}
                              className="w-full text-right px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>حذف از کتابخانه</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Clean File Title (distraction-free typography) */}
                  <div className="my-0.5">
                    <h3
                      className="text-sm font-bold text-neutral-800 group-hover:text-black line-clamp-2 leading-relaxed tracking-tight"
                      title={file.name}
                    >
                      {cleanFileName(file.name)}
                    </h3>
                  </div>

                  {/* Bottom: Quiet progress summary & sleek hairline progress bar */}
                  <div className="pt-2 border-t border-neutral-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span>
                        {pageCount > 0 ? `صفحه ${currentPage} از ${pageCount}` : formatFileSize(file.size) || 'آماده مطالعه'}
                      </span>
                      <span className={isCompleted ? 'text-emerald-600 font-bold' : 'text-neutral-600'}>
                        {isCompleted ? 'تکمیل شد' : pageCount > 0 ? `${percent}٪` : ''}
                      </span>
                    </div>

                    {pageCount > 0 && (
                      <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : percent > 0
                              ? 'bg-neutral-900'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}


      </div>
    </div>
  );
};
