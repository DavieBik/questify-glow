import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, Star, Zap, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardUser {
  id: string;
  first_name: string;
  last_name: string;
  total_points: number;
  completed_courses: number;
  current_streak: number;
  rank: number;
}

interface UserStats {
  total_points: number;
  completed_courses: number;
  current_streak: number;
  longest_streak: number;
  rank: number;
  weekly_points: number;
}

export function LeaderboardCard() {
  const { user } = useAuth();
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardUser[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeaderboardData();
    }
  }, [user]);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch weekly leaderboard (points earned in last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weeklyPoints, error: weeklyError } = await supabase
        .from('completions')
        .select('user_id, points, completed_at, users!inner(first_name, last_name)')
        .gte('completed_at', weekAgo.toISOString())
        .not('completed_at', 'is', null);

      if (weeklyError) throw weeklyError;

      // Aggregate weekly points by user
      const weeklyUserPoints = weeklyPoints?.reduce((acc, completion) => {
        const userId = completion.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            first_name: completion.users.first_name,
            last_name: completion.users.last_name,
            total_points: 0,
            completed_courses: 0,
            current_streak: 0,
            rank: 0
          };
        }
        acc[userId].total_points += completion.points || 0;
        acc[userId].completed_courses += 1;
        return acc;
      }, {} as Record<string, LeaderboardUser>) || {};

      const weeklyLeaderboard = Object.values(weeklyUserPoints)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 10)
        .map((user, index) => ({ ...user, rank: index + 1 }));

      setWeeklyLeaders(weeklyLeaderboard);

      // Fetch all-time leaderboard
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('completions')
        .select('user_id, points, users!inner(first_name, last_name)')
        .not('completed_at', 'is', null);

      if (allTimeError) throw allTimeError;

      const allTimeUserPoints = allTimeData?.reduce((acc, completion) => {
        const userId = completion.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            first_name: completion.users.first_name,
            last_name: completion.users.last_name,
            total_points: 0,
            completed_courses: 0,
            current_streak: 0,
            rank: 0
          };
        }
        acc[userId].total_points += completion.points || 0;
        acc[userId].completed_courses += 1;
        return acc;
      }, {} as Record<string, LeaderboardUser>) || {};

      const allTimeLeaderboard = Object.values(allTimeUserPoints)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 10)
        .map((user, index) => ({ ...user, rank: index + 1 }));

      setAllTimeLeaders(allTimeLeaderboard);

      // Fetch current user stats
      if (user) {
        const userInAllTime = allTimeUserPoints[user.id];
        const userInWeekly = weeklyUserPoints[user.id];
        
        if (userInAllTime) {
          const allTimeRank = Object.values(allTimeUserPoints)
            .sort((a, b) => b.total_points - a.total_points)
            .findIndex(u => u.id === user.id) + 1;

          setUserStats({
            total_points: userInAllTime.total_points,
            completed_courses: userInAllTime.completed_courses,
            current_streak: 0, // Simplified for now
            longest_streak: 0, // Simplified for now
            rank: allTimeRank,
            weekly_points: userInWeekly?.total_points || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
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
          Leaderboard
        </CardTitle>
        <CardDescription>
          Compete with your peers and climb the ranks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* User Stats */}
        {userStats && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Rank</span>
                </div>
                <p className="text-2xl font-bold">#{userStats.rank}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Points</span>
                </div>
                <p className="text-2xl font-bold">{userStats.total_points}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Streak</span>
                </div>
                <p className="text-2xl font-bold">{userStats.current_streak}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Courses</span>
                </div>
                <p className="text-2xl font-bold">{userStats.completed_courses}</p>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="space-y-4">
            {weeklyLeaders.length > 0 ? (
              weeklyLeaders.map((leader) => (
                <div key={leader.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(leader.rank)}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-sm">
                      {getInitials(leader.first_name, leader.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {leader.first_name} {leader.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {leader.completed_courses} courses this week
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">
                      {leader.total_points} pts
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No activity this week yet. Be the first!
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="alltime" className="space-y-4">
            {allTimeLeaders.map((leader) => (
              <div key={leader.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(leader.rank)}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-sm">
                    {getInitials(leader.first_name, leader.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {leader.first_name} {leader.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {leader.completed_courses} courses completed
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="bg-primary/20 text-primary-foreground">
                    {leader.total_points} pts
                  </Badge>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}