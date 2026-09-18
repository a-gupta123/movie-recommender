# Prompt log

AI (Cursor) was used as a helper for this class assignment, not as a replacement for understanding the project.

## What AI was used for

- Understanding TMDB’s public API, especially the Discover Movie endpoint, genre IDs, and query parameters such as `with_genres`, `vote_average.gte`, `vote_count.gte`, and `primary_release_date`.
- Generating a simple Flask starter: `app.py`, the HTML form, CSS, `.gitignore`, `requirements.txt`, and README structure.
- Mapping form fields (genre, mood, rating, year range) to TMDB filters without using an LLM at runtime.
- Debugging and improving error handling for empty input, no matching movies, invalid API responses, network failures, and a missing TMDB API key.

## What stayed student-owned

- The assignment requirements, tech stack, and scope (Flask + HTML/CSS, no React/database/auth).
- The decision to use dropdowns and a small mood-to-genre dictionary instead of an AI recommendation model.
- Reviewing the generated code so it stays readable enough to explain in class.
- Adding a static `docs/` version so the same search UI can be hosted on GitHub Pages, which cannot run Flask.
