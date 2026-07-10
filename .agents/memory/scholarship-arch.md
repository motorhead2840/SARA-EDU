---
name: Scholarship Scheme
description: Monthly exam system — top 100 students win free lifetime subscriptions. DB schema, API routes, grant flow, and frontend pages.
---

## Database tables (scholarshipDb.ts)
- `scholarship_exams` — monthly exam definitions; UNIQUE(month, year); status: draft→open→closed→graded
- `scholarship_questions` — MCQ (auto-graded) or short_answer (mentor-graded); UNIQUE(exam_id, order_num)
- `scholarship_submissions` — one per (exam_id, email); auto_score computed on submit; total_score = auto_score + mentor_score (GENERATED ALWAYS AS STORED)
- No `scholarship_winners` table — winners tracked via `scholarship_granted = TRUE` + `rank` column on submissions

## Lifetime subscription grant
- `grantScholarships(exam_id)` ranks all submissions by total_score DESC, marks top 100 as granted, then UPDATEs `users` table:
  - `subscription_tier = 'high'`
  - `subscription_source = 'scholarship'`
  - `subscription_expires_at = '2099-12-31 23:59:59+00'`
- The `subscription_source` CHECK constraint must include 'scholarship' — added in `initScholarshipSchema()` via DROP/ADD CONSTRAINT pattern

## API routes (/api/scholarship/*)
Public (no auth):
- GET /current — current open exam metadata
- GET /exam/:id/questions — questions without solutions (only when open/graded)
- POST /submit — submit answers; MCQ auto-scored; UNIQUE(exam_id, email) prevents duplicates
- GET /winners — anonymised (first_name + last_initial)

Mentor-gated:
- GET /exams — all exams with submission counts
- POST /exam — create exam
- POST /exam/:id/question — add MCQ or short_answer question
- GET /exam/:id/questions/mentor — questions WITH correct_option
- DELETE /question/:qid — delete question
- PUT /exam/:id/status — status transition
- GET /exam/:id/submissions — all submissions for grading
- PUT /submission/:sid/score — set mentor_score
- POST /exam/:id/grant — rank + mark top 100 + apply lifetime subs + set status=graded

## Frontend
- `/scholarship` — public page (Overview, Take Exam, Hall of Fame tabs)
- Nav link added to home.tsx header (violet, between tutor title and Market)
- Mentor Portal: SCHOLARSHIP_MGMT tab — create exam, add questions, open/close, view+score submissions, grant top 100

## Key constraints
- One submission per email per exam (UNIQUE constraint + ON CONFLICT DO NOTHING)
- Exam must be 'closed' (not 'open') before grant is allowed
- Short answers need mentor_score set manually before grant makes sense
- Public questions endpoint strips correct_option; mentor endpoint includes it
