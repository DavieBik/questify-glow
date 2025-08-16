import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccountDrawer } from '@/components/app/AccountDrawer';
import { AnnouncementCard } from '@/components/app/AnnouncementCard';
import { WelcomeHeader } from '@/components/app/WelcomeHeader';
import { CourseCard } from '@/components/courses/CourseCard';
import { BottomTabs } from '@/components/app/BottomTabs';
import { Button } from '@/components/ui/button';

// Mock data for development
const mockCourses = [
  {
    id: '1',
    title: 'Introduction to React Development',
    code: 'CS101',
    color: '#0B2447'
  },
  {
    id: '2', 
    title: 'Advanced TypeScript Patterns',
    code: 'CS301',
    color: '#C08B00'
  },
  {
    id: '3',
    title: 'Database Design Fundamentals',
    code: 'DB201'
  }
];

const mockAnnouncement = {
  title: 'New course materials available for CS101',
  content: 'Updated lecture slides and assignments are now available.'
};

export default function Dashboard() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [courses, setCourses] = useState(mockCourses);
  const [loading, setLoading] = useState(false);

  const handleAnnouncementClick = () => {
    // Navigate to announcement details
    console.log('Navigate to announcement');
  };

  const CourseSkeletons = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-muted rounded-lg h-24 animate-pulse" />
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <CourseSkeletons />
            ) : courses.length > 0 ? (
              courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  code={course.code}
                  color={course.color}
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
  );
}