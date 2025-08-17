import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Star, Trophy, Zap, Target, BookOpen, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'learning' | 'social' | 'streak' | 'special';
  requirement: number;
  current_progress: number;
  earned: boolean;
  earned_date?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export function AchievementBadges() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const achievementTemplates: Omit<Achievement, 'id' | 'current_progress' | 'earned' | 'earned_date'>[] = [
    // Learning Achievements
    {
      title: 'First Steps',
      description: 'Complete your first course',
      icon: '🎓',
      category: 'learning',
      requirement: 1,
      rarity: 'common'
    },
    {
      title: 'Knowledge Seeker',
      description: 'Complete 5 courses',
      icon: '📚',
      category: 'learning',
      requirement: 5,
      rarity: 'common'
    },
    {
      title: 'Scholar',
      description: 'Complete 10 courses',
      icon: '🎖️',
      category: 'learning',
      requirement: 10,
      rarity: 'rare'
    },
    {
      title: 'Master Learner',
      description: 'Complete 25 courses',
      icon: '🏆',
      category: 'learning',
      requirement: 25,
      rarity: 'epic'
    },
    {
      title: 'Learning Legend',
      description: 'Complete 50 courses',
      icon: '👑',
      category: 'learning',
      requirement: 50,
      rarity: 'legendary'
    },

    // Streak Achievements
    {
      title: 'Consistent',
      description: 'Maintain a 7-day learning streak',
      icon: '🔥',
      category: 'streak',
      requirement: 7,
      rarity: 'common'
    },
    {
      title: 'Dedicated',
      description: 'Maintain a 30-day learning streak',
      icon: '⚡',
      category: 'streak',
      requirement: 30,
      rarity: 'rare'
    },
    {
      title: 'Unstoppable',
      description: 'Maintain a 100-day learning streak',
      icon: '💎',
      category: 'streak',
      requirement: 100,
      rarity: 'legendary'
    },

    // Social Achievements
    {
      title: 'Team Player',
      description: 'Join your first group project',
      icon: '🤝',
      category: 'social',
      requirement: 1,
      rarity: 'common'
    },
    {
      title: 'Collaborator',
      description: 'Complete 3 group projects',
      icon: '👥',
      category: 'social',
      requirement: 3,
      rarity: 'rare'
    },
    {
      title: 'Discussion Leader',
      description: 'Post 50 forum messages',
      icon: '💬',
      category: 'social',
      requirement: 50,
      rarity: 'epic'
    },

    // Special Achievements
    {
      title: 'Speed Runner',
      description: 'Complete a course in under 2 hours',
      icon: '🏃',
      category: 'special',
      requirement: 1,
      rarity: 'rare'
    },
    {
      title: 'Perfect Score',
      description: 'Get 100% on a quiz',
      icon: '💯',
      category: 'special',
      requirement: 1,
      rarity: 'rare'
    },
    {
      title: 'Early Bird',
      description: 'Complete learning before 9 AM',
      icon: '🌅',
      category: 'special',
      requirement: 1,
      rarity: 'common'
    },
    {
      title: 'Night Owl',
      description: 'Complete learning after 10 PM',
      icon: '🦉',
      category: 'special',
      requirement: 1,
      rarity: 'common'
    }
  ];

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      // Fetch user's completion data
      const { data: completions, error: completionsError } = await supabase
        .from('completions')
        .select('completed_at, score_percentage')
        .eq('user_id', user?.id)
        .not('completed_at', 'is', null);

      if (completionsError) throw completionsError;

      // Fetch user's project participation
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('joined_at')
        .eq('user_id', user?.id);

      if (teamError) throw teamError;

      // Fetch user's forum posts
      const { data: forumPosts, error: forumError } = await supabase
        .from('forum_posts')
        .select('created_at')
        .eq('user_id', user?.id);

      if (forumError) throw forumError;

      // Calculate achievement progress
      const completedCourses = completions?.length || 0;
      const projectsJoined = teamMembers?.length || 0;
      const forumPostsCount = forumPosts?.length || 0;

      // Calculate streak (simplified version)
      let currentStreak = 0;
      if (completions && completions.length > 0) {
        const today = new Date();
        const completionDates = completions.map(c => new Date(c.completed_at).toDateString());
        const uniqueDates = [...new Set(completionDates)];

        for (let i = 0; i < uniqueDates.length; i++) {
          const completionDate = new Date(uniqueDates[i]);
          const daysDiff = Math.floor((today.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === i) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Check for special achievements
      const perfectScores = completions?.filter(c => c.score_percentage === 100).length || 0;
      const earlyBirdCount = completions?.filter(c => {
        const hour = new Date(c.completed_at).getHours();
        return hour < 9;
      }).length || 0;
      const nightOwlCount = completions?.filter(c => {
        const hour = new Date(c.completed_at).getHours();
        return hour >= 22;
      }).length || 0;

      // Process achievements
      const processedAchievements: Achievement[] = achievementTemplates.map((template, index) => {
        let currentProgress = 0;
        let earned = false;

        switch (template.category) {
          case 'learning':
            currentProgress = completedCourses;
            break;
          case 'streak':
            currentProgress = currentStreak;
            break;
          case 'social':
            if (template.title === 'Team Player' || template.title === 'Collaborator') {
              currentProgress = projectsJoined;
            } else if (template.title === 'Discussion Leader') {
              currentProgress = forumPostsCount;
            }
            break;
          case 'special':
            if (template.title === 'Perfect Score') {
              currentProgress = perfectScores;
            } else if (template.title === 'Early Bird') {
              currentProgress = earlyBirdCount;
            } else if (template.title === 'Night Owl') {
              currentProgress = nightOwlCount;
            } else {
              currentProgress = completedCourses > 0 ? 1 : 0; // Speed Runner - simplified
            }
            break;
        }

        earned = currentProgress >= template.requirement;

        return {
          ...template,
          id: `achievement-${index}`,
          current_progress: Math.min(currentProgress, template.requirement),
          earned,
          earned_date: earned ? new Date().toISOString() : undefined
        };
      });

      setAchievements(processedAchievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'learning': return <BookOpen className="h-4 w-4" />;
      case 'social': return <Users className="h-4 w-4" />;
      case 'streak': return <Target className="h-4 w-4" />;
      case 'special': return <Star className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20';
      case 'rare': return 'border-blue-300 bg-blue-50 dark:bg-blue-900/20';
      case 'epic': return 'border-purple-300 bg-purple-50 dark:bg-purple-900/20';
      case 'legendary': return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAchievementsByCategory = (category: string) => {
    return achievements.filter(a => a.category === category);
  };

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
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
          <Trophy className="h-5 w-5 text-yellow-500" />
          Achievements
        </CardTitle>
        <CardDescription>
          Unlock badges and showcase your learning milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overview */}
        <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Progress</span>
            <Badge variant="outline">
              {earnedCount}/{totalCount} Earned
            </Badge>
          </div>
          <Progress value={(earnedCount / totalCount) * 100} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Keep learning to unlock more achievements!
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="streak">Streak</TabsTrigger>
            <TabsTrigger value="special">Special</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    achievement.earned
                      ? `${getRarityColor(achievement.rarity)} shadow-sm`
                      : 'border-gray-200 bg-gray-50/50 dark:bg-gray-900/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${achievement.earned ? '' : 'grayscale'}`}>
                        {achievement.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={getRarityBadgeColor(achievement.rarity)}>
                        {achievement.rarity}
                      </Badge>
                      {achievement.earned && (
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          ✓ Earned
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {!achievement.earned && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{achievement.current_progress}/{achievement.requirement}</span>
                      </div>
                      <Progress 
                        value={(achievement.current_progress / achievement.requirement) * 100} 
                        className="h-1" 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {(['learning', 'social', 'streak', 'special'] as const).map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {getCategoryIcon(category)}
                <h3 className="font-semibold capitalize">{category} Achievements</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAchievementsByCategory(category).map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      achievement.earned
                        ? `${getRarityColor(achievement.rarity)} shadow-sm`
                        : 'border-gray-200 bg-gray-50/50 dark:bg-gray-900/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl ${achievement.earned ? '' : 'grayscale'}`}>
                          {achievement.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={getRarityBadgeColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                        {achievement.earned && (
                          <Badge variant="default" className="bg-primary text-primary-foreground">
                            ✓ Earned
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {!achievement.earned && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{achievement.current_progress}/{achievement.requirement}</span>
                        </div>
                        <Progress 
                          value={(achievement.current_progress / achievement.requirement) * 100} 
                          className="h-1" 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}