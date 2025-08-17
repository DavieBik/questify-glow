import React, { useState } from 'react'
import { SegmentedTabs } from '@/components/ui/segmented-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Clock, CheckCircle, Users, Calendar, Star } from 'lucide-react'

const SegmentedDemo: React.FC = () => {
  const [basicValue, setBasicValue] = useState('unread')
  const [iconsValue, setIconsValue] = useState('available')
  const [sizesSmall, setSizesSmall] = useState('today')
  const [sizesMedium, setSizesMedium] = useState('week')
  
  const basicItems = [
    { id: 'unread', label: 'Unread' },
    { id: 'all', label: 'All' }
  ]
  
  const iconItems = [
    { id: 'available', label: 'Available Projects', icon: <Calendar className="h-4 w-4" /> },
    { id: 'my-teams', label: 'My Teams', icon: <Users className="h-4 w-4" /> },
    { id: 'submissions', label: 'Submissions', icon: <CheckCircle className="h-4 w-4" /> }
  ]
  
  const timeItems = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all-time', label: 'All Time' }
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Segmented Tabs Demo</h1>
        <p className="text-muted-foreground">
          Demonstrating the standardized SegmentedTabs component with Canvas styling
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Example */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Segmented Tabs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SegmentedTabs
              items={basicItems}
              value={basicValue}
              onChange={setBasicValue}
            />
            <p className="text-sm text-muted-foreground">
              Selected: <strong>{basicValue}</strong>
            </p>
          </CardContent>
        </Card>

        {/* With Icons */}
        <Card>
          <CardHeader>
            <CardTitle>With Icons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SegmentedTabs
              items={iconItems}
              value={iconsValue}
              onChange={setIconsValue}
            />
            <p className="text-sm text-muted-foreground">
              Selected: <strong>{iconsValue}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Small Size */}
        <Card>
          <CardHeader>
            <CardTitle>Small Size</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SegmentedTabs
              items={timeItems}
              value={sizesSmall}
              onChange={setSizesSmall}
              size="sm"
            />
            <p className="text-sm text-muted-foreground">
              Selected: <strong>{sizesSmall}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Medium Size (Default) */}
        <Card>
          <CardHeader>
            <CardTitle>Medium Size (Default)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SegmentedTabs
              items={timeItems}
              value={sizesMedium}
              onChange={setSizesMedium}
              size="md"
            />
            <p className="text-sm text-muted-foreground">
              Selected: <strong>{sizesMedium}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Full Width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Full Width</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SegmentedTabs
              items={iconItems}
              value={iconsValue}
              onChange={setIconsValue}
              fullWidth
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Styling Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Active:</strong> bg-primary text-primary-foreground, rounded-full, shadow-sm</p>
            <p><strong>Inactive:</strong> bg-muted text-muted-foreground</p>
            <p><strong>Hover:</strong> bg-muted/80</p>
            <p><strong>Focus:</strong> ring-2 ring-primary/50</p>
            <p><strong>Disabled:</strong> opacity-60</p>
            <p><strong>Accessibility:</strong> role="tablist", keyboard arrow navigation, test IDs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SegmentedDemo