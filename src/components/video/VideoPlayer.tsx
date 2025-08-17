import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  moduleId: string;
  provider: 'storage' | 'youtube' | 'vimeo' | 'mux' | 'cloudflare';
  contentUrl: string;
  posterUrl?: string;
  captionsUrl?: string;
  durationSeconds?: number;
  requireWatchPct?: number;
  onProgress?: (position: number, watchedPct: number) => void;
  onComplete?: () => void;
}

export function VideoPlayer({
  moduleId,
  provider,
  contentUrl,
  posterUrl,
  captionsUrl,
  durationSeconds,
  requireWatchPct = 0.9,
  onProgress,
  onComplete
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get signed URL for Supabase Storage videos
  useEffect(() => {
    if (provider === 'storage' && contentUrl) {
      getSignedUrl();
    }
  }, [provider, contentUrl]);

  const getSignedUrl = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('videos')
        .createSignedUrl(contentUrl, 3600); // 1 hour expiry

      if (error) throw error;
      setSignedUrl(data.signedUrl);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast({
        title: 'Error loading video',
        description: 'Could not load video file',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (position: number, duration: number) => {
    const watchedPct = duration > 0 ? position / duration : 0;
    
    try {
      const { error } = await supabase.functions.invoke('video-progress', {
        body: {
          moduleId,
          position: Math.floor(position),
          duration: Math.floor(duration),
          watchedPct
        }
      });

      if (error) throw error;
      
      onProgress?.(position, watchedPct);

      // Check if completion threshold is met
      if (watchedPct >= requireWatchPct) {
        onComplete?.();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const { currentTime, duration } = videoRef.current;
    if (duration > 0) {
      updateProgress(currentTime, duration);
    }
  };

  const handleEnded = () => {
    if (!videoRef.current) return;
    
    const { duration } = videoRef.current;
    updateProgress(duration, duration);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` : url;
  };

  const getVimeoEmbedUrl = (url: string) => {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    return videoId ? `https://player.vimeo.com/video/${videoId}?dnt=1` : url;
  };

  if (loading) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">Loading video...</div>
      </div>
    );
  }

  // YouTube embed
  if (provider === 'youtube') {
    return (
      <div className="aspect-video">
        <iframe
          src={getYouTubeEmbedUrl(contentUrl)}
          className="w-full h-full rounded-lg"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  // Vimeo embed
  if (provider === 'vimeo') {
    return (
      <div className="aspect-video">
        <iframe
          src={getVimeoEmbedUrl(contentUrl)}
          className="w-full h-full rounded-lg"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  // HTML5 video for storage and other providers
  return (
    <div className="aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full rounded-lg"
        controls
        poster={posterUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      >
        <source src={provider === 'storage' ? signedUrl : contentUrl} type="video/mp4" />
        {captionsUrl && (
          <track
            kind="captions"
            src={captionsUrl}
            srcLang="en"
            label="English"
            default
          />
        )}
        Your browser does not support the video tag.
      </video>
    </div>
  );
}