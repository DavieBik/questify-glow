import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Award, Calendar, Lock } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  is_earned?: boolean;
  awarded_at?: string;
}

const Badges: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBadges();
    }
  }, [user]);

  const fetchBadges = async () => {
    if (!user) return;

    try {
      // Fetch all badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (badgesError) throw badgesError;

      // Fetch user's earned badges
      const { data: userBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id, awarded_at')
        .eq('user_id', user.id);

      if (userBadgesError) throw userBadgesError;

      const earnedBadgeIds = new Map(
        userBadges?.map(ub => [ub.badge_id, ub.awarded_at]) || []
      );

      const badgesWithStatus = allBadges?.map(badge => ({
        ...badge,
        is_earned: earnedBadgeIds.has(badge.id),
        awarded_at: earnedBadgeIds.get(badge.id)
      })) || [];

      setBadges(badgesWithStatus);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const earnedBadges = badges.filter(badge => badge.is_earned);
  const lockedBadges = badges.filter(badge => !badge.is_earned);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Achievement Badges</h1>
        <p className="text-muted-foreground">
          Track your learning milestones and celebrate your achievements!
        </p>
        <div className="flex justify-center gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{earnedBadges.length}</div>
            <div className="text-sm text-muted-foreground">Earned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-foreground">{lockedBadges.length}</div>
            <div className="text-sm text-muted-foreground">Locked</div>
          </div>
        </div>
      </div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Your Achievements</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {earnedBadges.map((badge) => (
              <Card 
                key={badge.id} 
                className="text-center hover:shadow-lg transition-all duration-300 border-primary/20 bg-gradient-to-b from-background to-primary/5"
              >
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4 text-6xl">
                    {badge.icon_url}
                  </div>
                  <CardTitle className="text-lg">{badge.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {badge.description}
                  </CardDescription>
                  <UIBadge variant="secondary" className="bg-primary/10 text-primary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Earned {formatDate(badge.awarded_at)}
                  </UIBadge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold">Available Badges</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lockedBadges.map((badge) => (
              <Card 
                key={badge.id} 
                className="text-center hover:shadow-md transition-all duration-300 opacity-75"
              >
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4 text-6xl grayscale">
                    {badge.icon_url}
                  </div>
                  <CardTitle className="text-lg text-muted-foreground">
                    {badge.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {badge.description}
                  </CardDescription>
                  <UIBadge variant="outline" className="text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </UIBadge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {badges.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Badges Available</h3>
            <p className="text-muted-foreground">
              Check back later as more achievement badges are added to the platform.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Badges;