import React from 'react';
import { AchievementBadges } from '@/components/gamification/AchievementBadges';

export default function Badges() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Achievements & Badges</h1>
        <p className="text-muted-foreground">
          Track your learning milestones and unlock special badges
        </p>
      </div>
      
      <AchievementBadges />
    </div>
  );
}