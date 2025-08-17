import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .is('read_at', null);

        if (error) throw error;
        setUnreadCount(data?.length || 0);
      } catch (error) {
        console.error('Error loading notification count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadUnreadCount();

    // Set up real-time subscription for notification changes
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`
        },
        () => {
          // Reload count when notifications change
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount, loading };
};