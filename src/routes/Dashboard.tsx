import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AccountDrawer } from '@/components/app/AccountDrawer';
import { AnnouncementCard } from '@/components/app/AnnouncementCard';
import { WelcomeHeader } from '@/components/app/WelcomeHeader';
import { CourseCard } from '@/components/courses/CourseCard';
import { BottomTabs } from '@/components/app/BottomTabs';
import { Button } from '@/components/ui/button';

interface Course {
  id: string;
  title: string;
  category?: string;
  difficulty: string;
}

const mockAnnouncement = {
  title: 'New course materials available for CS101',
  content: 'Updated lecture slides and assignments are now available.'
};

export default function Dashboard() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      
      // First, get user enrollments
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const handleAnnouncementClick = () => {
    // Navigate to announcement details
    console.log('Navigate to announcement');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return '#10B981'; // green
      case 'intermediate': return '#F59E0B'; // amber  
      case 'advanced': return '#EF4444'; // red
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
          {/* Announcement */}
          {showAnnouncement && (
            <AnnouncementCard
              title={mockAnnouncement.title}
              onClick={handleAnnouncementClick}
            />
          )}

          {/* Welcome Header */}
          <WelcomeHeader />

          {/* Courses Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Courses</h2>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="text-brand-navy">
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
        {/* Announcement */}
        {showAnnouncement && (
          <div className="mb-6">
            <AnnouncementCard
              title={mockAnnouncement.title}
              onClick={handleAnnouncementClick}
            />
          </div>
        )}

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