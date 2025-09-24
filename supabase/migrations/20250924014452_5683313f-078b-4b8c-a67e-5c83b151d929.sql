-- Add comprehensive modules to "Working with Diverse Clients" course
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
  require_watch_pct
) VALUES 
-- Module 1: Introduction to Cultural Competency
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Introduction to Cultural Competency in Care Settings',
  'pdf',
  'pdf',
  'Foundational understanding of cultural competency, diversity, and inclusive practices in healthcare and support services.',
  '# Introduction to Cultural Competency

## Learning Objectives
By the end of this module, you will be able to:
- Define cultural competency and its importance in care settings
- Identify key dimensions of diversity
- Understand the impact of cultural background on health and care experiences
- Recognize your own cultural lens and potential biases

## What is Cultural Competency?

Cultural competency is the ability to interact effectively with people from different cultural backgrounds. It involves knowledge, skills, and attitudes that enable respectful and effective cross-cultural care.

## Dimensions of Diversity

Diversity encompasses many aspects:
- Cultural and Ethnic Background
- Religion and Spirituality
- Sexual Orientation and Gender Identity
- Socioeconomic Status
- Age and Generational Differences
- Ability and Disability
- Geographic Location

## Benefits of Cultural Competency
- Improved client satisfaction and trust
- Better health outcomes  
- Reduced miscommunication and conflicts
- Enhanced team diversity and perspectives
- Compliance with legal standards
- Personal and professional growth',
  1,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  1800,
  0.8
),

-- Module 2: Understanding CALD Communities
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Understanding CALD Communities - Cultural Perspectives',
  'video',
  'video',
  'Comprehensive video training on working effectively with Culturally and Linguistically Diverse (CALD) communities.',
  '# Understanding CALD Communities

## Video Content Overview (25 minutes)

This video explores the rich diversity within CALD communities and provides practical guidance for culturally responsive care.

## Key Topics:
- CALD community diversity and characteristics
- Communication strategies across cultures
- Working with interpreters effectively
- Religious and cultural accommodations
- Common challenges and solutions

## Learning Outcomes:
After watching this video, you will be able to:
- Identify unique needs of major CALD communities
- Use culturally appropriate communication strategies
- Navigate cultural conflicts respectfully
- Collaborate effectively with interpreters',
  2,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  1500,
  0.85
),

-- Module 3: LGBTI+ Awareness and Inclusion
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'LGBTI+ Awareness and Inclusive Care Practices',
  'video',
  'video',
  'Comprehensive training on providing inclusive, affirming care for LGBTI+ clients.',
  '# LGBTI+ Awareness and Inclusive Care

## Video Training Content (30 minutes)

Essential knowledge for creating inclusive environments and providing affirming care for LGBTI+ individuals.

## Module Structure:
- Understanding LGBTI+ identities and terminology
- Challenges faced by LGBTI+ communities  
- Creating inclusive environments
- Communication best practices
- Case studies and practical tools

## Key Principles:
- Respect: Honor each person''s identity and experiences
- Confidentiality: Protect private information
- Affirmation: Actively support LGBTI+ identities
- Advocacy: Stand up against discrimination
- Continuous Learning: Commit to ongoing education',
  3,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  1800,
  0.9
),

-- Module 4: Communication Across Cultures
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Effective Cross-Cultural Communication Strategies',
  'scorm',
  'scorm',
  'Interactive module with scenarios, simulations, and practical exercises for cross-cultural communication.',
  '# Cross-Cultural Communication Interactive Training

## Module Overview
This interactive module provides hands-on practice with cross-cultural communication through simulations, role-plays, and real-world scenarios.

## Interactive Components:
- Communication styles assessment
- Virtual reality scenarios
- Language and interpretation activities
- Decision trees for cultural situations
- Cultural competency skills builder

## Learning Activities:
- Virtual client meetings
- Communication challenge cards
- Cultural mentor conversations
- Assessment and reflection exercises

## Tools and Resources:
- Cultural communication reference guide
- Translation tools and cultural calendar
- Community resource directory',
  4,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  2700,
  0.8
),

-- Module 5: Religious and Spiritual Considerations
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Religious and Spiritual Considerations in Care',
  'pdf',
  'pdf',
  'Comprehensive guide to understanding and accommodating religious and spiritual needs in healthcare.',
  '# Religious and Spiritual Considerations in Care

## Learning Objectives
- Understand the role of religion and spirituality in health and healing
- Identify accommodation strategies for major world religions
- Develop skills for respectful spiritual conversations
- Create inclusive environments for diverse religious practices

## Major World Religions Covered:
- Christianity and its denominations
- Islam and Islamic practices
- Judaism and Jewish traditions
- Hinduism and Hindu customs
- Buddhism and Buddhist principles
- Sikhism and Sikh practices
- Indigenous spiritualities

## Practical Accommodation Strategies:
- Creating multi-faith spaces
- Dietary accommodations
- Scheduling flexibility
- Modesty considerations
- Spiritual items and symbols

## Key Takeaways:
- Religious beliefs are central to many people''s identity
- Every individual practices faith differently
- Respectful curiosity is better than assumptions
- Collaboration strengthens care outcomes',
  5,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  2400,
  0.8
),

-- Module 6: Unconscious Bias Recognition
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Unconscious Bias Recognition and Mitigation',
  'survey',
  'survey',
  'Interactive assessment helping participants identify and address unconscious biases.',
  '# Unconscious Bias Recognition and Mitigation

## Module Introduction
Unconscious bias affects everyone and can impact care quality. This assessment helps you recognize and mitigate bias in practice.

## What is Unconscious Bias?
Unconscious bias refers to attitudes that affect our decisions without conscious awareness. These biases operate automatically and can contradict our conscious values.

## Types of Bias:
- Confirmation bias
- Attribution bias  
- Anchoring bias
- Affinity bias
- Stereotype bias

## Mitigation Strategies:
- Awareness and acknowledgment
- Structured decision-making
- Perspective-taking
- Counter-stereotypic imaging
- Accountability systems

## Assessment Components:
- Implicit association tests
- Clinical scenario analysis
- Self-reflection surveys
- Action planning exercises',
  6,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  3600,
  0.9
),

-- Module 7: Practical Scenarios and Case Studies
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Real-World Scenarios: Diverse Client Case Studies',
  'scorm',
  'scorm',
  'Comprehensive interactive module with real-world case studies and decision trees.',
  '# Real-World Scenarios: Diverse Client Case Studies

## Module Overview
This advanced interactive module presents complex, real-world scenarios that challenge you to apply cultural competency skills in authentic situations.

## Case Study Collection:
- The Al-Hassan Family (Syrian refugees)
- Alex''s Transition Journey (transgender care)
- Elder Mary''s Traditional Healing (Aboriginal client)
- The Patel Multi-Generational Family (South Asian)
- David and Michael''s Care Partnership (same-sex couple)

## Interactive Elements:
- Branching narrative scenarios
- Decision trees and problem-solving
- Virtual team consultations
- Peer collaboration activities
- Real-time feedback and coaching

## Skills Development:
- Communication across differences
- Cultural adaptation techniques
- Resource connection and advocacy
- Bias interruption and mitigation

## Technology Integration:
- Virtual reality cultural immersion
- Augmented reality cultural cues
- Community connection platforms',
  7,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  4500,
  0.85
),

-- Module 8: Final Assessment
(
  '1775d812-125d-4c62-bee3-e2e0e6329afa',
  'Cultural Competency Assessment and Action Planning',
  'survey',
  'survey',
  'Comprehensive final assessment testing knowledge, skills, and application of cultural competency principles.',
  '# Cultural Competency Final Assessment

## Assessment Overview
This comprehensive assessment evaluates your mastery of cultural competency principles and practical application abilities.

## Assessment Components:
- Knowledge assessment (25 questions)
- Skills application scenarios
- Self-reflection and action planning

## Performance Levels:
- Developing (60-69%): Basic awareness
- Competent (70-84%): Good foundation
- Proficient (85-94%): Strong skills
- Expert (95-100%): Exceptional competency

## Certification Requirements:
Successful completion (70% or higher) provides:
- Official cultural competency certificate
- Digital professional badges
- Continuing education credits
- Professional development documentation

## Post-Assessment Support:
- Implementation guidance
- Ongoing learning opportunities
- Community connections
- Professional development pathways',
  8,
  (SELECT organization_id FROM courses WHERE id = '1775d812-125d-4c62-bee3-e2e0e6329afa'),
  5400,
  0.95
);