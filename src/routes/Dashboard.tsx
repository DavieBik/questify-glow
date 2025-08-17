import { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AccountDrawer } from '@/components/app/AccountDrawer';
import { WelcomeHeader } from '@/components/app/WelcomeHeader';
import { CourseCard } from '@/components/courses/CourseCard';
import { BottomTabs } from '@/components/app/BottomTabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface Course {
  id: string;
  title: string;
  category?: string;
  difficulty: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  expires_at?: string;
}

export default function Dashboard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    fetchAnnouncements();
  }, []);

  const fetchCourses = async () => {
    try {
      console.log('Dashboard: Fetching courses');
      setLoading(true);
      
      // First, get user enrollments
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Dashboard: Got user', { user: !!user });
      if (!user) {
        console.log('Dashboard: No user found, stopping fetch');
        return;
      }

      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select(`
          course_id,
          courses (
            id,
            title,
            category,
            difficulty
          )
        `)
        .eq('user_id', user.id);

      if (enrollments && enrollments.length > 0) {
        // Show enrolled courses
        const enrolledCourses = enrollments
          .map(enrollment => enrollment.courses)
          .filter(Boolean) as Course[];
        setCourses(enrolledCourses);
      } else {
        // If no enrollments, show available courses
        const { data: availableCourses } = await supabase
          .from('courses')
          .select('id, title, category, difficulty')
          .eq('is_active', true)
          .limit(6);

        setCourses(availableCourses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .or('expires_at.is.null,expires_at.gt.now()')
        .eq('priority', 'high')
        .limit(3);
      
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleDismissAnnouncement = (announcementId: string) => {
    setDismissedAnnouncements(prev => [...prev, announcementId]);
  };

  const visibleAnnouncements = announcements.filter(
    announcement => !dismissedAnnouncements.includes(announcement.id)
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'hsl(var(--accent))'; // accent
      case 'intermediate': return 'hsl(var(--secondary))'; // secondary  
      case 'advanced': return 'hsl(var(--destructive))'; // destructive
      default: return 'hsl(var(--accent))'; // accent fallback
    }
  };

  const CourseSkeletons = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-muted rounded-lg h-24 animate-pulse" />
      ))}
    </>
  );

  return (
    <>
      {/* Mobile Canvas-like Interface */}
      <div className="md:hidden min-h-screen bg-background pb-20">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <AccountDrawer />
            <h1 className="font-semibold text-lg">Dashboard</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Main Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Urgent Announcements */}
          {visibleAnnouncements.map((announcement) => (
            <Alert key={announcement.id} className="border-l-4 border-l-destructive bg-destructive/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="text-xs">URGENT</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <AlertDescription className="font-medium text-sm">
                    {announcement.title}
                  </AlertDescription>
                  {announcement.content && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {announcement.content}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismissAnnouncement(announcement.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          ))}

          {/* Welcome Header */}
          <WelcomeHeader />

          {/* Courses Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Courses</h2>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="text-primary">
                  All Courses
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Course Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {loading ? (
                <CourseSkeletons />
              ) : courses.length > 0 ? (
                courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    code={course.category}
                    color={getDifficultyColor(course.difficulty)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>No courses enrolled yet</p>
                  <Link to="/courses">
                    <Button className="mt-4">Browse Courses</Button>
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <BottomTabs />
      </div>

      {/* Desktop Interface - Traditional Layout */}
      <div className="hidden md:block">
        {/* Urgent Announcements */}
        {visibleAnnouncements.map((announcement) => (
          <Alert key={announcement.id} className="border-l-4 border-l-destructive bg-destructive/5 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive" className="text-xs">URGENT</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
                <AlertDescription className="font-medium">
                  {announcement.title}
                </AlertDescription>
                {announcement.content && (
                  <p className="text-muted-foreground mt-2">
                    {announcement.content}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => handleDismissAnnouncement(announcement.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        ))}

        {/* Welcome Header */}
        <WelcomeHeader />

        {/* Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Courses</h2>
            <Link to="/courses">
              <Button variant="ghost" className="text-primary">
                All Courses
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Course Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <CourseSkeletons />
            ) : courses.length > 0 ? (
              courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  code={course.category}
                  color={getDifficultyColor(course.difficulty)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No courses enrolled yet</p>
                <Link to="/courses">
                  <Button className="mt-4">Browse Courses</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}