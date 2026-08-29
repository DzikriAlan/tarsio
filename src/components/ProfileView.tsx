import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { translate } from '@/lib/i18n';
import { getLevel } from '@/lib/gamify';
import {
  Check, ChevronRight, Flame, Zap, Trophy, Star, AlertTriangle, X,
} from 'lucide-react';

export function ProfileView() {
  const { profile, language, setLanguage, signOut, refreshProfile } = useAuth();
  const t = (k: string, p?: Record<string, string | number>) => translate(language, k, p);
  const lang = language;

  const [editName, setEditName] = useState(profile?.display_name || '');
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const xpTotal = profile?.xp_total || 0;
  const levelInfo = getLevel(xpTotal);
  const isPremium = profile?.subscription_tier === 'premium';

  async function saveProfile() {
    if (!profile?.id) return;
    await supabase.from('profiles').update({ display_name: editName }).eq('id', profile.id);
    refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function deleteAccount() {
    if (!profile?.id) return;
    await supabase.from('profiles').delete().eq('id', profile.id);
    await supabase.auth.signOut();
  }

  return (
    <section className="profile-view">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('nav.profile')}</span>
          <h2>{t('profile.title')}</h2>
          <p className="section-subtitle">{t('profile.subtitle')}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="profile-stats-row">
        <div className="profile-stat">
          <Flame size={20} />
          <div><strong>{profile?.streak_count || 0}</strong><span>{t('streak.days')}</span></div>
        </div>
        <div className="profile-stat">
          <Zap size={20} />
          <div><strong>{xpTotal}</strong><span>{t('profile.totalXp')}</span></div>
        </div>
        <div className="profile-stat">
          <Star size={20} />
          <div><strong>{levelInfo.level}</strong><span>{t('profile.level')}</span></div>
        </div>
        <div className="profile-stat">
          <Trophy size={20} />
          <div><strong>{profile?.longest_streak || 0}</strong><span>{t('profile.longestStreak')}</span></div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="profile-card">
        <h3>{t('profile.displayName')}</h3>
        <div className="profile-edit-row">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="add-friend-input"
            placeholder={t('profile.displayName')}
          />
          <button className="dark-button" onClick={saveProfile}>
            {saved ? <><Check size={16} /> {t('profile.saved')}</> : t('common.close')}
          </button>
        </div>

        <div className="profile-divider" />

        <div className="profile-row">
          <span>{t('profile.language')}</span>
          <div className="language-toggle">
            <button className={lang === 'id' ? 'selected' : ''} onClick={() => setLanguage('id')}>ID</button>
            <button className={lang === 'en' ? 'selected' : ''} onClick={() => setLanguage('en')}>EN</button>
          </div>
        </div>

        <div className="profile-divider" />

        <div className="profile-row">
          <span>{t('profile.subscription')}</span>
          <span className={`profile-tier ${isPremium ? 'premium' : 'free'}`}>
            {isPremium ? t('profile.role.premium') : t('profile.role.free')}
          </span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="danger-zone">
        <div className="danger-header">
          <AlertTriangle size={18} />
          <strong>{t('profile.dangerZone')}</strong>
        </div>
        <button className="danger-button" onClick={() => setShowDelete(true)}>
          {t('profile.deleteAccount')} <ChevronRight size={16} />
        </button>
      </div>

      <button className="signout-button" onClick={signOut}>
        {t('profile.signOut')}
      </button>

      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDelete(false)}><X size={19} /></button>
            <div className="paywall-spark" style={{ background: '#ff8fa3' }}><AlertTriangle size={22} /></div>
            <h2 style={{ fontSize: 24 }}>{t('profile.deleteAccount')}</h2>
            <p>{t('profile.deleteConfirm')}</p>
            <button className="danger-button full-button" style={{ marginTop: 20 }} onClick={deleteAccount}>
              {t('profile.deleteAccount')}
            </button>
            <button className="outline-button full-button" style={{ marginTop: 10 }} onClick={() => setShowDelete(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
