'use client';

import { useState, useEffect, useCallback } from 'react';
import { SelectedVerse } from '@/app/types';
import { 
  Users, Send, Loader2, MessageSquare, Pin, BookOpen, Hash, 
  ChevronDown, ChevronUp, Link2, Crown, MessageCircle, CornerDownRight,
  Heart, Trash2, Megaphone, Settings, AlertTriangle, Globe, Clock, Sparkles
} from 'lucide-react';
import { 
  addPublicReflection, getPublicReflections, getSupabase, toggleBestReflection,
  addReply, getReplies, togglePinPost, getPinnedPosts, StudioReflection,
  addLike, removeLike, hasUserLiked, getLikesCount, deleteReflection, getCurrentUser,
  checkIsAdmin, getStudyNotesForVerse, getNotice, updateNotice, bookNameMap,
  getUserActivity, hasPrayerInLast24Hours, toggleUrgentPrayer
} from '@/app/lib/supabase';

// Books array for chapter selection
const books = [
  { id: 'Matt', name: '마태복음', chapters: 28 },
  { id: 'Mark', name: '마가복음', chapters: 16 },
  { id: 'Luke', name: '누가복음', chapters: 24 },
  { id: 'John', name: '요한복음', chapters: 21 },
  { id: 'Acts', name: '사도행전', chapters: 28 },
  { id: 'Rom', name: '로마서', chapters: 16 },
  { id: '1Cor', name: '고린도전서', chapters: 16 },
  { id: '2Cor', name: '고린도후서', chapters: 13 },
  { id: 'Gal', name: '갈라디아서', chapters: 6 },
  { id: 'Eph', name: '에베소서', chapters: 6 },
  { id: 'Phil', name: '빌립보서', chapters: 4 },
  { id: 'Col', name: '골로새서', chapters: 4 },
  { id: '1Thess', name: '데살로니가전서', chapters: 5 },
  { id: '2Thess', name: '데살로니가후서', chapters: 3 },
  { id: '1Tim', name: '디모데전서', chapters: 6 },
  { id: '2Tim', name: '디모데후서', chapters: 4 },
  { id: 'Titus', name: '디도서', chapters: 3 },
  { id: 'Phlm', name: '빌레몬서', chapters: 1 },
  { id: 'Heb', name: '히브리서', chapters: 13 },
  { id: 'Jas', name: '야고보서', chapters: 5 },
  { id: '1Pet', name: '베드로전서', chapters: 5 },
  { id: '2Pet', name: '베드로후서', chapters: 3 },
  { id: '1John', name: '요한일서', chapters: 5 },
  { id: '2John', name: '요한이서', chapters: 1 },
  { id: '3John', name: '요한삼서', chapters: 1 },
  { id: 'Jude', name: '유다서', chapters: 1 },
  { id: 'Rev', name: '요한계시록', chapters: 22 },
];

interface CommunityPanelProps {
  selectedVerse: SelectedVerse | null;
  isLoggedIn: boolean;
  userRole: string;
  userName: string;
  initialPostId?: string | null;
  onNavigateToVerse?: (book: string, chapter: number, verse: number) => void;
  currentPath?: string; // Current page path for context-aware sharing
  showPrayerTabs?: boolean; // Show prayer category tabs (general/world)
}

interface Post extends StudioReflection {
  replyCount?: number;
  likesCount?: number;
  userHasLiked?: boolean;
  post_number?: number;
}

export function CommunityPanel({ 
  selectedVerse, isLoggedIn, userRole, userName, initialPostId, onNavigateToVerse, currentPath, showPrayerTabs = false 
}: CommunityPanelProps) {
  // Permission helpers based on tier
  const isGeneral = userRole === '준회원' || userRole === 'General';
  const isRegular = userRole === '정회원' || userRole === 'Regular';
  const isHardworking = userRole === '열심회원' || userRole === 'Hardworking';
  const isStaff = userRole === '스태프' || userRole === 'Staff';
  const isAdminTier = userRole === '관리자' || userRole === 'Admin' || userRole?.includes('⭐⭐⭐⭐⭐');
  
  const canWrite = isLoggedIn && !isGeneral; // ⭐ General cannot write
  const canLike = isLoggedIn; // ⭐ General and above can like
  const canEditPost = isHardworking || isStaff || isAdminTier; // ⭐⭐⭐+ can edit
  const canDeleteImmediate = isStaff || isAdminTier; // Staff+ can delete immediately
  const canRequestDelete = isLoggedIn && !canDeleteImmediate; // Others can request delete
  // Use RPC is_admin() function for accurate admin check
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Check admin status via Supabase RPC
  useEffect(() => {
    if (isLoggedIn) {
      checkIsAdmin().then(setIsAdmin);
    }
  }, [isLoggedIn]);
  
  // Debug admin status
  useEffect(() => {
    console.log('[CommunityPanel] userRole:', userRole, 'isAdmin:', isAdmin, 'isLoggedIn:', isLoggedIn);
  }, [userRole, isAdmin, isLoggedIn]);
  
  // New post states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [includeVerse, setIncludeVerse] = useState(false);
  const [postCategory, setPostCategory] = useState<'reflection' | 'prayer'>('reflection');
  const [prayerType, setPrayerType] = useState<'normal' | 'world'>('normal');
  
  // Posts states
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Accordion state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(initialPostId || null);
  
  // Replies state
  const [replies, setReplies] = useState<Record<string, StudioReflection[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [newReply, setNewReply] = useState<Record<string, string>>({});
  const [savingReply, setSavingReply] = useState<Record<string, boolean>>({});
  
  // Ministry notes (pinned at top for selected verse)
  const [ministryNotes, setMinistryNotes] = useState<any[]>([]);
  const [loadingMinistry, setLoadingMinistry] = useState(false);
  
  // Notice state (real-time announcement at top)
  const [notice, setNotice] = useState<{ id: number; content: string; updated_at: string } | null>(null);
  const [loadingNotice, setLoadingNotice] = useState(false);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [noticeEditContent, setNoticeEditContent] = useState('');
  const [savingNotice, setSavingNotice] = useState(false);
  
  // All Posts by Chapter view state
  const [viewMode, setViewMode] = useState<'feed' | 'all-posts'>('feed');
  const [selectedBookForView, setSelectedBookForView] = useState('Matt');
  const [selectedChapterForView, setSelectedChapterForView] = useState(1);
  const [allPostsByChapter, setAllPostsByChapter] = useState<{[verse: number]: (Post | any)[]}>({});
  const [loadingAllPosts, setLoadingAllPosts] = useState(false);
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  
  // Hashtag filter state
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  
  // Prayer system states
  const [prayerCategory, setPrayerCategory] = useState<'general' | 'world'>('general');
  const [lastPrayerTime, setLastPrayerTime] = useState<Date | null>(null);
  const [checkingLastPrayer, setCheckingLastPrayer] = useState(false);
  
  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<any>(null);
  const [profileModalActivity, setProfileModalActivity] = useState<{reflections: any[]; studyNotes: any[]} | null>(null);
  const [loadingProfileActivity, setLoadingProfileActivity] = useState(false);

  // Desktop 3-column layout tabs
  const [desktopTab, setDesktopTab] = useState<'scripture' | 'free' | 'prayer'>('scripture');
  
  // Filter posts for 3-column layout
  const getScripturePosts = () => {
    return posts.filter(post => {
      const hasVerseRef = post.verse_ref && post.verse_ref !== '글로벌 게시판' && post.verse_ref !== '';
      return hasVerseRef;
    });
  };
  
  const getFreeBoardPosts = () => {
    return posts.filter(post => {
      const cat = (post as any).category;
      const noVerseRef = !post.verse_ref || post.verse_ref === '글로벌 게시판' || post.verse_ref === '';
      const isNotPrayer = cat !== 'prayer_general' && cat !== 'prayer_world';
      return noVerseRef && isNotPrayer;
    });
  };
  
  const getPrayerPosts = () => {
    return posts.filter(post => {
      const cat = (post as any).category;
      return cat === 'prayer_general' || cat === 'prayer_world';
    });
  };

  // Get current user ID
  useEffect(() => {
    getCurrentUser().then(user => setCurrentUserId(user?.id || null));
  }, []);

  // Load pinned posts with likes
  const loadPinnedPosts = useCallback(async () => {
    try {
      const data = await getPinnedPosts();
      const postsWithLikes = await Promise.all(
        (data as Post[]).map(async (post) => {
          const [count, liked] = await Promise.all([
            getLikesCount(post.id),
            hasUserLiked(post.id)
          ]);
          return { ...post, likesCount: count, userHasLiked: liked };
        })
      );
      setPinnedPosts(postsWithLikes);
    } catch (err: any) {
      console.error('Error loading pinned posts:', err?.message);
    }
  }, []);

  // Load regular posts with likes
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setLoadingPosts(true);
    try {
      const result = await getPublicReflections(undefined, pageNum, 20);
      const pinnedIds = new Set(pinnedPosts.map(p => p.id));
      
      // Filter out pinned posts and unapproved world prayers (unless admin)
      let filteredPosts = (result.data || []).filter(p => {
        if (pinnedIds.has(p.id)) return false;
        // Hide unapproved world prayers from non-admins
        if ((p as any).is_world_prayer && !(p as any).is_admin_approved && !isAdmin) {
          return false;
        }
        return true;
      });
      
      const postsWithLikes = await Promise.all(
        (filteredPosts as Post[]).map(async (post) => {
          const [count, liked] = await Promise.all([
            getLikesCount(post.id),
            hasUserLiked(post.id)
          ]);
          return { ...post, likesCount: count, userHasLiked: liked };
        })
      );
      
      // Sort: urgent prayers first, then by created_at
      const sortedPosts = postsWithLikes.sort((a, b) => {
        const aUrgent = (a as any).is_urgent ? 1 : 0;
        const bUrgent = (b as any).is_urgent ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent; // Urgent first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      if (append) {
        setPosts(prev => [...prev, ...sortedPosts]);
      } else {
        setPosts(sortedPosts);
      }
      
      setHasMore((result.data || []).length === 20);
    } catch (err: any) {
      console.error('Error loading posts:', err?.message);
    } finally {
      setLoadingPosts(false);
    }
  }, [pinnedPosts, isAdmin]);

  // Load all posts (reflections + study_notes) for a specific chapter
  const loadAllPostsByChapter = useCallback(async (bookId: string, chapter: number) => {
    setLoadingAllPosts(true);
    try {
      const supabase = getSupabase();
      const bookName = bookNameMap[bookId] || bookId;
      
      // Load all reflections for this chapter (use Korean book name for DB query)
      const { data: reflections, error: refError } = await supabase
        .from('reflections')
        .select('*, profiles(nickname, email, tier)')
        .eq('book', bookName)  // Korean book name
        .eq('chapter', chapter)
        .eq('is_public', true)
        .order('verse', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (refError) {
        console.error('Error loading reflections:', refError);
      }
      
      // Load all study notes for this chapter (use Korean book name for DB query)
      const { data: notes, error: notesError } = await supabase
        .from('study_notes')
        .select('*, profiles(nickname, email, tier)')
        .eq('book', bookName)  // Korean book name
        .eq('chapter', chapter)
        .order('verse', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (notesError) {
        console.error('Error loading study notes:', notesError);
      }
      
      // Group by verse
      const postsByVerse: {[verse: number]: any[]} = {};
      
      // Add reflections
      (reflections || []).forEach((post: any) => {
        const verse = post.verse || 0;
        if (!postsByVerse[verse]) postsByVerse[verse] = [];
        postsByVerse[verse].push({ ...post, postType: 'reflection' });
      });
      
      // Add study notes
      (notes || []).forEach((note: any) => {
        const verse = note.verse || 0;
        if (!postsByVerse[verse]) postsByVerse[verse] = [];
        // Check if admin note
        const isAdminNote = note.profiles?.tier === '관리자' || note.profiles?.tier === 'Admin' || note.profiles?.tier?.includes('⭐⭐⭐⭐⭐');
        postsByVerse[verse].push({ ...note, postType: isAdminNote ? 'admin_note' : 'study_note' });
      });
      
      setAllPostsByChapter(postsByVerse);
      
      // Auto-expand first verse with posts
      const versesWithPosts = Object.keys(postsByVerse).map(Number).sort((a, b) => a - b);
      if (versesWithPosts.length > 0) {
        setExpandedVerses(new Set([versesWithPosts[0]]));
      }
    } catch (err) {
      console.error('Error loading all posts:', err);
    } finally {
      setLoadingAllPosts(false);
    }
  }, []);

  // Toggle verse expansion
  const toggleVerseExpansion = (verse: number) => {
    setExpandedVerses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(verse)) {
        newSet.delete(verse);
      } else {
        newSet.add(verse);
      }
      return newSet;
    });
  };

  // Load reply counts
  const loadReplyCounts = useCallback(async () => {
    const supabase = getSupabase();
    const allPosts = [...pinnedPosts, ...posts];
    
    for (const post of allPosts) {
      const { count } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', post.id)
        .eq('is_public', true);
      
      post.replyCount = count || 0;
    }
    
    setPosts([...posts]);
    setPinnedPosts([...pinnedPosts]);
  }, [posts, pinnedPosts]);

  // Initial load
  useEffect(() => {
    loadPinnedPosts();
  }, [loadPinnedPosts]);

  useEffect(() => {
    if (pinnedPosts.length >= 0) {
      loadPosts(1, false);
    }
  }, [pinnedPosts.length, loadPosts]);

  // Load replies when post is expanded
  useEffect(() => {
    if (expandedPostId && !replies[expandedPostId]) {
      loadReplies(expandedPostId);
    }
  }, [expandedPostId]);

  // Load ministry notes for selected verse (⭐⭐⭐⭐⭐ admin pinned)
  useEffect(() => {
    const loadMinistryNotes = async () => {
      if (!selectedVerse) {
        setMinistryNotes([]);
        return;
      }
      
      setLoadingMinistry(true);
      try {
        // Use Korean book name for verseRef consistency
        const koreanBookName = bookNameMap[selectedVerse.book] || selectedVerse.book;
        const verseRef = `${koreanBookName} ${selectedVerse.chapter}:${selectedVerse.verse}`;
        const notes = await getStudyNotesForVerse(verseRef);
        // Filter only 관리자 admin notes
        const adminNotes = notes.filter((note: any) => 
          note.profiles?.tier === '관리자' || note.profiles?.tier === 'Admin' || note.profiles?.tier?.includes('⭐⭐⭐⭐⭐')
        );
        setMinistryNotes(adminNotes);
      } catch (err) {
        console.error('Error loading ministry notes:', err);
      } finally {
        setLoadingMinistry(false);
      }
    };
    
    loadMinistryNotes();
  }, [selectedVerse]);

  // Load notice on mount
  useEffect(() => {
    const loadNotice = async () => {
      setLoadingNotice(true);
      try {
        const data = await getNotice();
        setNotice(data);
        if (data) {
          setNoticeEditContent(data.content);
        }
      } catch (err) {
        console.error('Error loading notice:', err);
      } finally {
        setLoadingNotice(false);
      }
    };
    
    loadNotice();
  }, []);

  // Handle notice save
  const handleSaveNotice = async () => {
    if (!noticeEditContent.trim()) return;
    
    setSavingNotice(true);
    try {
      const success = await updateNotice(noticeEditContent);
      if (success) {
        // Reload notice
        const data = await getNotice();
        setNotice(data);
        setIsEditingNotice(false);
        alert('공지사항이 저장되었습니다.');
      } else {
        alert('공지사항 저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Error saving notice:', err);
      alert('공지사항 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingNotice(false);
    }
  };

  const loadReplies = async (postId: string) => {
    setLoadingReplies(prev => ({ ...prev, [postId]: true }));
    try {
      const data = await getReplies(postId);
      setReplies(prev => ({ ...prev, [postId]: data }));
    } catch (err: any) {
      console.error('Error loading replies:', err?.message);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Check 24h prayer limit
  const checkPrayerLimit = async () => {
    if (!currentUserId || postCategory !== 'prayer' || prayerType !== 'normal') return true;
    
    setCheckingLastPrayer(true);
    try {
      const hasRecentPrayer = await hasPrayerInLast24Hours(currentUserId);
      if (hasRecentPrayer) {
        alert('일반 기도는 24시간에 1회만 작성 가능합니다.\n다음 기도는 24시간 후에 작성해 주세요.');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking prayer limit:', err);
      return true; // Allow on error
    } finally {
      setCheckingLastPrayer(false);
    }
  };

  // Toggle urgent prayer (admin only)
  const handleToggleUrgent = async (postId: string, currentUrgent: boolean) => {
    if (!isAdmin) {
      alert('관리자만 긴급 기도를 설정할 수 있습니다.');
      return;
    }
    try {
      await toggleUrgentPrayer(postId, !currentUrgent);
      await loadPosts(1, false);
      await loadPinnedPosts();
    } catch (err: any) {
      alert('긴급 설정 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };

  // Save new post
  const handleSavePost = async () => {
    if (!newContent.trim() || !canWrite) return;

    // Check 24h prayer limit for normal prayers
    if (postCategory === 'prayer' && prayerType === 'normal') {
      const canPost = await checkPrayerLimit();
      if (!canPost) return;
    }

    setSaving(true);
    try {
      // Use Korean book name for DB consistency
      const koreanBookName = selectedVerse ? (bookNameMap[selectedVerse.book] || selectedVerse.book) : '글로벌';
      const verseRef = includeVerse && selectedVerse 
        ? `${koreanBookName} ${selectedVerse.chapter}:${selectedVerse.verse}`
        : '글로벌 게시판';
      
      // Determine category based on post type
      let category: 'general' | 'prayer_general' | 'prayer_world' = 'general';
      let isWorldPrayer = false;
      if (postCategory === 'prayer') {
        if (prayerType === 'world') {
          category = 'prayer_world';
          isWorldPrayer = true;
        } else {
          category = 'prayer_general';
        }
      }
      
      await addPublicReflection(
        verseRef,
        koreanBookName,
        selectedVerse?.chapter || 0,
        selectedVerse?.verse || 0,
        newContent,
        true,
        category,
        null,
        newTitle.trim() || null,
        false, // isUrgent - only admins can set this
        isWorldPrayer
      );

      // Show message for world prayers
      if (isWorldPrayer) {
        alert('세계 기도 제목이 제출되었습니다. 관리자 승인 후 게시됩니다.');
      }

      setNewTitle('');
      setNewContent('');
      setPostCategory('reflection');
      setPrayerType('normal');
      await loadPosts(1, false);
      await loadPinnedPosts();
    } catch (err: any) {
      console.error('Error saving post:', err?.message, err?.details);
      alert('게시글 저장 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Save reply
  const handleSaveReply = async (postId: string) => {
    const content = newReply[postId];
    if (!content?.trim() || !canWrite) return;

    setSavingReply(prev => ({ ...prev, [postId]: true }));
    try {
      await addReply(postId, content);
      setNewReply(prev => ({ ...prev, [postId]: '' }));
      await loadReplies(postId);
      await loadReplyCounts();
    } catch (err: any) {
      console.error('Error saving reply:', err?.message);
      alert('댓글 저장 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingReply(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Toggle like
  const handleToggleLike = async (postId: string, currentLiked: boolean) => {
    if (!isLoggedIn) {
      alert('로그인 후 좋아요를 누를 수 있습니다.');
      return;
    }
    try {
      if (currentLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
      // Update local state
      const newCount = await getLikesCount(postId);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: newCount, userHasLiked: !currentLiked } : p
      ));
      setPinnedPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: newCount, userHasLiked: !currentLiked } : p
      ));
    } catch (err: any) {
      console.error('Error toggling like:', err?.message);
    }
  };

  // Delete post
  const handleDelete = async (postId: string, postUserId: string) => {
    const canDelete = currentUserId === postUserId || isAdmin;
    if (!canDelete) {
      alert('삭제 권한이 없습니다.');
      return;
    }
    
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await deleteReflection(postId);
      await loadPosts(1, false);
      await loadPinnedPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err?.message);
      alert('삭제 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };
  
  // Edit post (placeholder - ⭐⭐⭐ and above only)
  const handleEdit = (post: Post) => {
    if (!canEditPost) {
      alert('글 수정 권한은 ⭐⭐⭐(Hardworking) 등급 이상부터 가능합니다.');
      return;
    }
    // TODO: Implement edit modal or inline editing
    alert('글 수정 기능은 준비중입니다.');
  };
  
  // Navigate to verse when clicking on post title/verse_ref
  const handleNavigateToVerse = (post: Post) => {
    if (!onNavigateToVerse || !post.verse_ref || post.verse_ref === '글로벌 게시판') return;
    
    // Parse verse_ref like "Matt 1:1" or "MAT 1:1"
    const match = post.verse_ref.match(/^([A-Za-z0-9]+)\s+(\d+):(\d+)$/);
    if (match) {
      const [, book, chapter, verse] = match;
      onNavigateToVerse(book, parseInt(chapter), parseInt(verse));
    }
  };

  // Toggle pin
  const handleTogglePin = async (postId: string, currentPin: boolean) => {
    try {
      await togglePinPost(postId, !currentPin);
      await loadPinnedPosts();
      await loadPosts(1, false);
    } catch (err: any) {
      console.error('Error toggling pin:', err?.message);
      alert('공지 설정 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };

  // Toggle best
  const handleToggleBest = async (postId: string, currentBest: boolean) => {
    try {
      await toggleBestReflection(postId, !currentBest);
      await loadPosts(1, false);
    } catch (err: any) {
      console.error('Error toggling best:', err?.message);
      alert('베스트 설정 중 오류: ' + (err?.message || 'Unknown error'));
    }
  };

  // Share/copy link - context-aware deep linking
  const handleShare = (postId: string) => {
    const baseUrl = 'https://gnt-reader.vercel.app';
    let url = '';
    
    // Determine current page and generate appropriate link
    const path = currentPath || window.location.pathname;
    
    if (path.includes('/community')) {
      // Community page: /community?post=ID
      url = `${baseUrl}/community?post=${postId}`;
    } else if (path.includes('/read')) {
      // Korean Bible page: /read?post=ID
      url = `${baseUrl}/read?post=${postId}`;
    } else if (path.includes('/study')) {
      // Study page: /study?post=ID
      url = `${baseUrl}/study?post=${postId}`;
    } else {
      // Default to home with post param
      url = `${baseUrl}/?post=${postId}`;
    }
    
    navigator.clipboard.writeText(url);
    alert('링크가 클립보드에 복사되었습니다!\n' + url);
  };

  // Toggle accordion
  const toggleExpand = (postId: string) => {
    setExpandedPostId(prev => prev === postId ? null : postId);
  };

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  // Absolute time format: YYYY. MM. DD. HH:mm
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}. ${month}. ${day}. ${hours}:${minutes}`;
  };

  // Get display name from profile with new format: [교회] [직분] 닉네임
  // Only show church/job if user has chosen to make them public
  const getDisplayName = (profile: any, userEmail?: string) => {
    if (!profile) {
      if (userEmail) return userEmail.split('@')[0];
      return '익명 연구원';
    }
    
    const parts: string[] = [];
    
    // Add church if shown
    if (profile.show_church && profile.church_name) {
      parts.push(`[${profile.church_name}]`);
    }
    
    // Add job if shown
    if (profile.show_job && profile.job_position) {
      parts.push(`[${profile.job_position}]`);
    }
    
    // Add nickname
    parts.push(profile.nickname || profile.username || profile.email?.split('@')[0] || '익명');
    
    return parts.join(' ');
  };

  // Convert URLs in text to clickable links
  const renderContentWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Extract hashtags from content
  const extractHashtags = (content: string): string[] => {
    const hashtagRegex = /#[\w가-힣]+/g;
    return content.match(hashtagRegex) || [];
  };

  // Render content with clickable hashtags
  const renderContentWithHashtags = (content: string) => {
    const hashtagRegex = /(#[\w가-힣]+)/g;
    const parts = content.split(hashtagRegex);
    
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setHashtagFilter(part);
              setViewMode('feed');
            }}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {part}
          </button>
        );
      }
      // Also process URLs within non-hashtag parts
      return renderContentWithLinks(part);
    });
  };

  // Filter posts by hashtag
  const getFilteredPosts = () => {
    if (!hashtagFilter) return posts;
    return posts.filter(post => post.content?.includes(hashtagFilter));
  };

  // Get post background color based on type and prayer status
  const getPostBgColor = (postType?: string, tier?: string, isUrgent?: boolean, isWorldPrayer?: boolean, isAdminApproved?: boolean, category?: string) => {
    // Urgent prayer - red border (highest priority)
    if (isUrgent) {
      return 'bg-red-50 border-red-500';
    }
    // World prayer (approved) - blue border
    if (isWorldPrayer && isAdminApproved) {
      return 'bg-blue-50 border-blue-500';
    }
    // General prayer - warm amber
    if (category === 'prayer_general' || category === 'prayer_world') {
      return 'bg-amber-50 border-amber-200';
    }
    // Admin commentary - ONLY for admin study_notes (not reflections)
    if ((postType === 'admin_note' || postType === 'study_note') && 
        (tier === '관리자' || tier === 'Admin' || tier?.includes('⭐⭐⭐⭐⭐'))) {
      return 'bg-purple-50 border-purple-200';
    }
    // Study note by non-admin (동역자 사역)
    if (postType === 'study_note') {
      return 'bg-blue-50 border-blue-200';
    }
    // Default reflection (일반 묵상) - warm beige
    // NOTE: Even admin reflections are treated as regular posts
    return 'bg-stone-50 border-stone-200';
  };

  // Get post badge based on type and prayer status
  const getPostBadge = (postType?: string, tier?: string, isUrgent?: boolean, isWorldPrayer?: boolean, isAdminApproved?: boolean, category?: string) => {
    // Urgent prayer badge
    if (isUrgent) {
      return (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          긴급 기도
        </span>
      );
    }
    // World prayer badge (approved)
    if (isWorldPrayer && isAdminApproved) {
      return (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Globe className="w-3 h-3" />
          세계 기도
        </span>
      );
    }
    // General prayer badge
    if (category === 'prayer_general') {
      return (
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Heart className="w-3 h-3" />
          기도제목
        </span>
      );
    }
    // Admin commentary badge - ONLY for study_notes by admins
    if ((postType === 'admin_note' || postType === 'study_note') && 
        (tier === '관리자' || tier === 'Admin' || tier?.includes('⭐⭐⭐⭐⭐'))) {
      return (
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Crown className="w-3 h-3" />
          공식 주석
        </span>
      );
    }
    // Study note by non-admin
    if (postType === 'study_note') {
      return (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          동역자 사역
        </span>
      );
    }
    // Reflections (even by admins) get no badge
    return null;
  };

  // Open profile modal
  const openProfileModal = async (profile: any) => {
    if (!profile) return;
    setProfileModalUser(profile);
    setProfileModalOpen(true);
    setLoadingProfileActivity(true);
    try {
      const activity = await getUserActivity(profile.id);
      setProfileModalActivity(activity);
    } catch (err) {
      console.error('Error loading user activity:', err);
    } finally {
      setLoadingProfileActivity(false);
    }
  };

  // Avatar component
  const Avatar = ({ url, tier, size = 'md' }: { url?: string | null; tier?: string; size?: 'sm' | 'md' }) => {
    const isAdminUser = tier?.toLowerCase().includes('admin');
    const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden ${isAdminUser ? 'ring-2 ring-amber-400' : 'bg-stone-200'}`}>
        {url ? (
          <img src={url} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Users className={iconSize} />
          </div>
        )}
        {isAdminUser && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center">
            <Crown className="w-2 h-2 text-white" />
          </div>
        )}
      </div>
    );
  };

  // Render post item
  const renderPost = (post: Post, isPinned: boolean = false, postType?: string) => {
    const isExpanded = expandedPostId === post.id;
    const canDelete = currentUserId === post.user_id || isAdmin;
    
    console.log('[renderPost] post.id:', post.id, 'currentUserId:', currentUserId, 'post.user_id:', post.user_id, 'isAdmin:', isAdmin, 'canDelete:', canDelete);
    
    // Get color-coded background based on post type and prayer status
    const bgColorClass = isPinned 
      ? 'bg-amber-50/20 border-amber-300' 
      : getPostBgColor(
          postType || (post as any).postType, 
          post.profiles?.tier,
          (post as any).is_urgent,
          (post as any).is_world_prayer,
          (post as any).is_admin_approved,
          (post as any).category
        );
    
    return (
      <div key={post.id} className={`rounded-lg border ${bgColorClass} overflow-hidden`}>
        {/* Post Header - Always visible */}
        <div 
          className="p-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
          onClick={() => toggleExpand(post.id)}
        >
          <div className="flex items-start gap-3">
            <Avatar url={post.profiles?.avatar_url} tier={post.profiles?.tier} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openProfileModal(post.profiles);
                  }}
                  className="text-sm font-medium text-stone-800 hover:text-blue-600 hover:underline cursor-pointer"
                >
                  {getDisplayName(post.profiles)}
                </button>
                {post.profiles?.tier && !post.profiles.tier.toLowerCase().includes('admin') && (
                  <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                    {post.profiles.tier}
                  </span>
                )}
                {post.is_best && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                    ★ 베스트
                  </span>
                )}
                {/* Post Type Badge */}
                {!isPinned && getPostBadge(
                  postType || (post as any).postType, 
                  post.profiles?.tier,
                  (post as any).is_urgent,
                  (post as any).is_world_prayer,
                  (post as any).is_admin_approved,
                  (post as any).category
                )}
              </div>
              
              {/* Title with Post Number */}
              <h3 className="text-base font-semibold text-stone-900 mb-1 line-clamp-2">
                {isPinned ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-amber-600">📌</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">공지</span>
                    <span className="text-stone-400 font-normal">|</span>
                    {post.title || '제목 없음'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-sm text-stone-400 font-normal">{post.post_number || '#'}</span>
                    {post.title || '제목 없음'}
                  </span>
                )}
              </h3>
              
              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span>{formatTime(post.created_at)}</span>
                {post.verse_ref && post.verse_ref !== '글로벌 게시판' && (
                  <span 
                    className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:underline cursor-pointer transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleNavigateToVerse(post); }}
                    title="본문으로 이동"
                  >
                    <BookOpen className="w-3 h-3" />
                    {post.verse_ref}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {post.replyCount || 0}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <Heart className="w-3 h-3" />
                  {post.likesCount || 0}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isPinned && <Pin className="w-4 h-4 text-amber-500" />}
              {isExpanded ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
            </div>
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-stone-100">
            {/* Post Content */}
            <div className="p-4 pt-3">
              <p className="text-sm text-stone-700 leading-relaxed break-words whitespace-pre-wrap">
                {renderContentWithHashtags(post.content || '')}
              </p>
              {/* Hashtags */}
              {extractHashtags(post.content || '').length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {extractHashtags(post.content || '').map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHashtagFilter(tag);
                        setViewMode('feed');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded-full transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              {/* Like Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleLike(post.id, post.userHasLiked || false); }}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  post.userHasLiked 
                    ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                    : 'text-stone-600 hover:text-red-600 hover:bg-stone-100'
                }`}
              >
                <Heart className={`w-3 h-3 ${post.userHasLiked ? 'fill-current' : ''}`} />
                좋아요 {post.likesCount || 0}
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors"
              >
                <Link2 className="w-3 h-3" />
                링크 복사
              </button>
              
              {/* Edit Button - ⭐⭐⭐ Hardworking and above only */}
              {currentUserId === post.user_id && canEditPost && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  수정
                </button>
              )}
              
              {/* Delete Button - Staff/Admin can delete immediately, others request delete */}
              {currentUserId === post.user_id && (
                canDeleteImmediate ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(post.id, post.user_id); }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </button>
                ) : (
                  <button
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      try {
                        const supabase = getSupabase();
                        const { error } = await supabase
                          .from('reflections')
                          .update({ delete_requested: true })
                          .eq('id', post.id);
                        
                        if (error) {
                          console.error('Delete request error:', error);
                          alert('삭제 요청 중 오류가 발생했습니다.');
                          return;
                        }
                        alert('삭제 요청이 접수되었습니다. 관리자 승인 후 처리됩니다.');
                      } catch (err) {
                        console.error('Delete request failed:', err);
                        alert('삭제 요청 중 오류가 발생했습니다.');
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제 요청
                  </button>
                )
              )}
              
              {isAdmin && (
                <>
                  {/* Urgent Prayer Toggle - Only for prayer posts */}
                  {((post as any).category === 'prayer_general' || (post as any).category === 'prayer_world' || (post as any).is_urgent) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleUrgent(post.id, (post as any).is_urgent); }}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        (post as any).is_urgent 
                          ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200' 
                          : 'text-stone-600 hover:text-red-700 hover:bg-stone-100'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {(post as any).is_urgent ? '🚨 긴급 해제' : '🚨 긴급 설정'}
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(post.id, post.is_pinned); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      post.is_pinned 
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                        : 'text-stone-600 hover:text-amber-700 hover:bg-stone-100'
                    }`}
                  >
                    <Pin className="w-3 h-3" />
                    {post.is_pinned ? '공지 해제' : '공지 등록'}
                  </button>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleBest(post.id, post.is_best); }}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      post.is_best 
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' 
                        : 'text-stone-600 hover:text-amber-700 hover:bg-stone-100'
                    }`}
                  >
                    <Crown className="w-3 h-3" />
                    {post.is_best ? '베스트 해제' : '베스트 선정'}
                  </button>
                </>
              )}
            </div>
            
            {/* Replies Section */}
            <div className="border-t border-stone-100 bg-stone-50/30 p-4">
              <h4 className="text-xs font-medium text-stone-600 mb-3 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                댓글 {replies[post.id]?.length || post.replyCount || 0}
              </h4>
              
              {/* Existing Replies */}
              {loadingReplies[post.id] ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {(replies[post.id] || []).map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <CornerDownRight className="w-4 h-4 text-stone-300 mt-1 flex-shrink-0" />
                      <div className="flex-1 bg-white rounded-lg p-3 border border-stone-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar url={reply.profiles?.avatar_url} tier={reply.profiles?.tier} size="sm" />
                          <span className="text-xs font-medium text-stone-700">
                            {getDisplayName(reply.profiles)}
                          </span>
                          <span className="text-xs text-stone-400">{formatTime(reply.created_at)}</span>
                        </div>
                        <p className="text-sm text-stone-700 leading-relaxed break-words whitespace-pre-wrap pl-8">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Reply Input */}
              {canWrite && (
                <div className="flex gap-2">
                  <CornerDownRight className="w-4 h-4 text-stone-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newReply[post.id] || ''}
                      onChange={(e) => setNewReply(prev => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="댓글을 입력하세요..."
                      className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveReply(post.id)}
                    />
                    <button
                      onClick={() => handleSaveReply(post.id)}
                      disabled={!newReply[post.id]?.trim() || savingReply[post.id]}
                      className="px-3 py-2 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-600 disabled:opacity-50 transition-colors"
                    >
                      {savingReply[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Desktop Table View for Posts
  const renderPostsTable = (postsToRender: Post[]) => {
    const getCategoryLabel = (post: Post) => {
      const cat = (post as any).category;
      if (cat === 'prayer_general') return { label: '기도', color: 'text-amber-600 bg-amber-50' };
      if (cat === 'prayer_world') return { label: '세계기도', color: 'text-blue-600 bg-blue-50' };
      if ((post as any).is_urgent) return { label: '긴급', color: 'text-red-600 bg-red-50' };
      if (cat === 'ministry' || (post as any).postType === 'study_note') return { label: '사역', color: 'text-purple-600 bg-purple-50' };
      return { label: '묵상', color: 'text-stone-600 bg-stone-50' };
    };

    const getPostIcon = (post: Post) => {
      if ((post as any).is_urgent) return <AlertTriangle className="w-4 h-4 text-red-500" />;
      if (post.is_pinned) return <Pin className="w-4 h-4 text-amber-500" />;
      if (post.is_best) return <Sparkles className="w-4 h-4 text-amber-500" />;
      return <span className="text-xs text-stone-400">{post.post_number || '#'}</span>;
    };

    return (
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {/* Table Header */}
        <table className="w-full text-sm">
          <thead className="bg-stone-100 border-b border-stone-200">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-medium text-stone-600 w-14">번호</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-stone-600 w-20">분류</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-stone-600 w-auto">제목</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-stone-600 w-24">작성자</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-stone-600 w-20">작성일</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-stone-600 w-16">좋아요</th>
            </tr>
          </thead>
          <tbody>
            {postsToRender.map((post, index) => {
              const category = getCategoryLabel(post);
              const replyCount = post.replyCount || 0;
              
              return (
                <tr 
                  key={post.id} 
                  className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors last:border-b-0"
                  onClick={() => toggleExpand(post.id)}
                >
                  {/* 번호 */}
                  <td className="px-3 py-3 text-center">
                    {getPostIcon(post)}
                  </td>
                  
                  {/* 분류 */}
                  <td className="px-2 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${category.color}`}>
                      {category.label}
                    </span>
                  </td>
                  
                  {/* 제목 - 가장 넓은 공간 */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-stone-800 line-clamp-1 text-sm">
                          {post.title || post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')}
                        </h4>
                        {replyCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                            <MessageCircle className="w-3 h-3" />
                            {replyCount}
                          </span>
                        )}
                      </div>
                      {!post.title && (
                        <p className="text-xs text-stone-500 line-clamp-1">{post.content.substring(0, 80)}...</p>
                      )}
                      {post.verse_ref && post.verse_ref !== '글로벌 게시판' && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {post.verse_ref}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* 작성자 */}
                  <td className="px-3 py-3 text-center">
                    <span className="text-sm text-stone-600 truncate">
                      {getDisplayName(post.profiles)}
                    </span>
                  </td>
                  
                  {/* 작성일 */}
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-stone-500">
                      {new Date(post.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </td>
                  
                  {/* 좋아요 */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-red-500">
                      <Heart className="w-3.5 h-3.5" fill={post.userHasLiked ? "currentColor" : "none"} />
                      <span className="text-xs font-medium">{post.likesCount || 0}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="px-4 py-3 bg-stone-100 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-stone-600" />
          <h2 className="text-sm font-serif font-semibold text-stone-700">
            커뮤니티 게시판
          </h2>
        </div>
        <p className="text-xs text-stone-500 mt-1 lg:hidden">
          성경 묵상과 나눔의 공간
        </p>
        <p className="text-xs text-stone-500 mt-1 hidden lg:block">
          말씀 중심 · 자유 게시판 · 기도 제목
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className="flex border-b border-stone-200 bg-white">
        <button
          onClick={() => {
            setViewMode('feed');
            setHashtagFilter(null);
          }}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            viewMode === 'feed' && !hashtagFilter
              ? 'text-stone-800 border-b-2 border-stone-800' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <MessageSquare className="w-3 h-3" />
            전체 게시글
          </span>
        </button>
        <button
          onClick={() => {
            setViewMode('all-posts');
            setHashtagFilter(null);
            // Load initial chapter data
            if (Object.keys(allPostsByChapter).length === 0) {
              loadAllPostsByChapter(selectedBookForView, selectedChapterForView);
            }
          }}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            viewMode === 'all-posts'
              ? 'text-stone-800 border-b-2 border-stone-800' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <BookOpen className="w-3 h-3" />
            장별 모아보기
          </span>
        </button>
      </div>

      {/* Hashtag Filter Banner */}
      {hashtagFilter && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
          <span className="text-xs text-blue-700">
            필터: <span className="font-bold">{hashtagFilter}</span>
          </span>
          <button
            onClick={() => setHashtagFilter(null)}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-100 rounded transition-colors"
          >
            필터 해제 ✕
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* New Post Input - ⭐ General cannot write, show upgrade button instead */}
        {isLoggedIn && isGeneral && (
          <div className="p-3 border-b border-stone-200 bg-stone-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-600">
                ⭐ 등급은 읽기만 가능합니다. 글쓰기는 ⭐⭐ 이상부터 가능합니다.
              </p>
              <button
                onClick={async () => {
                  try {
                    const supabase = getSupabase();
                    const { error } = await supabase
                      .from('profiles')
                      .update({ upgrade_requested: true })
                      .eq('id', currentUserId);
                    
                    if (error) {
                      console.error('Upgrade request error:', error);
                      alert('등업 신청 중 오류가 발생했습니다.');
                      return;
                    }
                    alert('등업 신청이 완료되었습니다. 관리자 승인 후 등급이 상승됩니다.');
                  } catch (err) {
                    console.error('Upgrade request failed:', err);
                    alert('등업 신청 중 오류가 발생했습니다.');
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <Crown className="w-3 h-3" />
                등업 신청하기
              </button>
            </div>
          </div>
        )}
        
        {canWrite && (
          <div className="p-3 border-b border-stone-200 bg-white">
            <div className="space-y-2">
              {/* Post Category Tabs */}
              <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
                <button
                  onClick={() => { setPostCategory('reflection'); setPrayerType('normal'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    postCategory === 'reflection' 
                      ? 'bg-white text-stone-800 shadow-sm font-medium' 
                      : 'text-stone-600 hover:text-stone-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  묵상/나눔
                </button>
                <button
                  onClick={() => setPostCategory('prayer')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    postCategory === 'prayer' 
                      ? 'bg-white text-stone-800 shadow-sm font-medium' 
                      : 'text-stone-600 hover:text-stone-800'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  기도제목
                </button>
              </div>
              
              {/* Prayer Type Selection (only when prayer category selected) */}
              {postCategory === 'prayer' && showPrayerTabs && (
                <div className="flex gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <button
                    onClick={() => setPrayerType('normal')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                      prayerType === 'normal' 
                        ? 'bg-white text-amber-700 shadow-sm border border-amber-200' 
                        : 'text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    일반 기도
                    <span className="text-[10px] opacity-70">(24시간 1회)</span>
                  </button>
                  <button
                    onClick={() => setPrayerType('world')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                      prayerType === 'world' 
                        ? 'bg-white text-blue-700 shadow-sm border border-blue-200' 
                        : 'text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    세계 기도
                    <span className="text-[10px] opacity-70">(관리자 승인)</span>
                  </button>
                </div>
              )}
              
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={postCategory === 'prayer' ? '기도 제목을 입력하세요 (선택사항)' : '제목을 입력하세요 (선택사항)'}
                className="w-full px-3 py-2 text-sm font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200 placeholder:text-stone-400"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={postCategory === 'prayer' 
                  ? (prayerType === 'world' 
                    ? '세계를 위한 기도제목을 작성해 주세요. 관리자 승인 후 게시됩니다.' 
                    : '기도제목을 작성해 주세요. 24시간에 1회만 작성 가능합니다.')
                  : '성경 묵상, 질문, 나눔 등을 자유롭게 작성해 보세요...'}
                className="w-full h-24 p-3 text-sm leading-relaxed bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 placeholder:text-stone-400"
              />
              
              {/* Include verse reference toggle */}
              {selectedVerse && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIncludeVerse(!includeVerse)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      includeVerse 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    {includeVerse ? '성경 주소 포함됨' : '성경 주소 포함'}
                    {includeVerse && (
                      <span className="ml-1 font-medium">
                        {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.verse}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={handleSavePost}
                  disabled={!newContent.trim() || saving}
                  className="flex items-center gap-1 px-4 py-2 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {saving ? '저장 중...' : '게시하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📢 Real-time Notice Panel - At the very top */}
        {notice && !isEditingNotice && (
          <div className="p-4 border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">📢 연구소 공지사항</span>
                  {isAdminTier && (
                    <button
                      onClick={() => setIsEditingNotice(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                      title="공지사항 수정"
                    >
                      <Settings className="w-3 h-3" />
                      수정
                    </button>
                  )}
                </div>
                <div className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
                  {notice.content}
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  업데이트: {new Date(notice.updated_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Edit Mode for Notice */}
        {isEditingNotice && isAdminTier && (
          <div className="p-4 border-b-2 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-blue-700">📢 공지사항 편집</span>
            </div>
            <textarea
              value={noticeEditContent}
              onChange={(e) => setNoticeEditContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요..."
              className="w-full h-32 p-3 text-sm bg-white border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 placeholder:text-stone-400 mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditingNotice(false);
                  setNoticeEditContent(notice?.content || '');
                }}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveNotice}
                disabled={!noticeEditContent.trim() || savingNotice}
                className="flex items-center gap-1 px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingNotice ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    저장
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Pinned Posts */}
        {pinnedPosts.length > 0 && (
          <div className="p-3 space-y-2 border-b border-stone-200 bg-amber-50/20">
            <div className="flex items-center gap-2 px-1">
              <Pin className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">공지사항</span>
            </div>
            {pinnedPosts.map(post => renderPost(post, true))}
          </div>
        )}

        {/* Ministry Notes (⭐⭐⭐⭐⭐ Admin Pinned) */}
        {ministryNotes.length > 0 && (
          <div className="p-3 space-y-2 border-b border-stone-200 bg-purple-50/30">
            <div className="flex items-center gap-2 px-1">
              <Crown className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">소장님 사역/주석</span>
              {selectedVerse && (
                <span className="text-xs text-purple-500">
                  · {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.verse}
                </span>
              )}
            </div>
            {ministryNotes.map((note: any) => (
              <div key={note.id} className="bg-white rounded-lg border border-purple-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-purple-700">{getDisplayName(note.profiles)}</span>
                  <span className="text-xs text-stone-400">· {new Date(note.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Feed View */}
        {viewMode === 'feed' && (
          <div className="p-3 space-y-3">
            {/* Mobile View (sm, md) - Single column with existing tabs */}
            <div className="lg:hidden">
              <div className="flex items-center gap-2 px-1 mb-3">
                <Users className="w-3 h-3 text-stone-500" />
                <span className="text-xs font-medium text-stone-600">
                  {hashtagFilter ? '필터링된 게시글' : '전체 게시글'}
                </span>
              </div>
              
              {loadingPosts && posts.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : getFilteredPosts().length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{hashtagFilter ? '해당 태그의 게시글이 없습니다.' : '아직 게시글이 없습니다.'}</p>
                  {!hashtagFilter && <p className="text-xs mt-1">첫 번째 글을 작성해보세요!</p>}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {getFilteredPosts().map(post => renderPost(post))}
                  </div>
                  
                  {/* Load More */}
                  {!hashtagFilter && hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingPosts}
                      className="w-full py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      {loadingPosts ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        '더 보기'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
            
            {/* Desktop View (lg and above) - 3 Column Layout */}
            <div className="hidden lg:block">
              {/* Desktop Tabs */}
              <div className="flex border-b border-stone-200 mb-4 bg-white rounded-lg">
                <button
                  onClick={() => setDesktopTab('scripture')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors rounded-l-lg ${
                    desktopTab === 'scripture'
                      ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    말씀 중심
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">{getScripturePosts().length}</span>
                  </span>
                </button>
                <button
                  onClick={() => setDesktopTab('free')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    desktopTab === 'free'
                      ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    자유 게시판
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">{getFreeBoardPosts().length}</span>
                  </span>
                </button>
                <button
                  onClick={() => setDesktopTab('prayer')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors rounded-r-lg ${
                    desktopTab === 'prayer'
                      ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Heart className="w-4 h-4" />
                    기도 제목
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">{getPrayerPosts().length}</span>
                  </span>
                </button>
              </div>
              
              {/* Desktop Content */}
              {loadingPosts && posts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
              ) : (
                <>
                  {desktopTab === 'scripture' && (
                    getScripturePosts().length === 0 ? (
                      <div className="text-center py-12 text-stone-400 bg-white rounded-lg border border-stone-200">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">말씀 연결된 게시글이 없습니다.</p>
                      </div>
                    ) : renderPostsTable(getScripturePosts())
                  )}
                  
                  {desktopTab === 'free' && (
                    getFreeBoardPosts().length === 0 ? (
                      <div className="text-center py-12 text-stone-400 bg-white rounded-lg border border-stone-200">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">자유 게시글이 없습니다.</p>
                      </div>
                    ) : renderPostsTable(getFreeBoardPosts())
                  )}
                  
                  {desktopTab === 'prayer' && (
                    getPrayerPosts().length === 0 ? (
                      <div className="text-center py-12 text-stone-400 bg-white rounded-lg border border-stone-200">
                        <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">기도 제목이 없습니다.</p>
                      </div>
                    ) : renderPostsTable(getPrayerPosts())
                  )}
                  
                  {/* Load More */}
                  {!hashtagFilter && hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingPosts}
                      className="w-full mt-4 py-3 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
                    >
                      {loadingPosts ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        '더 보기'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* All Posts by Chapter View */}
        {viewMode === 'all-posts' && (
          <div className="p-3 space-y-3">
            {/* Book/Chapter Selector */}
            <div className="flex items-center gap-2 mb-4">
              <select
                value={selectedBookForView}
                onChange={(e) => {
                  setSelectedBookForView(e.target.value);
                  loadAllPostsByChapter(e.target.value, selectedChapterForView);
                }}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>{book.name}</option>
                ))}
              </select>
              <select
                value={selectedChapterForView}
                onChange={(e) => {
                  const chapter = parseInt(e.target.value);
                  setSelectedChapterForView(chapter);
                  loadAllPostsByChapter(selectedBookForView, chapter);
                }}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-200"
              >
                {Array.from({ length: books.find(b => b.id === selectedBookForView)?.chapters || 28 }, (_, i) => i + 1).map(ch => (
                  <option key={ch} value={ch}>{ch}장</option>
                ))}
              </select>
              <button
                onClick={() => loadAllPostsByChapter(selectedBookForView, selectedChapterForView)}
                className="px-3 py-1.5 text-sm bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
              >
                <Loader2 className={`w-4 h-4 ${loadingAllPosts ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              <span className="flex items-center gap-1 px-2 py-1 bg-stone-100 rounded">
                <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                일반 묵상
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                동역자 사역
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                공식 주석
              </span>
            </div>

            {/* Accordion by Verse */}
            {loadingAllPosts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
              </div>
            ) : Object.keys(allPostsByChapter).length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">이 장에는 아직 게시글이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(allPostsByChapter)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([verse, versePosts]) => (
                    <div key={verse} className="border border-stone-200 rounded-lg overflow-hidden">
                      {/* Verse Header */}
                      <button
                        onClick={() => toggleVerseExpansion(parseInt(verse))}
                        className="w-full px-3 py-2 bg-stone-50 flex items-center justify-between hover:bg-stone-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-stone-700">
                          {bookNameMap[selectedBookForView] || selectedBookForView} {selectedChapterForView}:{verse}
                          <span className="ml-2 text-xs text-stone-500">({versePosts.length}개)</span>
                        </span>
                        {expandedVerses.has(parseInt(verse)) ? (
                          <ChevronUp className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        )}
                      </button>
                      
                      {/* Verse Posts */}
                      {expandedVerses.has(parseInt(verse)) && (
                        <div className="p-2 space-y-2">
                          {versePosts.map((post: any) => (
                            <div
                              key={post.id}
                              className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                                post.postType === 'admin_note' || post.profiles?.tier === '관리자' || post.profiles?.tier === 'Admin' || post.profiles?.tier?.includes('⭐⭐⭐⭐⭐')
                                  ? 'bg-purple-50 border-purple-200' 
                                  : post.postType === 'study_note'
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-stone-50 border-stone-200'
                              }`}
                              onClick={() => {
                                // Navigate to verse
                                if (onNavigateToVerse) {
                                  onNavigateToVerse(selectedBookForView, selectedChapterForView, parseInt(verse));
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {getPostBadge(post.postType, post.profiles?.tier)}
                                <span className="text-xs font-medium text-stone-700">{getDisplayName(post.profiles)}</span>
                                <span className="text-xs text-stone-400">{formatTime(post.created_at)}</span>
                              </div>
                              <p className="text-sm text-stone-800 line-clamp-2">{post.content}</p>
                              {post.title && (
                                <p className="text-xs text-stone-500 mt-1">제목: {post.title}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Profile Modal */}
      {profileModalOpen && profileModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Users className="w-4 h-4" />
                사용자 프로필
              </h3>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1 hover:bg-stone-200 rounded-full transition-colors"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Profile Info */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                  {profileModalUser.avatar_url ? (
                    <img src={profileModalUser.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-stone-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-stone-800">
                    {getDisplayName(profileModalUser)}
                  </h4>
                  <p className="text-sm text-stone-500">{profileModalUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      profileModalUser.tier === '관리자' || profileModalUser.tier === 'Admin' || profileModalUser.tier?.includes('⭐⭐⭐⭐⭐')
                        ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {profileModalUser.tier || 'General'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Activity Summary */}
              {loadingProfileActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : profileModalActivity ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 p-2 bg-stone-50 rounded text-center">
                      <div className="text-xl font-bold text-stone-800">{profileModalActivity.reflections.length}</div>
                      <div className="text-xs text-stone-500">묵상</div>
                    </div>
                    <div className="flex-1 p-2 bg-blue-50 rounded text-center">
                      <div className="text-xl font-bold text-stone-800">{profileModalActivity.studyNotes.length}</div>
                      <div className="text-xs text-stone-500">사역</div>
                    </div>
                  </div>
                  
                  {/* Recent Reflections */}
                  {profileModalActivity.reflections.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-stone-700 mb-2">최근 묵상</h5>
                      <div className="space-y-2">
                        {profileModalActivity.reflections.slice(0, 3).map((ref) => (
                          <div key={ref.id} className="p-2 bg-stone-50 rounded text-sm">
                            <div className="text-xs text-stone-400">{ref.verse_ref || '글로벌'}</div>
                            <p className="text-stone-700 line-clamp-2">{ref.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Recent Study Notes */}
                  {profileModalActivity.studyNotes.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-stone-700 mb-2">최근 사역</h5>
                      <div className="space-y-2">
                        {profileModalActivity.studyNotes.slice(0, 3).map((note) => (
                          <div key={note.id} className="p-2 bg-blue-50 rounded text-sm">
                            <div className="text-xs text-stone-400">{note.verse_ref}</div>
                            <p className="text-stone-700 line-clamp-2">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            
            {/* Modal Footer */}
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-200">
              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-full py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
