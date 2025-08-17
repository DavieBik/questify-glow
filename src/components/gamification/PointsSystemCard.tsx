import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Star, Gift, Zap, Award, BookOpen, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PointsData {
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  level: number;
  points_to_next_level: number;
  current_level_points: number;
  next_level_points: number;
}

interface PointsHistory {
  id: string;
  points: number;
  source: string;
  created_at: string;
  description: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  available: boolean;
}

export function PointsSystemCard() {
  const { user } = useAuth();
  const [pointsData, setPointsData] = useState<PointsData>({
    total_points: 0,
    weekly_points: 0,
    monthly_points: 0,
    level: 1,
    points_to_next_level: 100,
    current_level_points: 0,
    next_level_points: 100
  });
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const levels = [
    { level: 1, name: 'Beginner', points: 0, badge: '🌱' },
    { level: 2, name: 'Learner', points: 100, badge: '📚' },
    { level: 3, name: 'Scholar', points: 300, badge: '🎓' },
    { level: 4, name: 'Expert', points: 600, badge: '⭐' },
    { level: 5, name: 'Master', points: 1000, badge: '🏆' },
    { level: 6, name: 'Guru', points: 1500, badge: '💎' },
    { level: 7, name: 'Legend', points: 2500, badge: '👑' }
  ];

  const mockRewards: Reward[] = [
    {
      id: '1',
      title: 'Coffee Voucher',
      description: '$5 coffee shop voucher',
      cost: 500,
      icon: '☕',
      available: true
    },
    {
      id: '2',
      title: 'Extra Break Time',
      description: '30 minutes additional break',
      cost: 300,
      icon: '⏰',
      available: true
    },
    {
      id: '3',
      title: 'Course Certificate Frame',
      description: 'Physical certificate frame',
      cost: 800,
      icon: '🖼️',
      available: true
    },
    {
      id: '4',
      title: 'Learning Buddy Match',
      description: 'Get matched with a study partner',
      cost: 200,
      icon: '👥',
      available: true
    },
    {
      id: '5',
      title: 'Skip Assignment',
      description: 'Skip one optional assignment',
      cost: 1000,
      icon: '🎯',
      available: false
    }
  ];

  useEffect(() => {
    if (user) {
      fetchPointsData();
    }
  }, [user]);

  const fetchPointsData = async () => {
    try {
      // Fetch user's completion points
      const { data: completions, error } = await supabase
        .from('completions')
        .select('points, completed_at, course_id, courses(title)')
        .eq('user_id', user?.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const totalPoints = completions?.reduce((sum, completion) => sum + (completion.points || 0), 0) || 0;

      // Calculate weekly points
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyPoints = completions?.filter(c => new Date(c.completed_at) >= weekAgo)
        .reduce((sum, completion) => sum + (completion.points || 0), 0) || 0;

      // Calculate monthly points
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthlyPoints = completions?.filter(c => new Date(c.completed_at) >= monthAgo)
        .reduce((sum, completion) => sum + (completion.points || 0), 0) || 0;

      // Calculate level
      let currentLevel = 1;
      let currentLevelPoints = 0;
      let nextLevelPoints = 100;

      for (let i = levels.length - 1; i >= 0; i--) {
        if (totalPoints >= levels[i].points) {
          currentLevel = levels[i].level;
          currentLevelPoints = levels[i].points;
          nextLevelPoints = i < levels.length - 1 ? levels[i + 1].points : levels[i].points;
          break;
        }
      }

      const pointsToNext = nextLevelPoints - totalPoints;

      setPointsData({
        total_points: totalPoints,
        weekly_points: weeklyPoints,
        monthly_points: monthlyPoints,
        level: currentLevel,
        points_to_next_level: Math.max(0, pointsToNext),
        current_level_points: currentLevelPoints,
        next_level_points: nextLevelPoints
      });

      // Create points history from completions
      const history: PointsHistory[] = completions?.map(completion => ({
        id: completion.course_id,
        points: completion.points || 0,
        source: 'Course Completion',
        created_at: completion.completed_at,
        description: `Completed: ${completion.courses?.title || 'Unknown Course'}`
      })) || [];

      setPointsHistory(history.slice(0, 10)); // Show last 10 activities
      setRewards(mockRewards);
    } catch (error) {
      console.error('Error fetching points data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLevel = () => {
    return levels.find(l => l.level === pointsData.level) || levels[0];
  };

  const getNextLevel = () => {
    return levels.find(l => l.level === pointsData.level + 1) || levels[levels.length - 1];
  };

  const getLevelProgress = () => {
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    const progressPoints = pointsData.total_points - currentLevel.points;
    const levelRange = nextLevel.points - currentLevel.points;
    return Math.min(100, (progressPoints / levelRange) * 100);
  };

  const handleRedeemReward = async (reward: Reward) => {
    if (pointsData.total_points >= reward.cost) {
      // Here you would implement the actual redemption logic
      // For now, we'll just show a success message
      console.log(`Redeemed: ${reward.title}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Points & Rewards
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
          <Coins className="h-5 w-5 text-yellow-500" />
          Points & Rewards
        </CardTitle>
        <CardDescription>
          Earn points by completing courses and redeem rewards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Points Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Coins className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {pointsData.total_points}
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-500">Total Points</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {pointsData.weekly_points}
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-500">This Week</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg border border-primary/20">
                <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">
                  {pointsData.monthly_points}
                </div>
                <p className="text-sm text-primary">This Month</p>
              </div>
            </div>

            {/* Level Progress */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getCurrentLevel().badge}</div>
                  <div>
                    <h3 className="font-bold text-lg">{getCurrentLevel().name}</h3>
                    <p className="text-sm text-muted-foreground">Level {pointsData.level}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                  {pointsData.points_to_next_level} pts to next level
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{getCurrentLevel().name}</span>
                  <span>{getNextLevel().name}</span>
                </div>
                <Progress value={getLevelProgress()} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pointsData.current_level_points} pts</span>
                  <span>{pointsData.next_level_points} pts</span>
                </div>
              </div>
            </div>

            {/* Points Sources */}
            <div className="space-y-3">
              <h4 className="font-semibold">How to Earn Points</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Complete Course</p>
                    <p className="text-xs text-muted-foreground">10-50 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Award className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Pass Quiz</p>
                    <p className="text-xs text-muted-foreground">5-20 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-sm">Join Discussion</p>
                    <p className="text-xs text-muted-foreground">2-5 points</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Target className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Daily Streak</p>
                    <p className="text-xs text-muted-foreground">5-15 points</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {pointsHistory.length > 0 ? (
              pointsHistory.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">+{activity.points}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.source}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No points earned yet. Complete a course to start earning!
              </p>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward) => (
                <div key={reward.id} className={`p-4 border rounded-lg ${
                  reward.available && pointsData.total_points >= reward.cost
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-card'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{reward.icon}</div>
                      <div>
                        <h4 className="font-medium">{reward.title}</h4>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {reward.cost} points
                    </Badge>
                    <Button
                      size="sm"
                      disabled={!reward.available || pointsData.total_points < reward.cost}
                      onClick={() => handleRedeemReward(reward)}
                    >
                      {pointsData.total_points >= reward.cost ? 'Redeem' : 'Not Enough Points'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}