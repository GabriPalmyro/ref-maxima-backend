## STEP 9 — Mentor Views (Mentee Reports + Cards)

Add to existing `mentor.service.ts`:

- `getMenteeReports(mentorId, menteeId)`:
  - First verify mentee belongs to this mentor (findFirst where id AND mentorId)
  - If not found → throw NotFoundException
  - Return mentee's reports ordered by generatedAt asc

- `getMenteeReport(mentorId, menteeId, reportId)`:
  - Verify mentee belongs to mentor
  - Find report where id AND menteeId, include messageCards ordered by sortOrder
  - Return report

- `getMenteeCards(mentorId, menteeId)`:
  - Verify mentee belongs to mentor
  - Find all messageCards where menteeId, ordered by sortOrder
  - Return cards

Add routes to `mentor.controller.ts` (already has @Roles('mentor')):

```
GET /mentor/mentees/:menteeId/reports              → getMenteeReports
GET /mentor/mentees/:menteeId/reports/:reportId    → getMenteeReport
GET /mentor/mentees/:menteeId/message-cards        → getMenteeCards
```
