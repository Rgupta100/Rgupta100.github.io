export const profile = {
  name: 'Raghav Gupta',
  focus: 'AI & Software Engineering',
  introduction: 'Computer Engineering student at the University of Waterloo, with experience in AI application backends, computer vision, and full-stack development.',
  availability: 'Seeking a four-month Winter 2027 co-op in AI engineering or software development.',
  email: 'r237gupt@uwaterloo.ca',
  github: 'https://github.com/Rgupta100',
  linkedin: 'https://www.linkedin.com/in/rgupta100',
};

export const experience = [
  { role: 'Software Engineering Intern', organization: 'Floating Binary Software Systems', detail: 'Okulo', date: 'May–August 2026', location: 'Waterloo, ON · Remote', points: ['Delivered 34 merged pull requests across 36 completed tickets for a multi-tenant recruiting platform.', 'Developed self-service onboarding, email verification, and a multi-step company setup flow.', 'Created shared document-layout logic for preview, PDF, and DOCX rendering; migrated five modules to server-side search and cursor pagination.'], tools: 'TypeScript · React · Express · Firestore · Google Cloud Run' },
  { role: 'AI Engineering Intern', organization: 'Onside AI', detail: '', date: 'January–March 2026', location: 'Remote', points: ['Developed the persistence layer for an internal machine-learning service using SQLAlchemy and SQLite behind a FastAPI backend.', 'Stored model inputs and outputs as structured, queryable records and tuned query performance for latency-sensitive reads.'], tools: 'Python · FastAPI · SQLAlchemy · SQLite' },
  { role: 'Software Developer', organization: 'Awksion', detail: '', date: 'March–May 2026', location: 'Remote', points: ['Developed a Python scraper and two SQLite schemas to convert unstructured third-party sources into deduplicated, queryable records.'], tools: 'Python · SQLite · Data collection' },
  { role: 'Web Developer', organization: 'LTL Munitions', detail: 'VFC Intrapreneurship Program', date: 'July–August 2026', location: 'Concurrent placement', points: ['Redesigned and delivered a responsive marketing website, using Claude Code for implementation and reviewing the result through three design iterations.', 'Researched internal workflows and scoped opportunities for automation.'], tools: 'HTML · CSS · JavaScript · Claude Code' },
];

export const skills = [
  ['AI & computer vision', 'OpenCV, YOLOv8, scikit-learn, LLM and agent workflows'],
  ['Backend & data', 'Python, FastAPI, SQLAlchemy, SQL, SQLite, Node.js, Express, Firestore, Snowflake'],
  ['Frontend', 'TypeScript, JavaScript, React, HTML, CSS, Vite, TanStack Query'],
  ['Cloud & development', 'Google Cloud Run, Firebase, Docker, Git, GitHub Actions, Linux, Claude Code'],
  ['Additional languages', 'C++, C'],
];

export const formSteps = [
  ['Video input', 'Exercise footage provides the input for the analysis pipeline.'],
  ['Pose estimation', 'YOLOv8 identifies body joints in each frame, producing features for the classifier.'],
  ['Classification', 'A trained MLP classifier uses the pose features to distinguish good and poor exercise form.'],
  ['Feedback', 'The classification informs an exercise-form assessment. This diagram illustrates the approach, rather than running live inference.'],
];
export const motionSteps = [
  ['Compare frames', 'Running-average background subtraction compares the camera feed with a changing background model. Gaussian blur helps reduce noise.'],
  ['Detect movement', 'Frame differencing identifies movement within the image. The highlighted region is an illustrative detected area.'],
  ['Capture event', 'The application saves a timestamped image when movement is detected. A cooldown prevents duplicate events.'],
];
