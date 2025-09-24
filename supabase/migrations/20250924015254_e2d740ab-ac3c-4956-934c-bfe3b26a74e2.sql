-- Create shorter, interactive e-learning course with 4 modules
INSERT INTO modules (
  course_id, 
  title, 
  content_type, 
  type, 
  description, 
  body, 
  order_index, 
  organization_id,
  duration_seconds,
  require_watch_pct,
  content_url
) VALUES 
-- Module 1: Interactive Introduction with Slides
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Cultural Competency Fundamentals',
  'video',
  'video',
  'Interactive presentation with narrated slides introducing key concepts of cultural competency in healthcare settings.',
  '# Cultural Competency Fundamentals

## Interactive E-Learning Module

This module includes:
- **Narrated Slides**: Professional voiceover explaining key concepts
- **Interactive Elements**: Click-through scenarios and knowledge checks
- **Real Examples**: Case studies from diverse healthcare settings

### Learning Path:
1. **Introduction Slides** (5 min) - What is cultural competency?
2. **Interactive Scenario** (3 min) - Practice identifying cultural considerations  
3. **Key Principles** (4 min) - Core elements of culturally responsive care
4. **Quick Assessment** (3 min) - Test your understanding

### Slide Content Overview:
- Slide 1: Welcome and objectives
- Slide 2: Definition of cultural competency
- Slide 3: Why it matters in healthcare
- Slide 4: Common cultural factors
- Slide 5: Your role as a care provider
- Slide 6: Interactive scenario
- Slide 7: Key takeaways',
  1,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  900,
  0.8,
  'https://www.youtube.com/embed/dQw4w9WgXcQ?start=10&end=910'
),

-- Module 2: Video-Based Learning
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Working with LGBTI+ Clients',
  'video',
  'video',
  'Professional video training featuring real scenarios, expert interviews, and best practices for inclusive care.',
  '# Working with LGBTI+ Clients

## Video Training Module

This comprehensive video module features:
- **Expert Interviews**: Healthcare professionals share insights
- **Patient Stories**: Real experiences from LGBTI+ community members
- **Scenario Demonstrations**: How to handle common situations
- **Best Practices**: Evidence-based approaches to inclusive care

### Video Segments:
1. **Understanding LGBTI+ Identities** (4 min)
2. **Creating Inclusive Environments** (3 min)  
3. **Communication Best Practices** (4 min)
4. **Handling Difficult Situations** (4 min)
5. **Resources and Support** (2 min)

### Key Learning Points:
- Respectful language and terminology
- Intake processes and documentation
- Family dynamics and chosen families
- Privacy and confidentiality considerations
- Available community resources',
  2,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  1020,
  0.85,
  'https://www.youtube.com/embed/dQw4w9WgXcQ?start=20&end=1040'
),

-- Module 3: Interactive SCORM Package
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Bias Recognition Interactive Training',
  'scorm',
  'scorm', 
  'Advanced interactive SCORM package with simulations, decision trees, and immediate feedback on bias recognition.',
  '# Bias Recognition Interactive Training

## Advanced SCORM E-Learning Package

This interactive module includes:
- **Self-Assessment Tools**: Discover your unconscious biases
- **Interactive Simulations**: Practice bias interruption techniques  
- **Decision Trees**: Navigate complex cultural scenarios
- **Immediate Feedback**: Learn from mistakes in real-time

### Interactive Components:
1. **Bias Assessment Quiz** - Identify your bias patterns
2. **Virtual Patient Encounters** - Practice with diverse clients
3. **Scenario Builder** - Create and solve bias challenges
4. **Progress Tracking** - Monitor your skill development
5. **Resource Library** - Access tools and references

### Learning Activities:
- Drag-and-drop bias identification exercises  
- Multiple choice scenarios with branching outcomes
- Video-based case studies with decision points
- Personal reflection journals with guided prompts
- Peer discussion forums and collaborative challenges

### Completion Requirements:
- Pass all interactive assessments (80% minimum)
- Complete reflection exercises
- Demonstrate bias interruption techniques',
  3,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  1800,
  0.9,
  NULL
),

-- Module 4: Final Assessment
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Cultural Competency Assessment',
  'survey',
  'survey',
  'Comprehensive final assessment combining knowledge testing, scenario-based questions, and action planning.',
  '# Cultural Competency Final Assessment

## Multi-Format Assessment Module

This assessment combines multiple evaluation methods:
- **Knowledge Quiz**: Test understanding of key concepts (15 questions)
- **Scenario Analysis**: Apply skills to realistic situations (5 scenarios)
- **Action Planning**: Create personal development goals
- **Certification**: Earn digital badge upon completion

### Assessment Structure:
1. **Multiple Choice Questions** (10 min)
   - Cultural competency definitions
   - Best practices identification
   - Legal and ethical considerations

2. **Case Study Analysis** (15 min)
   - Review realistic client scenarios
   - Identify cultural considerations
   - Recommend appropriate actions

3. **Personal Reflection** (10 min)
   - Self-assessment of cultural competency
   - Areas for improvement identification
   - Professional development planning

### Passing Requirements:
- Score 75% or higher on knowledge quiz
- Complete all scenario analyses
- Submit personal action plan
- Commit to ongoing cultural competency development',
  4,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  2100,
  0.95,
  NULL
);