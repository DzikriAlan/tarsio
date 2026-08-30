import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, type Quest, type QuestQuestion, type QuestCategory } from '@/lib/supabase';
import { Markdown } from '../lib/markdown';
import { translate } from '@/lib/i18n';
import { achievements, getLevel } from '@/lib/gamify';
import type { Language, Mood } from '@/lib/types';
import { TarsyMascot, type TarsyMood } from '@/components/TarsyMascot';
import { ProfileView } from '@/components/ProfileView';
import {
  ArrowUpRight, BarChart3, Bot, Check, ChevronRight, CircleHelp, Flame,
  HeartHandshake, Lock, Menu, MessageCircle, MoreHorizontal, PenLine,
  Send, Sparkles, Target, Trophy, WalletCards, X, Zap, Star, Compass,
  Baby, Heart, Award, Copy, UserPlus, TrendingUp, User, Calendar, RefreshCw,
} from 'lucide-react';

const categoryIcons: Record<string, typeof Target> = {
  career: Target,
  self_discovery: Sparkles,
  financial: WalletCards,
  relationship: HeartHandshake,
};

const achievementIcons: Record<string, typeof Target> = {
  baby: Baby, flame: Flame, zap: Zap, sparkles: Sparkles,
  star: Star, compass: Compass, heart: Heart,
};

const moodConfig: { key: Mood; emoji: string; color: string }[] = [
  { key: 'on_fire', emoji: '🔥', color: 'mood-green' },
  { key: 'need_chill', emoji: '🌊', color: 'mood-blue' },
  { key: 'overthinking', emoji: '🌀', color: 'mood-purple' },
  { key: 'burnout', emoji: '😮‍💨', color: 'mood-yellow' },
  { key: 'inspired', emoji: '✨', color: 'mood-pink' },
];

const LANDING_QUEST_LIMIT = 3;

type ChatMsg = { from: 'tarsy' | 'you'; text: string; error?: boolean };

export function Dashboard() {
  const { profile, language, setLanguage, signOut, refreshProfile } = useAuth();
  const t = (k: string, p?: Record<string, string | number>) => translate(language, k, p);
  const lang = language;

  const [activeNav, setActiveNav] = useState('today');
  const [chatOpen, setChatOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [questOpen, setQuestOpen] = useState(false);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [questionStep, setQuestionStep] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [allAnswers, setAllAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [questions, setQuestions] = useState<QuestQuestion[]>([]);
  const [questResult, setQuestResult] = useState<{ title: string; body: string; takeaway: string } | null>(null);
  const [questLoading, setQuestLoading] = useState(false);
  const [categories, setCategories] = useState<QuestCategory[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(new Set());
  const [todayMood, setTodayMood] = useState<Mood | null>(null);
  const [moodDayCount, setMoodDayCount] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [message, setMessage] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tarsyMood, setTarsyMood] = useState<TarsyMood>('idle');
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiText, setConfettiText] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpNum, setLevelUpNum] = useState(0);
  const [chatTyping, setChatTyping] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [friendError, setFriendError] = useState('');
  const [friendsList, setFriendsList] = useState<{ name: string; streak: number }[]>([]);
  const [moodHistory, setMoodHistory] = useState<{ mood: Mood; date: string }[]>([]);
  const [achvPopup, setAchvPopup] = useState<string | null>(null);
  const [prevAchvIds, setPrevAchvIds] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isPremium = profile?.subscription_tier === 'premium';
  const displayName = profile?.display_name || 'Friend';
  const firstName = displayName.split(' ')[0];
  const streak = profile?.streak_count || 0;
  const xpTotal = profile?.xp_total || 0;
  const levelInfo = getLevel(xpTotal);

  const loadQuests = useCallback(async () => {
    const [{ data: cats }, { data: qs }] = await Promise.all([
      supabase.from('quest_categories').select('*').eq('is_archived', false).order('sort_order'),
      supabase.from('quests').select('*').eq('is_published', true).eq('is_archived', false).order('sort_order'),
    ]);
    if (cats) setCategories(cats as QuestCategory[]);
    if (qs) setQuests(qs as Quest[]);
  }, []);

  const loadCompletions = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('quest_completions').select('quest_id').eq('user_id', profile.id);
    if (data) setCompletedQuestIds(new Set(data.map((r: { quest_id: string }) => r.quest_id)));
  }, [profile?.id]);

  const loadMood = useCallback(async () => {
    if (!profile?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('mood_logs')
      .select('mood')
      .eq('user_id', profile.id)
      .eq('logged_date', today)
      .maybeSingle();
    if (data) setTodayMood((data as { mood: Mood }).mood);

    const { count } = await supabase
      .from('mood_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id);
    if (count !== null) setMoodDayCount(count);

    const { data: history } = await supabase
      .from('mood_logs')
      .select('mood, logged_date')
      .eq('user_id', profile.id)
      .order('logged_date', { ascending: false })
      .limit(7);
    if (history) setMoodHistory(history.map((r: { mood: Mood; logged_date: string }) => ({ mood: r.mood, date: r.logged_date })));
  }, [profile?.id]);

  const loadChat = useCallback(async () => {
    if (!profile?.id) return;
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessions) {
      setChatSessionId((sessions as { id: string }).id);
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', (sessions as { id: string }).id)
        .order('created_at', { ascending: true });
      if (msgs && msgs.length > 0) {
        setMessages(msgs.map((m: { role: 'user' | 'tarsy'; content: string }) => ({
          from: m.role === 'user' ? 'you' : 'tarsy', text: m.content,
        })));
      } else {
        setMessages([{ from: 'tarsy', text: t('chat.welcome') }]);
      }
    } else {
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({ user_id: profile.id })
        .select('*')
        .single();
      if (newSession) {
        setChatSessionId((newSession as { id: string }).id);
        setMessages([{ from: 'tarsy', text: t('chat.welcome') }]);
      }
    }
  }, [profile?.id, lang]);

  useEffect(() => { loadQuests(); }, [loadQuests]);
  useEffect(() => { if (profile) { loadCompletions(); loadMood(); } }, [profile, loadCompletions, loadMood]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatTyping]);

  function triggerConfetti(text: string) {
    setConfettiText(text);
    setShowConfetti(true);
    setTarsyMood('celebrate');
    setTimeout(() => setShowConfetti(false), 3000);
    setTimeout(() => setTarsyMood('idle'), 4000);
  }

  async function chooseMood(m: Mood) {
    setTodayMood(m);
    setTarsyMood('happy');
    setTimeout(() => setTarsyMood('idle'), 2000);
    if (!profile?.id) return;
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('mood_logs')
      .upsert({ user_id: profile.id, mood: m, logged_date: today }, { onConflict: 'user_id,logged_date' });

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', profile.id).maybeSingle();
    if (prof) {
      const lastCheckin = (prof as { last_checkin_at: string | null }).last_checkin_at;
      const now = new Date();
      let newStreak = streak;
      if (!lastCheckin) {
        newStreak = 1;
      } else {
        const last = new Date(lastCheckin);
        const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        if (diffHours >= 24 && diffHours < 48) newStreak = streak + 1;
        else if (diffHours >= 48) newStreak = 1;
      }
      await supabase.from('profiles').update({
        streak_count: newStreak,
        longest_streak: Math.max(profile.longest_streak, newStreak),
        last_checkin_at: now.toISOString(),
      }).eq('id', profile.id);
      refreshProfile();
      if (newStreak > streak) {
        triggerConfetti(t('streak.keepGoing') + ' ' + newStreak + ' ' + t('streak.days') + '!');
      }
    }
    loadMood();
  }

  async function openQuest(quest: Quest) {
    if (quest.tier_required === 'premium' && !isPremium) {
      setPaywallOpen(true);
      return;
    }
    setActiveQuest(quest);
    const { data } = await supabase
      .from('quest_questions')
      .select('*')
      .eq('quest_id', quest.id)
      .order('sort_order');
    if (data) setQuestions(data as QuestQuestion[]);
    setQuestionStep(0);
    setCurrentAnswer('');
    setAllAnswers([]);
    setQuestResult(null);
    setQuestOpen(true);
  }

  async function completeQuest() {
    if (!activeQuest || !profile?.id) return;
    const oldLevel = levelInfo.level;
    const resultJson = questResult ? JSON.stringify(questResult) : 'default';
    await supabase.from('quest_completions').insert({
      user_id: profile.id,
      quest_id: activeQuest.id,
      xp_awarded: activeQuest.xp_reward,
      tarsy_pov_result_id: resultJson,
    });
    const newXp = xpTotal + activeQuest.xp_reward;
    await supabase.from('profiles').update({
      xp_total: newXp,
    }).eq('id', profile.id);
    setCompletedQuestIds((prev) => new Set([...prev, activeQuest.id]));
    refreshProfile();
    setQuestOpen(false);
    setQuestionStep(0);
    setCurrentAnswer('');
    setAllAnswers([]);
    setQuestResult(null);

    const newLevel = getLevel(newXp).level;
    if (newLevel > oldLevel) {
      setLevelUpNum(newLevel);
      setShowLevelUp(true);
      setTarsyMood('celebrate');
      setTimeout(() => setShowLevelUp(false), 3500);
      setTimeout(() => setTarsyMood('idle'), 4500);
    } else {
      triggerConfetti(t('gamify.confetti', { xp: activeQuest.xp_reward }));
    }
  }

  function nextStep() {
    const q = questions[questionStep];
    const questionText = lang === 'id' ? q.question_id : q.question_en;
    const newAnswers = [...allAnswers, { question: questionText, answer: currentAnswer }];
    setAllAnswers(newAnswers);

    if (questionStep < questions.length - 1) {
      setQuestionStep(questionStep + 1);
      setCurrentAnswer('');
      setTarsyMood('think');
      setTimeout(() => setTarsyMood('idle'), 1500);
    } else {
      setQuestionStep(questions.length);
      generateResult(newAnswers);
    }
  }

  async function generateResult(finalAnswers: { question: string; answer: string }[]) {
    if (!activeQuest) return;
    setQuestLoading(true);
    setTarsyMood('think');
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL}/functions/v1/quest-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY
            ? { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY }
            : {}),
        },
        body: JSON.stringify({ quest_id: activeQuest.id, answers: finalAnswers, lang }),
      });
      const data = await res.json();
      if (data.result) {
        setQuestResult(data.result);
      }
    } catch {
      // Fallback to default message
      setQuestResult({
        title: t('pov.message'),
        body: t('pov.sub'),
        takeaway: t('pov.sub'),
      });
    }
    setQuestLoading(false);
    setTarsyMood('happy');
    setTimeout(() => setTarsyMood('idle'), 2000);
  }

  async function requestReply(userText: string) {
    setChatTyping(true);
    setTarsyMood('think');

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let res: Response;
      try {
        res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tarsy-chat`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(import.meta.env.VITE_SUPABASE_ANON_KEY ? { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } : {}),
          },
          body: JSON.stringify({
            message: userText,
            history: messages
              .filter((m) => !m.error)
              .map((m) => ({ role: m.from === 'you' ? 'user' : 'tarsy', content: m.text })),
            lang,
          }),
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error || 'no reply');

      const reply: string = data.reply;
      setChatTyping(false);
      setTarsyMood('happy');
      // Drop any earlier error bubble now that Tarsy actually answered.
      setMessages((cur) => [...cur.filter((m) => !m.error), { from: 'tarsy', text: reply }]);

      if (chatSessionId && profile?.id) {
        await supabase.from('chat_messages').insert({
          session_id: chatSessionId,
          user_id: profile.id,
          role: 'tarsy',
          content: reply,
        });
        await supabase.from('chat_sessions').update({ last_message_at: new Date().toISOString() }).eq('id', chatSessionId);
      }
      setTimeout(() => setTarsyMood('idle'), 2000);
    } catch (err) {
      console.error('tarsy-chat request failed:', err);
      setChatTyping(false);
      setTarsyMood('idle');
      // Say so honestly instead of passing a canned line off as Tarsy's answer.
      setMessages((cur) => [...cur.filter((m) => !m.error), { from: 'tarsy', text: t('chat.error'), error: true }]);
      setLastUserMessage(userText);
    }
  }

  async function submitMessage() {
    const trimmed = message.trim();
    if (!trimmed || !chatSessionId || !profile?.id || chatTyping) return;
    setMessages((cur) => [...cur.filter((m) => !m.error), { from: 'you', text: trimmed }]);
    setMessage('');
    setLastUserMessage(trimmed);

    await supabase.from('chat_messages').insert({
      session_id: chatSessionId,
      user_id: profile.id,
      role: 'user',
      content: trimmed,
    });

    await requestReply(trimmed);
  }

  async function upgradeToPremium() {
    if (!profile?.id) return;
    await supabase.from('profiles').update({ subscription_tier: 'premium' }).eq('id', profile.id);
    setPaywallOpen(false);
    refreshProfile();
    triggerConfetti(t('paywall.success'));
  }

  function copyReferral() {
    const code = (profile?.id || 'TARSIO').substring(0, 8).toUpperCase();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addFriend() {
    if (!friendCode.trim()) return;
    // Demo: add a friend
    const demoFriends = [
      { name: lang === 'id' ? t('friends.demo1') : t('friends.demo1'), streak: 12 },
      { name: lang === 'id' ? t('friends.demo2') : t('friends.demo2'), streak: 5 },
    ];
    const found = demoFriends.find((f) => f.name.toLowerCase().includes(friendCode.toLowerCase()));
    if (found) {
      setFriendsList((prev) => [...prev, found]);
      setFriendError('');
      setFriendCode('');
    } else {
      setFriendError(t('friends.notFound'));
    }
  }

  const completion = Math.min(100, Math.round(
    20 + (todayMood ? 15 : 0) + (completedQuestIds.size * 20)
  ));

  const questList = quests.map((q) => {
    const cat = categories.find((c) => c.id === q.category_id);
    return { ...q, category: cat };
  });

  const dayLabels = lang === 'id'
    ? ['S', 'S', 'R', 'K', 'J', 'S', 'M']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const stats = { xp: xpTotal, streak, questsCompleted: completedQuestIds.size, moodDays: moodDayCount };
  const unlockedAchievements = achievements.filter((a) => a.check(stats));
  const unlockedIds = new Set(unlockedAchievements.map((a) => a.id));

  useEffect(() => {
    if (prevAchvIds.size > 0) {
      const newOnes = unlockedIds.difference(prevAchvIds);
      if (newOnes.size > 0) {
        const newId = newOnes.values().next().value;
        if (newId) {
          const ach = achievements.find((a) => a.id === newId);
          if (ach) {
            setAchvPopup(t(ach.nameKey));
            setTarsyMood('celebrate');
            setTimeout(() => setAchvPopup(null), 3500);
            setTimeout(() => setTarsyMood('idle'), 4500);
          }
        }
      }
    }
    setPrevAchvIds(new Set(unlockedIds));
  }, [unlockedAchievements.length]);

  const moodEmojiMap: Record<Mood, string> = {
    on_fire: '🔥', need_chill: '🌊', overthinking: '🌀', burnout: '😮‍💨', inspired: '✨',
  };
  const moodColorMap: Record<Mood, string> = {
    on_fire: '#6cbf28', need_chill: '#4a9df0', overthinking: '#7452ed', burnout: '#e9ae00', inspired: '#e1688d',
  };
  const dailyXpGoal = 50;
  const todayXpEarned = Math.min(dailyXpGoal, completedQuestIds.size * 50);
  const dailyProgress = Math.min(100, (todayXpEarned / dailyXpGoal) * 100);

  return (
    <div className="app-shell">
      {showConfetti && (
        <div className="confetti-overlay">
          <div className="confetti-text">{confettiText}</div>
          <div className="confetti-pieces">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                background: ['#a8e63f', '#7452ed', '#ffd34f', '#ff8fa3', '#4a9df0'][i % 5],
              }} />
            ))}
          </div>
        </div>
      )}

      {showLevelUp && (
        <div className="levelup-overlay">
          <div className="levelup-card">
            <div className="levelup-icon"><Trophy size={40} /></div>
            <h2>{t('gamify.levelUp')}</h2>
            <p>{t('gamify.levelUpSub', { n: levelUpNum })}</p>
            <div className="levelup-stars">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} size={28} fill="currentColor" className="levelup-star" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {achvPopup && (
        <div className="achv-popup">
          <div className="achv-popup-icon"><Award size={22} /></div>
          <div className="achv-popup-text">
            <strong>{t('achievement.unlocked')}</strong>
            <span>{t('achievement.unlockedSub', { name: achvPopup })}</span>
          </div>
        </div>
      )}

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>t</span></div>
          <span className="brand-name">tarsio</span>
        </div>

        {/* Level badge */}
        <div className="level-badge">
          <div className="level-ring" style={{ background: `conic-gradient(var(--lime) ${levelInfo.progress}%, #e9ebe5 ${levelInfo.progress}%)` }}>
            <div className="level-inner">
              <strong>{levelInfo.level}</strong>
              <small>{t('gamify.level', { n: '' }).split(' ')[0]}</small>
            </div>
          </div>
          <div className="level-info">
            <strong>{t('gamify.level', { n: levelInfo.level })}</strong>
            <span>{t('gamify.xpToNext', { xp: Math.ceil(levelInfo.needed - levelInfo.current), n: levelInfo.level + 1 })}</span>
          </div>
        </div>

        <div className="side-profile">
          <div className="avatar avatar-large">{firstName[0]?.toUpperCase()}</div>
          <div>
            <strong>{displayName}</strong>
            <span>{isPremium ? t('profile.role.premium') : t('profile.role.free')}</span>
          </div>
          <MoreHorizontal size={18} />
        </div>
        <nav className="side-nav">
          <p className="nav-label">{t('nav.space')}</p>
          {[
            { id: 'today', label: t('nav.today'), icon: BarChart3 },
            { id: 'quests', label: t('nav.quests'), icon: Zap },
            { id: 'blueprint', label: t('nav.blueprint'), icon: PenLine },
            { id: 'friends', label: t('nav.friends'), icon: HeartHandshake },
            { id: 'achievements', label: t('nav.achievements'), icon: Award },
          ].map(({ id, label, icon: Icon }) => (
            <button
              className={`side-link ${activeNav === id ? 'active' : ''}`}
              key={id}
              onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
            >
              <Icon size={18} strokeWidth={2.2} />
              <span>{label}</span>
              {id === 'friends' && <span className="nav-dot" />}
            </button>
          ))}
          <p className="nav-label nav-label-lower">{t('nav.more')}</p>
          <button className="side-link" onClick={() => { loadChat(); setChatOpen(true); }}>
            <MessageCircle size={18} /><span>{t('nav.chat')}</span>
          </button>
          <button className="side-link" onClick={() => setActiveNav('profile')}><User size={18} /><span>{t('nav.profile')}</span></button>
          <button className="side-link"><CircleHelp size={18} /><span>{t('nav.help')}</span></button>
        </nav>
        <div className="sidebar-bottom">
          {!isPremium && (
            <div className="upgrade-mini">
              <div className="upgrade-icon"><Sparkles size={16} /></div>
              <strong>{t('upgrade.title')}</strong>
              <span>{t('upgrade.subtitle')}</span>
              <button onClick={() => setPaywallOpen(true)}>
                {t('upgrade.cta')} <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          <button className="side-link profile-link" onClick={() => setActiveNav('profile')}>
            <div className="avatar avatar-small">{firstName[0]?.toUpperCase()}</div>
            <span>{t('nav.profile')}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div className="breadcrumb">
            <span>{t('topbar.workspace')}</span>
            <ChevronRight size={14} />
            <strong>{activeNav === 'today' ? t('nav.today') : t(`nav.${activeNav}`)}</strong>
          </div>
          <div className="top-actions">
            <div className="language-toggle">
              <button className={lang === 'id' ? 'selected' : ''} onClick={() => setLanguage('id')}>ID</button>
              <button className={lang === 'en' ? 'selected' : ''} onClick={() => setLanguage('en')}>EN</button>
            </div>
            <div className="top-streak">
              <Flame size={16} fill="currentColor" />
              <strong>{streak}</strong>
              <span>{t('streak.days')}</span>
            </div>
            <div className="top-xp">
              <Zap size={16} fill="currentColor" />
              <strong>{xpTotal}</strong>
              <span>XP</span>
            </div>
            <button className="header-avatar">{firstName[0]?.toUpperCase()}</button>
          </div>
        </header>

        <div className="content-wrap">
          {activeNav === 'today' && (
            <>
              {/* Daily XP progress bar */}
              <div className="daily-xp-bar">
                <div className="daily-xp-info">
                  <span className="eyebrow">{t('daily.progress')}</span>
                  <strong>{todayXpEarned} / {dailyXpGoal} XP</strong>
                </div>
                <div className="daily-xp-track">
                  <div className="daily-xp-fill" style={{ width: `${dailyProgress}%` }}>
                    <Zap size={14} fill="currentColor" />
                  </div>
                </div>
              </div>

              <section className="welcome-row">
                <div>
                  <p className="eyebrow">{new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p>
                  <h1>{t('greeting', { name: firstName })} <span className="wave">✦</span></h1>
                  <p className="welcome-subtitle">{t('subtitle')}</p>
                </div>
                <div className="completion-card">
                  <span>{t('week.progress')}</span>
                  <strong>{completion}%</strong>
                  <div className="tiny-progress"><i style={{ width: `${completion}%` }} /></div>
                </div>
              </section>

              <section className="hero-grid">
                <div className="streak-card">
                  <div className="streak-glow" />
                  <div className="card-topline">
                    <span className="eyebrow light">{t('streak.active')}</span>
                    <span className="streak-badge"><Flame size={14} fill="currentColor" /> {t('streak.keepGoing')}</span>
                  </div>
                  <div className="streak-number">{streak} <span>{t('streak.days')}</span></div>
                  <p>{t('streak.encourage')}</p>
                  <div className="week-dots">
                    {dayLabels.map((day, index) => (
                      <div key={`${day}-${index}`} className={index < Math.min(streak, 3) ? 'filled' : index === 3 && streak > 0 ? 'today-dot' : ''}>
                        <span>{index < Math.min(streak, 3) ? '✓' : ''}</span>
                        <small>{day}</small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="vibe-card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">{t('vibe.eyebrow')}</span>
                      <h2>{t('vibe.title')}</h2>
                      <p>{t('vibe.subtitle')}</p>
                    </div>
                    <TarsyMascot size={64} mood={tarsyMood} lang={lang} bubbleAlign="right" onClick={() => { loadChat(); setChatOpen(true); }} />
                  </div>
                  <div className="mood-list">
                    {moodConfig.map((item) => (
                      <button
                        key={item.key}
                        className={`mood-pill ${item.color} ${todayMood === item.key ? 'chosen' : ''}`}
                        onClick={() => chooseMood(item.key)}
                      >
                        <span>{item.emoji}</span>
                        {t(`mood.${item.key}`)}
                      </button>
                    ))}
                  </div>
                  {todayMood && (
                    <div className="saved-message">
                      <Check size={15} /> {t('vibe.saved')} — {t('vibe.tuning')}
                    </div>
                  )}
                </div>
              </section>

              <section className="section-block quests-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{t('quests.eyebrow')}</span>
                    <h2>{t('quests.title')}</h2>
                  </div>
                  {questList.length > LANDING_QUEST_LIMIT && (
                    <button className="view-all-link" onClick={() => setActiveNav('quests')}>
                      {t('quests.viewAll')} <ChevronRight size={15} />
                    </button>
                  )}
                </div>
                <div className="quest-grid">
                  {/* The landing page shows a shortlist; the Quests tab holds the rest. */}
                  {questList.slice(0, LANDING_QUEST_LIMIT).map((quest) => {
                    const Icon = quest.category?.slug ? (categoryIcons[quest.category.slug] || Sparkles) : Sparkles;
                    const isCompleted = completedQuestIds.has(quest.id);
                    const isLocked = quest.tier_required === 'premium' && !isPremium;
                    const colorClass = quest.category?.slug === 'career' ? 'green-card'
                      : quest.category?.slug === 'self_discovery' ? 'purple-card'
                      : quest.category?.slug === 'financial' ? 'yellow-card'
                      : 'pink-card';
                    return (
                      <button
                        className={`quest-card ${colorClass} ${isLocked ? 'is-locked' : ''} ${isCompleted ? 'is-completed' : ''}`}
                        key={quest.id}
                        onClick={() => openQuest(quest)}
                      >
                        <div className="quest-card-head">
                          <span className="quest-category">{quest.category ? (lang === 'id' ? quest.category.name_id : quest.category.name_en) : ''}</span>
                          {isLocked ? (
                            <span className="lock-label"><Lock size={12} /> {t('quests.premium')}</span>
                          ) : isCompleted ? (
                            <span className="completed-badge"><Check size={13} /> {t('quests.complete')}</span>
                          ) : (
                            <span className="quest-arrow"><ArrowUpRight size={18} /></span>
                          )}
                        </div>
                        <div className="quest-icon"><Icon size={23} /></div>
                        <h3>{lang === 'id' ? quest.title_id : quest.title_en}</h3>
                        <p>{lang === 'id' ? quest.description_id : quest.description_en}</p>
                        <div className="quest-card-foot">
                          <span>+{quest.xp_reward} {t('quests.xp')}</span>
                          {isCompleted ? (
                            <span className="completed-link"><Check size={15} /> {t('quests.complete')}</span>
                          ) : isLocked ? (
                            <span className="start-link">{t('quests.locked')} <ChevronRight size={15} /></span>
                          ) : (
                            <span className="start-link">{t('quests.start')} <ChevronRight size={15} /></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Mood history mini chart */}
              {moodHistory.length > 0 && (
                <section className="mood-history-section">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">{t('mood.history')}</span>
                      <h2>{t('mood.historySub')}</h2>
                    </div>
                    <Calendar size={18} color="#8a9089" />
                  </div>
                  <div className="mood-chart">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const day = moodHistory[i];
                      const dayLabel = new Date(Date.now() - i * 86400000).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })[0];
                      return (
                        <div className="mood-chart-bar" key={i}>
                          <div className="mood-chart-emoji" style={{ opacity: day ? 1 : 0.2 }}>
                            {day ? moodEmojiMap[day.mood] : '○'}
                          </div>
                          <div className="mood-chart-dot" style={{ background: day ? moodColorMap[day.mood] : '#e0e0db' }} />
                          <small>{dayLabel}</small>
                        </div>
                      );
                    }).reverse()}
                  </div>
                </section>
              )}

              <section className="lower-grid">
                <div className="chat-promo">
                  <div className="chat-promo-icon"><Bot size={24} /></div>
                  <div>
                    <span className="eyebrow">{t('chat.eyebrow')}</span>
                    <h2>{t('chat.title')}</h2>
                    <p>{t('chat.subtitle')}</p>
                    <button className="dark-button" onClick={() => { loadChat(); setChatOpen(true); }}>
                      {t('chat.button')} <MessageCircle size={16} />
                    </button>
                  </div>
                  <div className="chat-spark">✦</div>
                </div>
                <div className="blueprint-card">
                  <div className="blueprint-lines" />
                  <div className="blueprint-content">
                    <span className="eyebrow">{t('blueprint.eyebrow')}</span>
                    <h2>{t('blueprint.title')}</h2>
                    <p>{t('blueprint.subtitle')}</p>
                    <button className="outline-button" onClick={() => setActiveNav('blueprint')}>
                      {t('blueprint.open')} <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="blueprint-score">
                    <Trophy size={18} />
                    <strong>{completedQuestIds.size}</strong>
                    <span>{t('blueprint.insights')}</span>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeNav === 'blueprint' && (
            <section className="blueprint-view">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{t('blueprint.eyebrow')}</span>
                  <h2>{t('blueprint.title')}</h2>
                </div>
              </div>
              {completedQuestIds.size === 0 ? (
                <div className="empty-state">
                  <TarsyMascot size={100} mood="encourage" lang={lang} />
                  <p>{t('blueprint.empty')}</p>
                </div>
              ) : (
                <div className="blueprint-stats">
                  <div className="stat-card">
                    <Trophy size={24} />
                    <strong>{completedQuestIds.size}</strong>
                    <span>{t('blueprint.questsDone')}</span>
                  </div>
                  <div className="stat-card">
                    <Zap size={24} />
                    <strong>{xpTotal}</strong>
                    <span>{t('blueprint.totalXp')}</span>
                  </div>
                  <div className="stat-card">
                    <Flame size={24} />
                    <strong>{streak}</strong>
                    <span>{t('streak.days')}</span>
                  </div>
                  <div className="stat-card">
                    <Star size={24} />
                    <strong>{levelInfo.level}</strong>
                    <span>{t('blueprint.currentLevel')}</span>
                  </div>
                  <div className="completed-quests-list">
                    <h3>{t('quests.completed')}</h3>
                    {questList.filter((q) => completedQuestIds.has(q.id)).map((q) => (
                      <div className="completed-quest-item" key={q.id}>
                        <Check size={18} />
                        <div>
                          <strong>{lang === 'id' ? q.title_id : q.title_en}</strong>
                          <span>+{q.xp_reward} {t('quests.xp')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeNav === 'friends' && (
            <section className="friends-view">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{t('nav.friends')}</span>
                  <h2>{t('friends.title')}</h2>
                  <p className="section-subtitle">{t('friends.subtitle')}</p>
                </div>
              </div>
              <div className="referral-card">
                <div>
                  <strong>{t('friends.referral')}</strong>
                  <span className="referral-code">{(profile?.id || 'TARSIO').substring(0, 8).toUpperCase()}</span>
                </div>
                <button className="copy-button" onClick={copyReferral}>
                  {copied ? <><Check size={15} /> {t('friends.copied')}</> : <><Copy size={15} /> {t('friends.copy')}</>}
                </button>
              </div>
              <div className="add-friend-row">
                <input
                  type="text"
                  placeholder={t('friends.addPlaceholder')}
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  className="add-friend-input"
                />
                <button className="dark-button" onClick={addFriend}><UserPlus size={16} /> {t('friends.add')}</button>
              </div>
              {friendError && <p className="friend-error">{friendError}</p>}
              <div className="friends-list">
                {(friendsList.length > 0 ? friendsList : [
                  { name: t('friends.demo1'), streak: 12 },
                  { name: t('friends.demo2'), streak: 5 },
                ]).map((friend, i) => (
                  <div className="friend-card" key={i}>
                    <div className="friend-avatar">{friend.name[0]}</div>
                    <div className="friend-info">
                      <strong>{friend.name}</strong>
                      <span><Flame size={12} /> {friend.streak} {t('friends.streak')}</span>
                    </div>
                    <button className="highfive-button" onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).classList.add('pulse');
                      setTimeout(() => (e.currentTarget as HTMLButtonElement).classList.remove('pulse'), 600);
                    }}>
                      <Heart size={16} /> {t('friends.highFive')}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeNav === 'achievements' && (
            <section className="achievements-view">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{t('gamify.achievements')}</span>
                  <h2>{t('gamify.achievements')}</h2>
                  <p className="section-subtitle">{t('gamify.achievementsSub')}</p>
                </div>
              </div>
              <div className="achievements-grid">
                {achievements.map((ach) => {
                  const Icon = achievementIcons[ach.icon] || Award;
                  const unlocked = ach.check(stats);
                  return (
                    <div className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`} key={ach.id}>
                      <div className="achievement-icon"><Icon size={28} /></div>
                      <div className="achievement-info">
                        <strong>{t(ach.nameKey)}</strong>
                        <span>{t(ach.descKey)}</span>
                      </div>
                      <div className="achievement-status">
                        {unlocked ? <><Check size={14} /> {t('gamify.unlocked')}</> : t('gamify.locked')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeNav === 'quests' && (
            <section className="section-block">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{t('quests.eyebrow')}</span>
                  <h2>{t('quests.title')}</h2>
                </div>
              </div>
              {questList.length === 0 ? (
                <div className="empty-state"><p>{t('quest.noQuests')}</p></div>
              ) : questList.every((q) => completedQuestIds.has(q.id)) ? (
                <div className="empty-state">
                  <TarsyMascot size={100} mood="celebrate" lang={lang} />
                  <p>{t('quest.allDone')}</p>
                </div>
              ) : (
              <div className="quest-grid">
                {questList.filter((q) => !completedQuestIds.has(q.id)).map((quest) => {
                  const Icon = quest.category?.slug ? (categoryIcons[quest.category.slug] || Sparkles) : Sparkles;
                  const isCompleted = completedQuestIds.has(quest.id);
                  const isLocked = quest.tier_required === 'premium' && !isPremium;
                  const colorClass = quest.category?.slug === 'career' ? 'green-card'
                    : quest.category?.slug === 'self_discovery' ? 'purple-card'
                    : quest.category?.slug === 'financial' ? 'yellow-card'
                    : 'pink-card';
                  return (
                    <button
                      className={`quest-card ${colorClass} ${isLocked ? 'is-locked' : ''} ${isCompleted ? 'is-completed' : ''}`}
                      key={quest.id}
                      onClick={() => openQuest(quest)}
                    >
                      <div className="quest-card-head">
                        <span className="quest-category">{quest.category ? (lang === 'id' ? quest.category.name_id : quest.category.name_en) : ''}</span>
                        {isLocked ? (
                          <span className="lock-label"><Lock size={12} /> {t('quests.premium')}</span>
                        ) : isCompleted ? (
                          <span className="completed-badge"><Check size={13} /> {t('quests.complete')}</span>
                        ) : (
                          <span className="quest-arrow"><ArrowUpRight size={18} /></span>
                        )}
                      </div>
                      <div className="quest-icon"><Icon size={23} /></div>
                      <h3>{lang === 'id' ? quest.title_id : quest.title_en}</h3>
                      <p>{lang === 'id' ? quest.description_id : quest.description_en}</p>
                      <div className="quest-card-foot">
                        <span>+{quest.xp_reward} {t('quests.xp')}</span>
                        {isCompleted ? (
                          <span className="completed-link"><Check size={15} /> {t('quests.complete')}</span>
                        ) : isLocked ? (
                          <span className="start-link">{t('quests.locked')} <ChevronRight size={15} /></span>
                        ) : (
                          <span className="start-link">{t('quests.start')} <ChevronRight size={15} /></span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
            </section>
          )}

          {activeNav === 'profile' && <ProfileView />}

          <footer>
            <span>tarsio / {t('app.tagline')}</span>
            <span>{t('app.madeFor')}</span>
          </footer>
        </div>
      </main>

      {chatOpen && (
        <div className="overlay" onClick={() => setChatOpen(false)}>
          <aside className="chat-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="drawer-title">
                <TarsyMascot size={40} mood={tarsyMood} lang={lang} bubble={false} />
                <div>
                  <strong>Tarsy</strong>
                  <span>{t('chat.status.online')}</span>
                </div>
              </div>
              <button className="icon-button" onClick={() => setChatOpen(false)}><X size={20} /></button>
            </div>
            <div className="chat-messages">
              {messages.map((item, index) => (
                <div className={`message-row ${item.from}`} key={`${item.text}-${index}`}>
                  <div className={`message-bubble ${item.error ? 'is-error' : ''}`}>
                    <Markdown text={item.text} />
                    {item.error && (
                      <button className="retry-button" onClick={() => requestReply(lastUserMessage)}>
                        <RefreshCw size={12} /> {t('chat.retry')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="message-row tarsy">
                  <div className="message-bubble typing-bubble">
                    <span className="typing-dot" /> <span className="typing-dot" /> <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-suggestions">
              <button onClick={() => setMessage(t('chat.suggestion1'))}>{t('chat.suggestion1')}</button>
              <button onClick={() => setMessage(t('chat.suggestion2'))}>{t('chat.suggestion2')}</button>
              <button onClick={() => setMessage(t('chat.suggestion3'))}>{t('chat.suggestion3')}</button>
            </div>
            <div className="chat-input">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitMessage(); }}
                placeholder={t('chat.placeholder')}
              />
              <button onClick={submitMessage}><Send size={18} /></button>
            </div>
            <p className="chat-note">{t('chat.note')}</p>
          </aside>
        </div>
      )}

      {paywallOpen && (
        <div className="modal-overlay" onClick={() => setPaywallOpen(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPaywallOpen(false)}><X size={19} /></button>
            <div className="paywall-spark"><Sparkles size={22} /></div>
            <span className="eyebrow">{t('paywall.eyebrow')}</span>
            <h2>{t('paywall.title')}</h2>
            <p>{t('paywall.body')}</p>
            <div className="price-options">
              <button className="price-option" onClick={upgradeToPremium}>
                <span>{t('paywall.monthly')}</span>
                <strong>Rp 29.000</strong>
                <small>{t('paywall.perMonth')}</small>
              </button>
              <button className="price-option featured" onClick={upgradeToPremium}>
                <em>{t('paywall.bestValue')}</em>
                <span>{t('paywall.annual')}</span>
                <strong>Rp 199.000</strong>
                <small>{t('paywall.save')} · {t('paywall.perYear')}</small>
              </button>
            </div>
            <button className="yellow-button" onClick={upgradeToPremium}>
              {t('paywall.cta')} <ArrowUpRight size={17} />
            </button>
            <small className="modal-footnote">{t('paywall.note')}</small>
          </div>
        </div>
      )}

      {questOpen && activeQuest && questions.length > 0 && (
        <div className="modal-overlay" onClick={() => setQuestOpen(false)}>
          <div className="quest-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quest-modal-head">
              <span className="eyebrow">{t('quest.step', { current: Math.min(questionStep + 1, questions.length), total: questions.length })}</span>
              <button className="modal-close" onClick={() => setQuestOpen(false)}><X size={19} /></button>
            </div>
            <div className="quest-progress-wide">
              <i style={{ width: `${((questionStep + 1) / questions.length) * 100}%` }} />
            </div>
            {questionStep < questions.length ? (
              (() => {
                const q = questions[questionStep];
                const questionText = lang === 'id' ? q.question_id : q.question_en;
                const options = q.options || [];
                const canProceed = q.question_type === 'text' ? currentAnswer.trim().length > 0 : currentAnswer.length > 0;
                return (
                  <>
                    <h2>{questionText}</h2>
                    <p className="quest-prompt">{q.question_type === 'text' ? t('quest.noRight') : q.question_type === 'multi_choice' ? t('quest.multiHint') : t('quest.noRight')}</p>
                    {q.question_type === 'text' ? (
                      <textarea
                        className="quest-text-input"
                        placeholder={t('quest.textPlaceholder')}
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        rows={4}
                        autoFocus
                      />
                    ) : q.question_type === 'scale' ? (
                      <div className="answer-list">
                        {options.map((opt) => {
                          const label = lang === 'id' ? opt.label_id : opt.label_en;
                          return (
                            <button
                              key={opt.value}
                              className={currentAnswer === opt.value ? 'selected' : ''}
                              onClick={() => setCurrentAnswer(opt.value)}
                            >
                              <span>{currentAnswer === opt.value ? <Check size={17} /> : opt.value}</span>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : q.question_type === 'multi_choice' ? (
                      <div className="answer-list">
                        {options.map((opt) => {
                          const label = lang === 'id' ? opt.label_id : opt.label_en;
                          const selected = currentAnswer.split(',').includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              className={selected ? 'selected' : ''}
                              onClick={() => {
                                const vals = currentAnswer ? currentAnswer.split(',') : [];
                                const newVals = selected ? vals.filter((v) => v !== opt.value) : [...vals, opt.value];
                                setCurrentAnswer(newVals.join(','));
                              }}
                            >
                              <span>{selected ? <Check size={17} /> : ''}</span>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="answer-list">
                        {options.map((opt) => {
                          const label = lang === 'id' ? opt.label_id : opt.label_en;
                          return (
                            <button
                              key={opt.value}
                              className={currentAnswer === opt.value ? 'selected' : ''}
                              onClick={() => setCurrentAnswer(opt.value)}
                            >
                              <span>{currentAnswer === opt.value ? <Check size={17} /> : ''}</span>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button
                      className="dark-button full-button"
                      disabled={!canProceed}
                      onClick={nextStep}
                    >
                      {questionStep === questions.length - 1 ? t('quest.seePov') : t('quest.next')}
                      {questionStep < questions.length - 1 ? <ChevronRight size={17} /> : <Sparkles size={17} />}
                    </button>
                  </>
                );
              })()
            ) : questLoading ? (
              <div className="result-state">
                <div className="result-icon" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}><Sparkles size={28} /></div>
                <h2>{t('quest.generating')}</h2>
                <div className="typing-bubble" style={{ justifyContent: 'center' }}>
                  <span className="typing-dot" /> <span className="typing-dot" /> <span className="typing-dot" />
                </div>
              </div>
            ) : questResult ? (
              <div className="result-state">
                <div className="result-icon"><Sparkles size={28} /></div>
                <span className="eyebrow">{t('pov.eyebrow')}</span>
                <h2>{questResult.title}</h2>
                <div className="quest-result-body">{questResult.body.split('\n\n').map((p, i) => <p key={i}><Markdown text={p} /></p>)}</div>
                <div className="quest-result-takeaway">
                  <strong>{t('quest.resultTakeaway')}</strong>
                  <p><Markdown text={questResult.takeaway} /></p>
                </div>
                <div className="xp-earned-badge">{t('quest.xpEarned', { xp: activeQuest.xp_reward })}</div>
                <button className="yellow-button full-button" onClick={completeQuest}>
                  {t('quest.save')} <Check size={17} />
                </button>
              </div>
            ) : (
              <div className="result-state">
                <div className="result-icon"><Sparkles size={28} /></div>
                <span className="eyebrow">{t('pov.eyebrow')}</span>
                <h2>{t('pov.message')}</h2>
                <p>{t('pov.sub')}</p>
                <div className="xp-earned-badge">{t('quest.xpEarned', { xp: activeQuest.xp_reward })}</div>
                <button className="yellow-button full-button" onClick={completeQuest}>
                  {t('quest.save')} <Check size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
