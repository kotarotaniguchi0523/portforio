# Test Cases

## Unit Tests (tests/calendar.test.js)
- **January 2025**: Generates 31 days with 3 leading blanks and fills to a multiple of 7.
- **Leap-year February 2024**: Produces 29 days, starts on Thursday, total grid length 35.
- **September 2024**: Month starting on Sunday results in no leading blanks and 5 trailing blanks.
- **March 2025**: Month starting on Saturday includes 6 leading blanks and fills trailing blanks to 42 cells.

## Integration Tests (tests/routes.test.js)
- **GET /calendar/stamp-modal/:date**: Returns modal HTML for a valid date and available lectures.
- **GET /calendar/stamp-modal/:date (invalid)**: Rejects badly formatted dates with 400.
- **GET /calendar/stamp-modal/:date (unauthorized)**: Missing user context returns 401.
- **POST /calendar/stamp**: Valid request adds a stamp and returns updated calendar grid.
- **POST /calendar/stamp (invalid)**: Malformed request data returns 400.
- **POST /calendar/stamp (unauthorized)**: Missing user context returns 401.
