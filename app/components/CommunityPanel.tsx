'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SelectedVerse } from '@/app/types';
import { 
  Users, Send, Loader2, MessageSquare, Pin, BookOpen, Hash, 
  ChevronDown, ChevronUp, Link2, Crown, MessageCircle, CornerDownRight,
  Heart, Trash2, Megaphone, Settings, AlertTriangle, Globe, Clock, Sparkles,
  Church, MapPin, User, Cross, Filter, Tag, BookMarked, Home, ArrowLeft
} from 'lucide-react';
import { 
  addPublicReflection, getPublicReflections, getSupabase, toggleBestReflection,
  addReply, getReplies, togglePinPost, getPinnedPosts, StudioReflection,
  addLike, removeLike, hasUserLiked, getLikesCount, deleteReflection, getCurrentUser,
  checkIsAdmin, getStudyNotesForVerse, getNotice, updateNotice, bookNameMap,
  getUserActivity, hasPrayerInLast24Hours, toggleUrgentPrayer,
  updatePrayerStatus, getUserPrayerHistory, getLinkedPrayer, addPrayerWithLink, PrayerStatus,
  requestUpgrade
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
  const router = useRouter();
  
  // Permission helpers based on tier
  const isGeneral = userRole === '준회원';
  const isRegular = userRole === '정회원';
  const isHardworking = userRole === '열심회원';
  const isStaff = userRole === '스태프';
  const isAdminTier = userRole === '관리자';
  
  const canWrite = isLoggedIn && !isGeneral; // 준회원은 쓰기 불가
  const canLike = isLoggedIn; // 모든 로그인 사용자 가능
  const canEditPost = isHardworking || isStaff || isAdminTier; // 열심회원 이상 수정 가능
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
  
  // New post states - COMPLETELY SEPARATED for free board and prayer board
  const [freeTitle, setFreeTitle] = useState('');
  const [freeContent, setFreeContent] = useState('');
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [includeVerse, setIncludeVerse] = useState(false);
  
  // Posts states
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Accordion state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(initialPostId || null);
  
  // Highlight state for deep-linked posts
  const [highlightedPostId, setHighlightedPostState] = useState<string | null>(initialPostId || null);
  
  // Detail view states for free board and prayer board
  const [selectedFreePost, setSelectedFreePost] = useState<Post | null>(null);
  const [selectedPrayerPost, setSelectedPrayerPost] = useState<Post | null>(null);
  // Full view mode for each board
  const [fullViewBoard, setFullViewBoard] = useState<'free' | 'prayer' | null>(null);
  
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
  
  // View state - only feed mode (3-column layout)
  const [viewMode] = useState<'feed'>('feed');
  
  // Hashtag filter state
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  
  // Prayer system states
  const [prayerCategory, setPrayerCategory] = useState<'general' | 'world'>('general');
  const [lastPrayerTime, setLastPrayerTime] = useState<Date | null>(null);
  const [checkingLastPrayer, setCheckingLastPrayer] = useState(false);
  
  // Upgrade request state
  const [upgradeRequested, setUpgradeRequested] = useState(false);
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  
  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<any>(null);
  const [profileModalActivity, setProfileModalActivity] = useState<{reflections: any[]; studyNotes: any[]} | null>(null);
  const [loadingProfileActivity, setLoadingProfileActivity] = useState(false);

  // Prayer panel state (5 types including 'all')
  const [prayerType, setPrayerType] = useState<'all' | 'world' | 'nation' | 'church' | 'personal'>('all');
  
  // Prayer status states
  const [prayerStatusModal, setPrayerStatusModal] = useState<{open: boolean, postId: string | null, currentStatus: string}>({open: false, postId: null, currentStatus: 'wait'});
  const [testimonyNote, setTestimonyNote] = useState('');
  const [updatingPrayerStatus, setUpdatingPrayerStatus] = useState(false);
  
  // Prayer history for linking
  const [userPrayerHistory, setUserPrayerHistory] = useState<Post[]>([]);
  const [linkedPrayerId, setLinkedPrayerId] = useState<string | null>(null);
  const [showLinkedPrayer, setShowLinkedPrayer] = useState<Record<string, boolean>>({});
  const [linkedPrayerDetails, setLinkedPrayerDetails] = useState<Record<string, Post>>({});
  const [loadingPrayerHistory, setLoadingPrayerHistory] = useState(false);
  
  // Toggle states for input forms (Step 1 UX improvement)
  const [showFreeInput, setShowFreeInput] = useState(false);
  const [showPrayerInput, setShowPrayerInput] = useState(false);
  
  // Desktop tab state (for backward compatibility)
  const [desktopTab, setDesktopTab] = useState<'free' | 'prayer'>('free');
  
  // Mobile board tab state
  const [mobileBoardTab, setMobileBoardTab] = useState<'free' | 'prayer'>('free');
  
  
  const getFreeBoardPosts = () => {
    // Simplified: Only show posts with category 'general' (free board posts)
    return posts.filter(post => {
      const cat = (post as any).category;
      return cat === 'general';
    });
  };
  
  const getPrayerPosts = () => {
    // First filter by category (prayer posts only)
    const prayerPosts = posts.filter(post => {
      const cat = (post as any).category;
      return cat === 'prayer_general' || cat === 'prayer_world';
    });
    
    // Then filter by prayerType if not 'all'
    if (prayerType === 'all') {
      return prayerPosts;
    }
    
    return prayerPosts.filter(post => {
      const postType = getPrayerType(post);
      return postType === prayerType;
    });
  };

  // Get prayer type from post (using prayer_type field or infer from content)
  const getPrayerType = (post: Post): 'world' | 'nation' | 'church' | 'personal' => {
    const pt = (post as any).prayer_type;
    if (pt === 'world' || pt === 'nation' || pt === 'church' || pt === 'personal') {
      return pt;
    }
    // Infer from category or is_world_prayer
    if ((post as any).category === 'prayer_world' || (post as any).is_world_prayer) {
      return 'world';
    }
    return 'personal';
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

  // Auto-scroll and highlight initial post when deep-linked
  // Also auto-enter detail view mode for free/prayer/scripture boards
  useEffect(() => {
    if (initialPostId && posts.length > 0) {
      // Find the post and check its category
      const post = posts.find(p => p.id === initialPostId);
      if (post) {
        const cat = (post as any).category;
        // Auto-enter detail view for different board types
        if (cat === 'general') {
          setSelectedFreePost(post);
        } else if (cat === 'prayer_general' || cat === 'prayer_world') {
          setSelectedPrayerPost(post);
        }
      }
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(`post-${initialPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight for 3 seconds then remove
          setTimeout(() => {
            setHighlightedPostState(null);
          }, 3000);
        }
      }, 500);
    }
  }, [initialPostId, posts.length]);

  // Load ministry notes for selected verse (관리자 pinned)
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
          note.profiles?.tier === '관리자'
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

  // Check 24h prayer limit - now allows 5 prayers per day
  const DAILY_PRAYER_LIMIT = 5;
  const [todayPrayerCount, setTodayPrayerCount] = useState(0);
  
  // Load today's prayer count
  useEffect(() => {
    const loadTodayCount = async () => {
      if (!currentUserId) return;
      try {
        const supabase = getSupabase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count, error } = await supabase
          .from('reflections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .gte('created_at', today.toISOString())
          .in('category', ['prayer_general', 'prayer_world']);
        if (!error) {
          setTodayPrayerCount(count || 0);
        }
      } catch (err) {
        console.error('Error loading today prayer count:', err);
      }
    };
    loadTodayCount();
  }, [currentUserId, posts]); // Reload when posts change
  
  const checkPrayerLimit = async () => {
    if (!currentUserId) return true;
    
    setCheckingLastPrayer(true);
    try {
      if (todayPrayerCount >= DAILY_PRAYER_LIMIT) {
        alert(`하루에 최대 ${DAILY_PRAYER_LIMIT}개의 기도만 작성할 수 있습니다.\n내일 다시 작성해 주세요.`);
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

  // Save new post - COMPLETELY SEPARATED logic for free vs prayer boards
  const handleSavePost = async (target: 'free' | 'prayer') => {
    // Use appropriate state based on target
    const title = target === 'free' ? freeTitle : prayerTitle;
    const content = target === 'free' ? freeContent : prayerContent;
    
    if (!content.trim() || !canWrite) return;

    setSaving(true);
    try {
      // Use Korean book name for DB consistency
      const koreanBookName = selectedVerse ? (bookNameMap[selectedVerse.book] || selectedVerse.book) : '글로벌';
      const verseRef = includeVerse && selectedVerse 
        ? `${koreanBookName} ${selectedVerse.chapter}:${selectedVerse.verse}`
        : '글로벌 게시판';
      
      if (target === 'free') {
        // FREE BOARD: Always category 'general'
        await addPublicReflection(
          verseRef,
          koreanBookName,
          selectedVerse?.chapter || 0,
          selectedVerse?.verse || 0,
          content,
          true,
          'general', // Always general for free board
          null,
          title.trim() || null,
          false,
          false,
          undefined,
          undefined,
          undefined,
          undefined
        );
        
        // Clear free board inputs
        setFreeTitle('');
        setFreeContent('');
      } else {
        // PRAYER BOARD: Check prayer type and 24h limit
        const isWorldPrayer = prayerType === 'world';
        
        // Check 24h prayer limit for normal prayers
        if (!isWorldPrayer) {
          const canPost = await checkPrayerLimit();
          if (!canPost) {
            setSaving(false);
            return;
          }
        }
        
        await addPublicReflection(
          verseRef,
          koreanBookName,
          selectedVerse?.chapter || 0,
          selectedVerse?.verse || 0,
          content,
          true,
          isWorldPrayer ? 'prayer_world' : 'prayer_general',
          null,
          title.trim() || null,
          false,
          isWorldPrayer,
          undefined,
          prayerType, // prayer_type from state
          linkedPrayerId,
          'wait'
        );

        // World prayers are now posted immediately without approval
        
        // Clear prayer board inputs
        setPrayerTitle('');
        setPrayerContent('');
        setLinkedPrayerId(null);
      }
      
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

  // Toggle like with optimistic update
  const handleToggleLike = async (postId: string, currentLiked: boolean) => {
    if (!isLoggedIn) {
      alert('로그인 후 좋아요를 누를 수 있습니다.');
      return;
    }
    
    // Optimistic update - update UI immediately
    const optimisticCount = currentLiked ? (posts.find(p => p.id === postId)?.likesCount || 1) - 1 : (posts.find(p => p.id === postId)?.likesCount || 0) + 1;
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likesCount: optimisticCount, userHasLiked: !currentLiked } : p
    ));
    setPinnedPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likesCount: optimisticCount, userHasLiked: !currentLiked } : p
    ));
    
    try {
      if (currentLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
      // Verify with server after API call
      const newCount = await getLikesCount(postId);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: newCount, userHasLiked: !currentLiked } : p
      ));
      setPinnedPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: newCount, userHasLiked: !currentLiked } : p
      ));
    } catch (err: any) {
      console.error('Error toggling like:', err?.message);
      // Rollback on error
      const rollbackCount = currentLiked ? (posts.find(p => p.id === postId)?.likesCount || 0) + 1 : (posts.find(p => p.id === postId)?.likesCount || 1) - 1;
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: rollbackCount, userHasLiked: currentLiked } : p
      ));
      setPinnedPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likesCount: rollbackCount, userHasLiked: currentLiked } : p
      ));
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
  
  // Edit post (placeholder - 열심회원 and above only)
  const handleEdit = (post: Post) => {
    if (!canEditPost) {
      alert('글 수정 권한은 열심회원 등급 이상부터 가능합니다.');
      return;
    }
    // TODO: Implement edit modal or inline editing
    alert('글 수정 기능은 준비중입니다.');
  };
  
  // Navigate to new blog-style verse page
  const handleNavigateToVerse = (post: Post) => {
    if (!post.verse_ref || post.verse_ref === '글로벌 게시판') return;
    
    // Book name mapping from Korean to English ID
    const koreanToEnglishMap: Record<string, string> = {
      '마태복음': 'Matt', '마가복음': 'Mark', '누가복음': 'Luke', '요한복음': 'John',
      '사도행전': 'Acts', '로마서': 'Rom', '고린도전서': '1Cor', '고린도후서': '2Cor',
      '갈라디아서': 'Gal', '에베소서': 'Eph', '빌립보서': 'Phil', '골로새서': 'Col',
      '데살로니가전서': '1Thess', '데살로니가후서': '2Thess', '디모데전서': '1Tim', '디모데후서': '2Tim',
      '디도서': 'Titus', '빌레몬서': 'Phlm', '히브리서': 'Heb', '야고보서': 'Jas',
      '베드로전서': '1Pet', '베드로후서': '2Pet', '요한일서': '1John', '요한이서': '2John',
      '요한삼서': '3John', '유다서': 'Jude', '요한계시록': 'Rev',
      '마태': 'Matt', '마가': 'Mark', '누가': 'Luke', '요한': 'John',
    };
    
    // Parse verse_ref like "Matt 1:1", "마태복음 1:1", "마태 1:1", or "마태복음 1장 전체"
    const verseMatch = post.verse_ref.match(/^([가-힣A-Za-z0-9\s]+)\s+(\d+):(\d+)$/);
    if (verseMatch) {
      const [, bookName, chapter, verse] = verseMatch;
      const bookId = koreanToEnglishMap[bookName.trim()] || bookName.trim();
      router.push(`/read/${bookId}/${chapter}/${verse}`);
      return;
    }
    
    // Try chapter-level format "마태복음 1장 전체" or use post's verse property
    const chapterMatch = post.verse_ref.match(/^([가-힣A-Za-z0-9\s]+)\s+(\d+)장\s+전체$/);
    if (chapterMatch) {
      const [, bookName, chapter] = chapterMatch;
      const bookId = koreanToEnglishMap[bookName.trim()] || bookName.trim();
      // Use post's verse property if available, otherwise default to 1
      const verseNum = (post as any).verse || 1;
      router.push(`/read/${bookId}/${chapter}/${verseNum}`);
      return;
    }
    
    // Fallback: try to get verse from post properties directly
    if ((post as any).book_id && (post as any).chapter && (post as any).verse) {
      const bookId = (post as any).book_id;
      const chapter = (post as any).chapter;
      const verse = (post as any).verse;
      router.push(`/read/${bookId}/${chapter}/${verse}`);
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

  // Load user's prayer history for linking
  const loadUserPrayerHistory = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoadingPrayerHistory(true);
    try {
      const history = await getUserPrayerHistory();
      setUserPrayerHistory(history as Post[]);
    } catch (err) {
      console.error('Error loading prayer history:', err);
    } finally {
      setLoadingPrayerHistory(false);
    }
  }, [isLoggedIn]);

  // Load linked prayer details
  const loadLinkedPrayer = async (prayerId: string) => {
    if (linkedPrayerDetails[prayerId]) return;
    try {
      const prayer = await getLinkedPrayer(prayerId);
      if (prayer) {
        setLinkedPrayerDetails(prev => ({ ...prev, [prayerId]: prayer as Post }));
      }
    } catch (err) {
      console.error('Error loading linked prayer:', err);
    }
  };

  // Toggle linked prayer visibility
  const toggleLinkedPrayer = (postId: string, linkedId: string | null) => {
    if (!linkedId) return;
    setShowLinkedPrayer(prev => ({ ...prev, [postId]: !prev[postId] }));
    if (!showLinkedPrayer[postId]) {
      loadLinkedPrayer(linkedId);
    }
  };

  // Handle prayer status update
  const handlePrayerStatusUpdate = async (status: PrayerStatus) => {
    if (!prayerStatusModal.postId) return;
    
    setUpdatingPrayerStatus(true);
    try {
      await updatePrayerStatus(
        prayerStatusModal.postId,
        status,
        status === 'yes' ? testimonyNote : undefined
      );
      
      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === prayerStatusModal.postId 
          ? { ...post, prayer_status: status, testimony_note: status === 'yes' ? testimonyNote : null } as Post
          : post
      ));
      
      setPrayerStatusModal({ open: false, postId: null, currentStatus: 'wait' });
      setTestimonyNote('');
    } catch (err: any) {
      console.error('Error updating prayer status:', err);
      alert('기도 상태 업데이트 중 오류: ' + (err?.message || 'Unknown error'));
    } finally {
      setUpdatingPrayerStatus(false);
    }
  };

  // Open prayer status modal
  const openPrayerStatusModal = (postId: string, currentStatus: string) => {
    setPrayerStatusModal({ open: true, postId, currentStatus });
    if (currentStatus === 'yes') {
      const post = posts.find(p => p.id === postId);
      if (post) setTestimonyNote((post as any).testimony_note || '');
    }
  };

  // Standard timestamp format: YYYY. MM. DD. HH:mm
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
    if ((postType === 'admin_note' || postType === 'study_note') && tier === '관리자') {
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
    if ((postType === 'admin_note' || postType === 'study_note') && tier === '관리자') {
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
    
    const isHighlighted = highlightedPostId === post.id;
    
    return (
      <div 
        key={post.id} 
        id={`post-${post.id}`}
        className={`rounded-lg border ${bgColorClass} overflow-hidden transition-all duration-500 ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50 shadow-lg' : ''}`}
      >
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
                    router.push(`/profile/${post.user_id}`);
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}
                      className="text-xs font-bold text-stone-500 hover:text-amber-600 hover:bg-amber-50 px-2 py-0.5 rounded transition-colors"
                      title="게시글 링크 복사"
                    >
                      #{post.post_number || post.id.slice(0, 6)}
                    </button>
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
              
              {/* Edit Button - 열심회원 and above only */}
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
                ) : (post as any).delete_requested ? (
                  /* Cancel Delete Request */
                  <button
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      try {
                        const supabase = getSupabase();
                        const { error } = await supabase
                          .from('reflections')
                          .update({ delete_requested: false })
                          .eq('id', post.id);
                        
                        if (error) {
                          console.error('Cancel delete request error:', error);
                          alert('삭제 요청 취소 중 오류가 발생했습니다.');
                          return;
                        }
                        // Refresh posts to show updated state
                        await loadPosts(1, false);
                        alert('삭제 요청이 취소되었습니다.');
                      } catch (err) {
                        console.error('Cancel delete request failed:', err);
                        alert('삭제 요청 취소 중 오류가 발생했습니다.');
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                  >
                    ↩️ 삭제 요청 취소
                  </button>
                ) : (
                  /* Request Delete */
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
                        // Refresh posts to show updated state
                        await loadPosts(1, false);
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
                      {formatTime(post.created_at)}
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
        {/* New Post Input - 준회원 cannot write, show upgrade button instead */}
        {isLoggedIn && isGeneral && !upgradeRequested && (
          <div className="p-3 border-b border-stone-200 bg-stone-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-600">
                준회원 등급은 읽기만 가능합니다. 글쓰기는 정회원 이상부터 가능합니다.
              </p>
              <button
                onClick={async () => {
                  if (!currentUserId) return;
                  setRequestingUpgrade(true);
                  try {
                    await requestUpgrade(currentUserId, '', '', '', false, false);
                    setUpgradeRequested(true);
                    alert('등업 신청이 완료되었습니다. 관리자 승인 후 등급이 상승됩니다.');
                  } catch (err: any) {
                    console.error('Upgrade request failed:', err);
                    alert('등업 신청 중 오류가 발생했습니다: ' + (err?.message || 'Unknown error'));
                  } finally {
                    setRequestingUpgrade(false);
                  }
                }}
                disabled={requestingUpgrade}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestingUpgrade ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    등업 신청 중...
                  </>
                ) : (
                  <>
                    <Crown className="w-3 h-3" />
                    등업 신청하기
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Show pending status after upgrade request */}
        {isLoggedIn && isGeneral && upgradeRequested && (
          <div className="p-3 border-b border-stone-200 bg-amber-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-700">
                ⏳ 등업 신청이 접수되었습니다. 관리자 승인을 기다리고 있습니다.
              </p>
              <span className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-200 text-amber-800 rounded-lg">
                <Loader2 className="w-3 h-3 animate-spin" />
                승인 대기 중
              </span>
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
                  업데이트: {formatTime(notice.updated_at)}
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
                  <span className="text-xs text-stone-400">· {formatTime(note.created_at)}</span>
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Feed View */}
        {viewMode === 'feed' && (
          <div className="p-3 space-y-3">
            {/* Mobile View (sm, md) - Board Tabs + Content */}
            <div className="lg:hidden">
              {/* Mobile Board Tabs */}
              <div className="flex items-center gap-2 px-1 mb-3">
                <button
                  onClick={() => setMobileBoardTab('free')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    mobileBoardTab === 'free'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  자유 게시판
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${mobileBoardTab === 'free' ? 'bg-emerald-200 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                    {getFreeBoardPosts().length}
                  </span>
                </button>
                <button
                  onClick={() => setMobileBoardTab('prayer')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    mobileBoardTab === 'prayer'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <span className="text-sm">🙏</span>
                  기도 게시판
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${mobileBoardTab === 'prayer' ? 'bg-red-200 text-red-800' : 'bg-stone-200 text-stone-600'}`}>
                    {getPrayerPosts().length}
                  </span>
                </button>
              </div>
              
              {/* Mobile Free Board Content */}
              {mobileBoardTab === 'free' && (
                <div className="space-y-3">
                  {canWrite && (
                    <button
                      onClick={() => setShowFreeInput(!showFreeInput)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <span>✍️</span>
                      {showFreeInput ? '입력창 닫기' : '새 글 쓰기'}
                    </button>
                  )}
                  {canWrite && showFreeInput && (
                    <div className="p-3 border border-stone-200 rounded-lg bg-stone-50">
                      <input
                        type="text"
                        value={freeTitle}
                        onChange={(e) => setFreeTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <textarea
                        value={freeContent}
                        onChange={(e) => setFreeContent(e.target.value)}
                        placeholder="내용을 입력하세요..."
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg mb-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSavePost('free')}
                          disabled={saving || !freeTitle.trim() || !freeContent.trim()}
                          className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '등록'}
                        </button>
                      </div>
                    </div>
                  )}
                  {loadingPosts && posts.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                    </div>
                  ) : getFreeBoardPosts().length === 0 ? (
                    <div className="text-center py-8 text-stone-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">아직 게시글이 없습니다.</p>
                      <p className="text-xs mt-1">첫 번째 글을 작성해보세요!</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {getFreeBoardPosts().map(post => renderPost(post))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingPosts}
                          className="w-full py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          {loadingPosts ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '더 보기'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Mobile Prayer Board Content */}
              {mobileBoardTab === 'prayer' && (
                <div className="space-y-3">
                  {canWrite && (
                    <button
                      onClick={() => setShowPrayerInput(!showPrayerInput)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <span>🙏</span>
                      {showPrayerInput ? '입력창 닫기' : '기도 요청하기'}
                    </button>
                  )}
                  {canWrite && showPrayerInput && (
                    <div className="p-3 border border-stone-200 rounded-lg bg-stone-50 space-y-2">
                      <div className="flex gap-1">
                        {[
                          { type: 'personal', label: '개인', icon: '👤' },
                          { type: 'church', label: '교회', icon: '⛪' },
                          { type: 'nation', label: '나라', icon: '🏛️' },
                          { type: 'world', label: '세계', icon: '🌍' },
                        ].map((t) => (
                          <button
                            key={t.type}
                            onClick={() => setPrayerType(t.type as any)}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
                              prayerType === t.type
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <span>{t.icon}</span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={prayerTitle}
                        onChange={(e) => setPrayerTitle(e.target.value)}
                        placeholder="기도 제목을 입력하세요"
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <textarea
                        value={prayerContent}
                        onChange={(e) => setPrayerContent(e.target.value)}
                        placeholder="기도 내용을 입력하세요..."
                        className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg h-20 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSavePost('prayer')}
                          disabled={saving || !prayerTitle.trim()}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '기도 요청'}
                        </button>
                      </div>
                    </div>
                  )}
                  {loadingPosts && posts.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                    </div>
                  ) : getPrayerPosts().length === 0 ? (
                    <div className="text-center py-8 text-stone-400">
                      <span className="text-3xl block mb-2">🙏</span>
                      <p className="text-sm">아직 기도 제목이 없습니다.</p>
                      <p className="text-xs mt-1">함께 기도할 제목을 나눠주세요!</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Compact Prayer Cards */}
                      <div className="space-y-2">
                        {getPrayerPosts().map(post => {
                          const pType = getPrayerType(post);
                          const status = (post as any).prayer_status || 'wait';
                          
                          const colorMap = {
                            world: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
                            nation: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
                            church: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
                            personal: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
                          };
                          const colors = colorMap[pType];
                          
                          return (
                            <div 
                              key={post.id}
                              className={`p-2.5 rounded-lg border ${colors.bg} ${colors.border}`}
                            >
                              {/* Compact Header */}
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge}`}>
                                  {pType === 'world' ? '🌍 세계' : pType === 'nation' ? '🏛️ 나라' : pType === 'church' ? '⛪ 교회' : '👤 개인'}
                                </span>
                                {(post as any).is_urgent && (
                                  <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded font-medium">
                                    🚨 긴급
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user_id}`); }}
                                  className="ml-auto text-[11px] text-stone-500 hover:text-blue-600 hover:underline"
                                >
                                  {getDisplayName(post.profiles)}
                                </button>
                              </div>
                              
                              {/* Content */}
                              <div onClick={() => setSelectedPrayerPost(post)} className="cursor-pointer">
                                <p className="text-xs text-stone-700 line-clamp-2 leading-snug">{post.content}</p>
                              </div>
                              
                              {/* Admin Urgent Toggle */}
                              {isAdmin && (
                                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-stone-200/50">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleUrgent(post.id, (post as any).is_urgent); }}
                                    className={`text-[10px] px-2 py-0.5 rounded ${
                                      (post as any).is_urgent 
                                        ? 'text-red-600 bg-red-50' 
                                        : 'text-stone-500 hover:text-red-600'
                                    }`}
                                  >
                                    {(post as any).is_urgent ? '🚨 긴급 해제' : '🚨 긴급 설정'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {hasMore && (
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingPosts}
                          className="w-full py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          {loadingPosts ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '더 보기'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Desktop View (lg and above) - 2-Column Grid Layout */}
            <div className={`hidden lg:grid ${fullViewBoard ? 'lg:grid-cols-1' : 'lg:grid-cols-2 lg:gap-4'} lg:h-[calc(100vh-280px)]`}>
              
              {/* Full View Mode Back Button */}
              {fullViewBoard && (
                <div className="col-span-full px-4 py-3 bg-stone-100 border-b border-stone-200 flex items-center gap-2">
                  <button
                    onClick={() => setFullViewBoard(null)}
                    className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    전체 게시판 보기
                  </button>
                  <span className="text-sm text-stone-500">
                    {fullViewBoard === 'free' && '자유 게시판'}
                    {fullViewBoard === 'prayer' && '기도 게시판'}
                  </span>
                </div>
              )}
              

              {/* LEFT PANEL: Free Community Board */}
              {(!fullViewBoard || fullViewBoard === 'free') && (
              <div className="flex flex-col bg-white rounded-lg border border-stone-200 overflow-hidden">
                {/* Panel Header */}
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-serif font-semibold text-emerald-800">자유 게시판</h3>
                    <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{getFreeBoardPosts().length}</span>
                    {/* [Step 1] New Post Toggle Button */}
                    {canWrite && (
                      <button
                        onClick={() => setShowFreeInput(!showFreeInput)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        title={showFreeInput ? '입력창 닫기' : '새 글 쓰기'}
                      >
                        <span>✍️</span>
                        {showFreeInput ? '닫기' : '새 글 쓰기'}
                      </button>
                    )}
                    <button
                      onClick={() => setFullViewBoard(fullViewBoard === 'free' ? null : 'free')}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                        fullViewBoard === 'free'
                          ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                      title={fullViewBoard === 'free' ? '작게 보기 (원래대로)' : '크게 보기'}
                    >
                      <span>{fullViewBoard === 'free' ? '↙️' : '🔎'}</span>
                      {fullViewBoard === 'free' ? '작게 보기' : '크게 보기'}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/community#free');
                        alert('게시판 링크가 복사되었습니다');
                      }}
                      className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded transition-colors"
                      title="게시판 링크 복사"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">
                    일상 나눔, 교제, 질문 등 자유롭게 소통하세요
                  </p>
                </div>
                
                {/* Write UI for Free Board - [Step 1] Toggleable */}
                {canWrite && showFreeInput && (
                  <div className="p-3 border-b border-stone-200 bg-stone-50">
                    <input
                      type="text"
                      value={freeTitle}
                      onChange={(e) => setFreeTitle(e.target.value)}
                      placeholder="제목을 입력하세요 (선택사항)"
                      className="w-full mb-2 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <textarea
                      value={freeContent}
                      onChange={(e) => setFreeContent(e.target.value)}
                      placeholder="자유롭게 글을 작성해 보세요..."
                      className="w-full h-20 p-2 text-sm bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSavePost('free')}
                        disabled={!freeContent.trim() || saving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {saving ? '저장 중...' : '게시하기'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Free Board Posts List or Detail View */}
                {selectedFreePost ? (
                  /* Detail View Mode */
                  <div className="flex-1 overflow-y-auto">
                    {/* Back Button */}
                    <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedFreePost(null);
                          setExpandedPostId(null);
                        }}
                        className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        목록으로 돌아가기
                      </button>
                    </div>
                    
                    {/* Full Post View */}
                    <div className="p-6">
                      {(() => {
                        const post = selectedFreePost;
                        const isPinned = false;
                        const isExpanded = true;
                        const canDelete = currentUserId === post.user_id || isAdmin;
                        const bgColorClass = getPostBgColor(
                          (post as any).postType,
                          post.profiles?.tier,
                          (post as any).is_urgent,
                          (post as any).is_world_prayer,
                          (post as any).is_admin_approved,
                          (post as any).category
                        );
                        const isHighlighted = highlightedPostId === post.id;
                        return (
                          <div 
                            id={`post-${post.id}`}
                            className={`rounded-lg border ${bgColorClass} overflow-hidden transition-all duration-500 ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50 shadow-lg' : ''}`}
                          >
                            {/* Post Header - Full view */}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {isPinned && <Pin className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                                    <span className="font-bold text-sm text-stone-800 truncate">
                                      {post.profiles?.tier === '관리자' && <Crown className="w-3 h-3 inline text-amber-600 mr-1" />}
                                      {getDisplayName(post.profiles)}
                                    </span>
                                    <span className="text-xs text-stone-400">{formatTime(post.created_at)}</span>
                                    {post.verse_ref && (
                                      <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                        {post.verse_ref}
                                      </span>
                                    )}
                                  </div>
                                  {post.title && (
                                    <h4 className="font-bold text-stone-800 mb-1">{post.title}</h4>
                                  )}
                                  <p className="text-base text-stone-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded Content */}
                            <div className="px-4 pb-4 border-t border-stone-100">
                              {/* Like Button */}
                              <button
                                onClick={() => handleToggleLike(post.id, !!(post as any).userHasLiked)}
                                className={`flex items-center gap-1 px-3 py-2 text-sm rounded transition-colors mt-3 mb-2 ${
                                  (post as any).userHasLiked 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                    : 'text-stone-600 hover:bg-stone-100'
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${(post as any).userHasLiked ? 'fill-current' : ''}`} />
                                공감 {(post as any).likesCount || 0}
                              </button>
                              
                              {/* Replies Section */}
                              <div className="mt-3">
                                {(() => {
                                  const postReplies = replies[post.id] || [];
                                  const isLoading = loadingReplies[post.id];
                                  const replyText = newReply[post.id] || '';
                                  const isSaving = savingReply[post.id];
                                  
                                  return (
                                    <div className="space-y-2">
                                      {/* Reply Input */}
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={replyText}
                                          onChange={(e) => setNewReply({ ...newReply, [post.id]: e.target.value })}
                                          placeholder="댓글을 입력하세요..."
                                          className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && replyText.trim()) {
                                              handleSaveReply(post.id);
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => handleSaveReply(post.id)}
                                          disabled={!replyText.trim() || isSaving}
                                          className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                      </div>
                                      
                                      {/* Replies List */}
                                      {isLoading ? (
                                        <div className="flex items-center justify-center py-2">
                                          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                                        </div>
                                      ) : postReplies.length === 0 ? (
                                        <p className="text-xs text-stone-400 text-center py-2">첫 댓글을 남겨보세요</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {postReplies.map((reply) => (
                                            <div key={reply.id} className="flex gap-2 p-2 bg-white rounded-lg border border-stone-100">
                                              <CornerDownRight className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                  <span className="text-xs font-medium text-stone-700">
                                                    {getDisplayName(reply.profiles)}
                                                  </span>
                                                  <span className="text-xs text-stone-400">
                                                    {formatTime(reply.created_at)}
                                                  </span>
                                                </div>
                                                <p className="text-sm text-stone-700">{reply.content}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-stone-200">
                                <button
                                  onClick={() => handleShare(post.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded"
                                >
                                  <Link2 className="w-3 h-3" />
                                  공유
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(post.id, post.user_id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded ml-auto"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* List View - [Step 1] Improved readability with larger spacing and fonts */
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingPosts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                      </div>
                    ) : getFreeBoardPosts().length === 0 ? (
                      <div className="text-center py-8 text-stone-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">자유 게시글이 없습니다.</p>
                        {canWrite && <p className="text-sm mt-1">첫 번째 글을 작성해보세요!</p>}
                      </div>
                    ) : (
                      getFreeBoardPosts().slice(0, 20).map(post => (
                        <div key={post.id} onClick={() => setSelectedFreePost(post)} className="cursor-pointer">
                          {renderPost(post)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              )}

              {/* RIGHT PANEL: Prayer Board */}
              {(!fullViewBoard || fullViewBoard === 'prayer') && (
              <div className="flex flex-col bg-white rounded-lg border border-stone-200 overflow-hidden">
                {/* Panel Header */}
                <div className="px-4 py-3 bg-red-50 border-b border-red-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🙏</span>
                    <h3 className="text-sm font-serif font-semibold text-red-800">기도 게시판</h3>
                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{getPrayerPosts().length}</span>
                    {/* [Step 1] New Prayer Toggle Button */}
                    {canWrite && (
                      <button
                        onClick={() => setShowPrayerInput(!showPrayerInput)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title={showPrayerInput ? '입력창 닫기' : '기도 요청하기'}
                      >
                        <span>🙏</span>
                        {showPrayerInput ? '닫기' : '기도 요청하기'}
                      </button>
                    )}
                    <button
                      onClick={() => setFullViewBoard(fullViewBoard === 'prayer' ? null : 'prayer')}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                        fullViewBoard === 'prayer'
                          ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                      title={fullViewBoard === 'prayer' ? '작게 보기 (원래대로)' : '크게 보기'}
                    >
                      <span>{fullViewBoard === 'prayer' ? '↙️' : '🔎'}</span>
                      {fullViewBoard === 'prayer' ? '작게 보기' : '크게 보기'}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/community#prayer');
                        alert('게시판 링크가 복사되었습니다');
                      }}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                      title="게시판 링크 복사"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    세계 · 나라 · 교회 · 개인의 기도 제목을 나누세요
                  </p>
                </div>
                
                {/* Prayer Type Selection & Write UI - ENHANCED - [Step 1] Toggleable */}
                {canWrite && showPrayerInput && (
                  <div className="p-3 border-b border-stone-200 bg-stone-50">
                    {/* Prayer Type Selector */}
                    <div className="flex gap-1 mb-2">
                      {[
                        { type: 'all', label: '전체', icon: BookOpen, color: 'stone' },
                        { type: 'world', label: '세계', icon: Globe, color: 'blue' },
                        { type: 'nation', label: '나라', icon: MapPin, color: 'purple' },
                        { type: 'church', label: '교회', icon: Church, color: 'emerald' },
                        { type: 'personal', label: '개인', icon: User, color: 'amber' },
                      ].map(({ type, label, icon: Icon, color }) => (
                        <button
                          key={type}
                          onClick={() => setPrayerType(type as any)}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
                            prayerType === type
                              ? color === 'stone' 
                                ? 'bg-stone-200 text-stone-800 border border-stone-400'
                                : `bg-${color}-100 text-${color}-700 border border-${color}-300`
                              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Linked Prayer Selector */}
                    <div className="mb-2">
                      <button
                        onClick={() => {
                          if (userPrayerHistory.length === 0) loadUserPrayerHistory();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg hover:bg-stone-50"
                      >
                        <span className="text-stone-600">
                          {linkedPrayerId 
                            ? `🔗 연결: ${userPrayerHistory.find(p => p.id === linkedPrayerId)?.content?.substring(0, 30) || '이전 기도'}...`
                            : '🔄 이전 기도와 연결하기 (선택)'
                          }
                        </span>
                        <ChevronDown className="w-3 h-3 text-stone-400" />
                      </button>
                      
                      {userPrayerHistory.length > 0 && (
                        <div className="mt-1 max-h-32 overflow-y-auto bg-white border border-stone-200 rounded-lg">
                          <button
                            onClick={() => setLinkedPrayerId(null)}
                            className={`w-full px-3 py-2 text-xs text-left hover:bg-stone-50 ${!linkedPrayerId ? 'bg-amber-50 text-amber-700' : 'text-stone-600'}`}
                          >
                            ✗ 연결 없음 (새로운 기도)
                          </button>
                          {userPrayerHistory.map(prayer => (
                            <button
                              key={prayer.id}
                              onClick={() => setLinkedPrayerId(prayer.id)}
                              className={`w-full px-3 py-2 text-xs text-left hover:bg-stone-50 border-t border-stone-100 ${
                                linkedPrayerId === prayer.id ? 'bg-amber-50 text-amber-700' : 'text-stone-600'
                              }`}
                            >
                              <span className="text-stone-400">{formatTime(prayer.created_at)}</span>
                              {' · '}
                              <span className="line-clamp-1">{prayer.content?.substring(0, 40)}...</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {loadingPrayerHistory && (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Prayer Count Indicator */}
                    <div className="flex items-center justify-between mb-2 px-2 py-1 bg-red-50 rounded-lg">
                      <span className="text-xs text-red-700">
                        오늘 {todayPrayerCount}개 작성 · {DAILY_PRAYER_LIMIT - todayPrayerCount}개 더 올릴 수 있습니다
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: DAILY_PRAYER_LIMIT }).map((_, i) => (
                          <div 
                            key={i}
                            className={`w-2 h-2 rounded-full ${i < todayPrayerCount ? 'bg-red-500' : 'bg-red-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      value={prayerTitle}
                      onChange={(e) => setPrayerTitle(e.target.value)}
                      placeholder="기도 제목을 입력하세요 (선택사항)"
                      className="w-full mb-2 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    <textarea
                      value={prayerContent}
                      onChange={(e) => setPrayerContent(e.target.value)}
                      placeholder={`${prayerType === 'world' ? '세계를 위한 기도' : prayerType === 'nation' ? '나라를 위한 기도' : prayerType === 'church' ? '교회를 위한 기도' : '개인 기도'} 내용을 작성해 주세요...`}
                      className="w-full h-20 p-2 text-sm bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSavePost('prayer')}
                        disabled={!prayerContent.trim() || saving || todayPrayerCount >= DAILY_PRAYER_LIMIT}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <span className="text-lg">🙏</span>
                        {saving ? '저장 중...' : linkedPrayerId ? '기도 연결하기' : todayPrayerCount >= DAILY_PRAYER_LIMIT ? '오늘 한도 도달' : '기도하기'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Prayer Posts List with Status UI & Journey - or Detail View */}
                {selectedPrayerPost ? (
                  /* Detail View Mode */
                  <div className="flex-1 overflow-y-auto">
                    {/* Back Button */}
                    <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPrayerPost(null);
                          setExpandedPostId(null);
                        }}
                        className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        전체 기도 목록으로
                      </button>
                    </div>
                    
                    {/* Full Prayer Post View */}
                    <div className="p-6">
                      {(() => {
                        const post = selectedPrayerPost;
                        const pType = getPrayerType(post);
                        const status = (post as any).prayer_status || 'wait';
                        const linkedId = (post as any).linked_prayer_id;
                        const testimony = (post as any).testimony_note;
                        const isAuthor = currentUserId === post.user_id;
                        
                        const statusMap = {
                          wait: { label: '⏳ 기다림', color: 'bg-stone-100 text-stone-600', border: 'border-stone-200', icon: Clock },
                          yes: { label: '✨ 응답의 은혜', color: 'bg-amber-100 text-amber-700', border: 'border-amber-400', icon: Sparkles },
                          no: { label: '🙏 거절의 은혜', color: 'bg-slate-100 text-slate-600', border: 'border-slate-300', icon: Heart },
                        };
                        const statusStyle = statusMap[status as keyof typeof statusMap];
                        
                        const colorMap = {
                          world: { bg: status === 'yes' ? 'bg-amber-50/50' : 'bg-blue-50', border: status === 'yes' ? 'border-amber-300' : 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Globe },
                          nation: { bg: status === 'yes' ? 'bg-amber-50/50' : 'bg-purple-50', border: status === 'yes' ? 'border-amber-300' : 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: MapPin },
                          church: { bg: status === 'yes' ? 'bg-amber-50/50' : 'bg-emerald-50', border: status === 'yes' ? 'border-amber-300' : 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: Church },
                          personal: { bg: status === 'yes' ? 'bg-amber-50/50' : 'bg-amber-50', border: status === 'yes' ? 'border-amber-300' : 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: User },
                        };
                        const colors = colorMap[pType];
                        const Icon = colors.icon;
                        const StatusIcon = statusStyle.icon;
                        
                        return (
                          <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-sm px-2 py-1 rounded flex items-center gap-1 ${colors.badge}`}>
                                <Icon className="w-4 h-4" />
                                {pType === 'world' ? '세계' : pType === 'nation' ? '나라' : pType === 'church' ? '교회' : '개인'}
                              </span>
                              <span className={`text-sm px-2 py-1 rounded flex items-center gap-1 ${statusStyle.color}`}>
                                <StatusIcon className="w-4 h-4" />
                                {statusStyle.label}
                              </span>
                            </div>
                            
                            {/* Author */}
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-200">
                              <span className="font-medium text-stone-700">{getDisplayName(post.profiles)}</span>
                              <span className="text-xs text-stone-400">{formatTime(post.created_at)}</span>
                            </div>
                            
                            {/* Content - Full text */}
                            <div className="mb-4">
                              <p className="text-base text-stone-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                            </div>
                            
                            {/* Testimony */}
                            {status === 'yes' && testimony && (
                              <div className="mt-4 p-3 bg-amber-100/50 border border-amber-200 rounded">
                                <p className="text-sm text-amber-800 font-medium mb-2">💌 간증 노트</p>
                                <p className="text-sm text-amber-700">{testimony}</p>
                              </div>
                            )}
                            
                            {/* Linked Prayer Journey */}
                            {linkedId && (
                              <div className="mt-4">
                                <button
                                  onClick={() => toggleLinkedPrayer(post.id, linkedId)}
                                  className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                >
                                  <Link2 className="w-4 h-4" />
                                  {showLinkedPrayer[post.id] ? '기도의 여정 숨기기' : '🔄 기도의 여정 보기'}
                                </button>
                                
                                {showLinkedPrayer[post.id] && linkedPrayerDetails[linkedId] && (
                                  <div className="mt-2 p-3 bg-blue-50/50 border-l-2 border-blue-300">
                                    <p className="text-sm text-blue-700 font-medium mb-1">📖 이전 기도</p>
                                    <p className="text-sm text-stone-600">
                                      {new Date(linkedPrayerDetails[linkedId].created_at).toLocaleDateString('ko-KR')} · {' '}
                                      {linkedPrayerDetails[linkedId].content}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Author Actions */}
                            <div className="mt-4 pt-3 border-t border-stone-200 flex gap-2">
                              {/* Like Button */}
                              <button
                                onClick={() => handleToggleLike(post.id, !!(post as any).userHasLiked)}
                                className={`flex items-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
                                  (post as any).userHasLiked 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                    : 'text-stone-600 hover:bg-stone-100'
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${(post as any).userHasLiked ? 'fill-current' : ''}`} />
                                공감 {(post as any).likesCount || 0}
                              </button>
                              
                              <button
                                onClick={() => handleShare(post.id)}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded"
                              >
                                <Link2 className="w-4 h-4" />
                                링크 복사
                              </button>
                              
                              {isAuthor && (
                                <button
                                  onClick={() => openPrayerStatusModal(post.id, status)}
                                  className="flex-1 text-sm px-3 py-2 bg-white border border-stone-200 rounded hover:bg-stone-50 text-stone-600"
                                >
                                  기도 응답 상태 변경
                                </button>
                              )}
                            </div>
                            
                            {/* Replies Section - Prayer Comments */}
                            <div className="mt-6 pt-4 border-t border-stone-200">
                              <h4 className="font-bold text-stone-700 mb-4 flex items-center gap-2 text-lg">
                                <span className="text-xl">🙏</span>
                                기도합니다 ({(replies[post.id] || []).length})
                              </h4>
                              
                              {/* Reply Input */}
                              {currentUserId && (
                                <div className="flex gap-2 mb-4">
                                  <input
                                    type="text"
                                    value={newReply[post.id] || ''}
                                    onChange={(e) => setNewReply({ ...newReply, [post.id]: e.target.value })}
                                    placeholder="댓글을 남겨주세요..."
                                    className="flex-1 px-4 py-3 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && (newReply[post.id] || '').trim()) {
                                        handleSaveReply(post.id);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveReply(post.id)}
                                    disabled={!(newReply[post.id] || '').trim() || savingReply[post.id]}
                                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {savingReply[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : '기도하기'}
                                  </button>
                                </div>
                              )}
                              
                              {/* Replies List */}
                              {loadingReplies[post.id] ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                                </div>
                              ) : (replies[post.id] || []).length === 0 ? (
                                <p className="text-sm text-stone-400 text-center py-6 bg-stone-50 rounded-lg">첫 댓글을 남겨주세요</p>
                              ) : (
                                <div className="space-y-4">
                                  {(replies[post.id] || []).map((reply) => (
                                    <div key={reply.id} className="p-4 bg-red-50/50 rounded-lg border border-red-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-stone-700">{getDisplayName(reply.profiles)}</span>
                                        <span className="text-xs text-stone-400">
                                          {formatTime(reply.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-stone-800 whitespace-pre-wrap">{reply.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* List View - Compact UI for more posts per screen */
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loadingPosts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                      </div>
                    ) : getPrayerPosts().length === 0 ? (
                      <div className="text-center py-8 text-stone-400">
                        <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">기도 제목이 없습니다.</p>
                        {canWrite && <p className="text-sm mt-1">첫 기도 제목을 올려보세요!</p>}
                      </div>
                    ) : (
                      getPrayerPosts().slice(0, 30).map(post => {
                        const pType = getPrayerType(post);
                        const status = (post as any).prayer_status || 'wait';
                        const linkedId = (post as any).linked_prayer_id;
                        const testimony = (post as any).testimony_note;
                        
                        const statusMap = {
                          wait: { label: '기다림', color: 'bg-stone-100 text-stone-600', border: 'border-stone-200', icon: Clock },
                          yes: { label: '응답', color: 'bg-amber-100 text-amber-700', border: 'border-amber-400', icon: Sparkles },
                          no: { label: '거절', color: 'bg-slate-100 text-slate-600', border: 'border-slate-300', icon: Heart },
                        };
                        const statusStyle = statusMap[status as keyof typeof statusMap];
                        
                        const colorMap = {
                          world: { bg: status === 'yes' ? 'bg-amber-50/30' : 'bg-blue-50/50', border: status === 'yes' ? 'border-amber-200' : 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Globe },
                          nation: { bg: status === 'yes' ? 'bg-amber-50/30' : 'bg-purple-50/50', border: status === 'yes' ? 'border-amber-200' : 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: MapPin },
                          church: { bg: status === 'yes' ? 'bg-amber-50/30' : 'bg-emerald-50/50', border: status === 'yes' ? 'border-amber-200' : 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: Church },
                          personal: { bg: status === 'yes' ? 'bg-amber-50/30' : 'bg-amber-50/50', border: status === 'yes' ? 'border-amber-200' : 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: User },
                        };
                        const colors = colorMap[pType];
                        const Icon = colors.icon;
                        const StatusIcon = statusStyle.icon;
                        const isAuthor = currentUserId === post.user_id;
                        
                        return (
                          <div 
                            key={post.id}
                            className={`p-2.5 rounded-lg border ${colors.bg} ${colors.border} transition-shadow hover:shadow-sm`}
                          >
                            {/* Compact Header Row */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${colors.badge}`}>
                                <Icon className="w-3 h-3" />
                                {pType === 'world' ? '세계' : pType === 'nation' ? '나라' : pType === 'church' ? '교회' : '개인'}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${statusStyle.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusStyle.label}
                              </span>
                              {(post as any).is_urgent && (
                                <span className="text-[10px] text-red-600 font-medium bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  긴급
                                </span>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user_id}`); }}
                                className="ml-auto text-[11px] text-stone-500 hover:text-blue-600 hover:underline cursor-pointer"
                              >
                                {getDisplayName(post.profiles)}
                              </button>
                            </div>
                            
                            {/* Compact Content */}
                            <div 
                              onClick={() => setSelectedPrayerPost(post)}
                              className="cursor-pointer"
                            >
                              <p className={`text-xs text-stone-700 leading-snug ${expandedPostId === post.id ? '' : 'line-clamp-2'}`}>{post.content}</p>
                            </div>
                            
                            {/* Admin Actions - Compact */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-stone-200/50">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleUrgent(post.id, (post as any).is_urgent); }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                                    (post as any).is_urgent 
                                      ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                                      : 'text-stone-500 hover:text-red-600 hover:bg-stone-100'
                                  }`}
                                >
                                  {(post as any).is_urgent ? '🚨 긴급 해제' : '🚨 긴급 설정'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}

      </div>
      
      {/* Prayer Status Modal */}
      {prayerStatusModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
              <h3 className="font-bold text-stone-800">기도 응답 상태 변경</h3>
              <p className="text-xs text-stone-500 mt-1">
                하나님께서 어떻게 응답하셨나요?
              </p>
            </div>
            
            {/* Modal Content */}
            <div className="p-4">
              {/* Status Buttons */}
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => handlePrayerStatusUpdate('wait')}
                  disabled={updatingPrayerStatus}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    prayerStatusModal.currentStatus === 'wait' 
                      ? 'bg-stone-100 border-stone-400' 
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Clock className="w-5 h-5 text-stone-500" />
                  <div className="text-left">
                    <p className="font-medium text-stone-700">⏳ 기다림의 훈련</p>
                    <p className="text-xs text-stone-500">아직 응답을 기다리고 있습니다</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePrayerStatusUpdate('yes')}
                  disabled={updatingPrayerStatus}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    prayerStatusModal.currentStatus === 'yes' 
                      ? 'bg-amber-100 border-amber-400' 
                      : 'bg-white border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div className="text-left">
                    <p className="font-medium text-amber-700">✨ 응답의 은혜</p>
                    <p className="text-xs text-amber-600">하나님께서 응답하셨습니다</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handlePrayerStatusUpdate('no')}
                  disabled={updatingPrayerStatus}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                    prayerStatusModal.currentStatus === 'no' 
                      ? 'bg-slate-100 border-slate-400' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Heart className="w-5 h-5 text-slate-500" />
                  <div className="text-left">
                    <p className="font-medium text-slate-700">🙏 거절의 은혜</p>
                    <p className="text-xs text-slate-500">"내 은혜가 네게 족하도다"</p>
                  </div>
                </button>
              </div>
              
              {/* Testimony Note Input (for Yes status) */}
              {prayerStatusModal.currentStatus === 'yes' && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-amber-700 mb-1 block">
                    💌 간증 노트 (선택사항)
                  </label>
                  <textarea
                    value={testimonyNote}
                    onChange={(e) => setTestimonyNote(e.target.value)}
                    placeholder="하나님께서 어떻게 응답하셨는지 간증해 주세요..."
                    className="w-full h-24 p-2 text-sm bg-amber-50 border border-amber-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex gap-2">
              <button
                onClick={() => setPrayerStatusModal({ open: false, postId: null, currentStatus: 'wait' })}
                className="flex-1 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
              >
                닫기
              </button>
              {prayerStatusModal.currentStatus === 'yes' && (
                <button
                  onClick={() => handlePrayerStatusUpdate('yes')}
                  disabled={updatingPrayerStatus}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  {updatingPrayerStatus ? '저장 중...' : '간증 저장'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
