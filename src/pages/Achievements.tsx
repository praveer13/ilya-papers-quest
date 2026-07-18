import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSaveStore } from '@/lib/game/save';
import { useReducedMotion } from '@/lib/game/format';
import ProfileHeader from './achievements/ProfileHeader';
import RankLadder from './achievements/RankLadder';
import StatsGrid from './achievements/StatsGrid';
import BadgeGallery from './achievements/BadgeGallery';
import StreakHeatmap from './achievements/StreakHeatmap';
import SaveManagerSection from './achievements/SaveManagerSection';

/**
 * /achievements — Profile & Achievements (achievements.md): the trophy room
 * and character sheet. Profile header with the 90% ring, rank ladder,
 * lifetime stats, badge gallery, streak heatmap, save-file manager.
 * All data derives from the save store.
 */
export default function Achievements() {
  const save = useSaveStore();
  const reduced = useReducedMotion();

  useEffect(() => {
    document.title = '90%▮ — badges & profile';
    return () => {
      document.title = '90% — The Ilya Papers Quest';
    };
  }, []);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <ProfileHeader save={save} />
      <RankLadder xp={save.xp} />
      <StatsGrid save={save} />
      <BadgeGallery save={save} />
      <StreakHeatmap save={save} />
      <SaveManagerSection />
    </motion.div>
  );
}
