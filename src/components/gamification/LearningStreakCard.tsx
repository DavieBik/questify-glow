import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Flame, Target, Trophy, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  weekly_goal: number;
  weekly_progress: number;
  streak_freeze_uses: number;
  last_activity_date: string | null;
}

interface StreakMilestone {
  days: number;
  title: string;
  reward: string;
  achieved: boolean;
}

export function LearningStreakCard() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    current_streak: 0,
    longest_streak: 0,
    weekly_goal: 5,
    weekly_progress: 0,
    streak_freeze_uses: 0,
    last_activity_date: null
  });
  const [loading, setLoading] = useState(true);

  const milestones: StreakMilestone[] = [
    { days: 7, title: 'Weekly Warrior', reward: '50 bonus points', achieved: false },
    { days: 14, title: 'Fortnight Fighter', reward: '100 bonus points', achieved: false },
    { days: 30, title: 'Monthly Master', reward: 'Special badge', achieved: false },
    { days: 60, title: 'Dedication Diamond', reward: '500 bonus points', achieved: false },
    { days: 100, title: 'Century Champion', reward: 'Exclusive certificate', achieved: false },
  ];

  useEffect(() => {
    if (user) {
      fetchStreakData();
    }
  }, [user]);

  const fetchStreakData = async () => {
    try {
      // Fetch user's completion history
      const { data: completions, error } = await supabase
        .from('completions')
        .select('completed_at, points')
        .eq('user_id', user?.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      if (completions && completions.length > 0) {
        // Calculate current streak
        const today = new Date();
        const completionDates = completions.map(c => new Date(c.completed_at).toDateString());
        const uniqueDates = [...new Set(completionDates)];

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        // Check if today or yesterday had activity (for current streak)
        const todayStr = today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        const hasRecentActivity = uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr);

        if (hasRecentActivity) {
          // Calculate consecutive days
          for (let i = 0; i < uniqueDates.length; i++) {
            const completionDate = new Date(uniqueDates[i]);
            const daysDiff = Math.floor((today.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= i + 1 && daysDiff >= 0) {
              currentStreak++;
              tempStreak++;
            } else {
              break;
            }
          }
        }

        // Calculate longest streak
        for (let i = 0; i < uniqueDates.length; i++) {
          const currentDate = new Date(uniqueDates[i]);
          tempStreak = 1;
          
          for (let j = i + 1; j < uniqueDates.length; j++) {
            const nextDate = new Date(uniqueDates[j]);
            const daysDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === j - i) {
              tempStreak++;
            } else {
              break;
            }
          }
          
          longestStreak = Math.max(longestStreak, tempStreak);
        }

        // Calculate weekly progress
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyCompletions = completions.filter(c => 
          new Date(c.completed_at) >= weekAgo
        );

        setStreakData({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          weekly_goal: 5,
          weekly_progress: Math.min(weeklyCompletions.length, 5),
          streak_freeze_uses: 0, // This would come from user profile
          last_activity_date: completions[0]?.completed_at || null
        });
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakIcon = (streak: number) => {
    if (streak >= 30) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (streak >= 14) return <Flame className="h-5 w-5 text-orange-500" />;
    if (streak >= 7) return <Zap className="h-5 w-5 text-blue-500" />;
    return <Target className="h-5 w-5 text-gray-500" />;
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your learning journey today!";
    if (streak === 1) return "Great start! Keep it going!";
    if (streak < 7) return `${streak} days strong! You're building momentum!`;
    if (streak < 14) return `Amazing! ${streak} day streak! You're on fire! 🔥`;
    if (streak < 30) return `Incredible! ${streak} days! You're a learning machine!`;
    return `Legendary! ${streak} day streak! You're unstoppable! 🏆`;
  };

  const weeklyPercentage = (streakData.weekly_progress / streakData.weekly_goal) * 100;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Learning Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Learning Streak
        </CardTitle>
        <CardDescription>
          Keep learning every day to maintain your streak
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Streak Display */}
        <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            {getStreakIcon(streakData.current_streak)}
          </div>
          <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {streakData.current_streak}
          </div>
          <div className="text-lg font-semibold mb-1">
            {streakData.current_streak === 1 ? 'Day' : 'Days'}
          </div>
          <p className="text-sm text-muted-foreground">
            {getStreakMessage(streakData.current_streak)}
          </p>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {streakData.longest_streak}
            </div>
            <p className="text-sm text-muted-foreground">Longest Streak</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-secondary">
              {streakData.weekly_progress}/{streakData.weekly_goal}
            </div>
            <p className="text-sm text-muted-foreground">Weekly Goal</p>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Weekly Progress</span>
            <Badge variant={weeklyPercentage >= 100 ? "default" : "secondary"}>
              {Math.round(weeklyPercentage)}%
            </Badge>
          </div>
          <Progress value={weeklyPercentage} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Complete {streakData.weekly_goal - streakData.weekly_progress} more to reach your weekly goal
          </p>
        </div>

        {/* Milestone Progress */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Streak Milestones</h4>
          {milestones.map((milestone) => {
            const achieved = streakData.longest_streak >= milestone.days;
            const isNext = !achieved && (milestones.find(m => !achieved) === milestone);
            
            return (
              <div key={milestone.days} className={`flex items-center gap-3 p-3 rounded-lg border ${
                achieved ? 'bg-secondary border-border' :
                isNext ? 'bg-accent/10 border-accent/20' :
                'bg-muted border-border'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  achieved ? 'bg-primary text-primary-foreground' :
                  isNext ? 'bg-accent text-accent-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {achieved ? '✓' : milestone.days}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{milestone.title}</p>
                  <p className="text-xs text-muted-foreground">{milestone.reward}</p>
                </div>
                {isNext && (
                  <Badge variant="outline" className="text-xs">
                    Next Goal
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Motivation */}
        {streakData.current_streak === 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-900 dark:text-blue-300">
                Ready to start your streak?
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Complete any course module today to begin building your learning habit!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}