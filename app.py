import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from flask import Flask, render_template, request

load_dotenv(override=True)

app = Flask(__name__)

TMDB_BASE_URL = "https://api.themoviedb.org/3"
POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"
REQUEST_TIMEOUT = 8
RESULTS_TO_SHOW = 8
# Skip titles with almost no votes so a 10/10 from a handful of people does not rank first.
MIN_VOTE_COUNT = 50
PLACEHOLDER_API_KEYS = {
    "your_tmdb_api_key_here",
    "paste_your_real_key_here",
}

# Used if the live genre endpoint is unavailable.
FALLBACK_GENRES = [
    {"id": 28, "name": "Action"},
    {"id": 12, "name": "Adventure"},
    {"id": 16, "name": "Animation"},
    {"id": 35, "name": "Comedy"},
    {"id": 80, "name": "Crime"},
    {"id": 99, "name": "Documentary"},
    {"id": 18, "name": "Drama"},
    {"id": 10751, "name": "Family"},
    {"id": 14, "name": "Fantasy"},
    {"id": 36, "name": "History"},
    {"id": 27, "name": "Horror"},
    {"id": 10402, "name": "Music"},
    {"id": 9648, "name": "Mystery"},
    {"id": 10749, "name": "Romance"},
    {"id": 878, "name": "Science Fiction"},
    {"id": 53, "name": "Thriller"},
    {"id": 10752, "name": "War"},
    {"id": 37, "name": "Western"},
]

# Mood is a class-friendly mapping, not an AI model.
# Multiple genres for one mood are combined with OR in the TMDB query.
MOOD_CHOICES = [
    ("funny", "Funny"),
    ("scary", "Scary"),
    ("romantic", "Romantic"),
    ("exciting", "Exciting"),
    ("thought-provoking", "Thought-provoking"),
    ("family-friendly", "Family-friendly"),
]
MOOD_TO_GENRE_NAMES = {
    "funny": ["Comedy"],
    "scary": ["Horror", "Thriller"],
    "romantic": ["Romance"],
    "exciting": ["Action", "Adventure"],
    "thought-provoking": ["Drama", "Science Fiction"],
    "family-friendly": ["Family", "Animation"],
}

RATING_CHOICES = ["", "5", "6", "7", "8"]

_genre_cache = None


def current_year():
    return datetime.now().year


def get_api_key():
    return os.getenv("TMDB_API_KEY", "").strip()


def has_api_key():
    key = get_api_key()
    return bool(key) and key.lower() not in PLACEHOLDER_API_KEYS


def get_genres():
    """Load TMDB genres once, then reuse them. Fall back to a local list if needed."""
    global _genre_cache
    if _genre_cache:
        return _genre_cache

    api_key = get_api_key()
    if not has_api_key():
        return FALLBACK_GENRES

    try:
        response = requests.get(
            f"{TMDB_BASE_URL}/genre/movie/list",
            params={"api_key": api_key, "language": "en-US"},
            timeout=REQUEST_TIMEOUT,
        )
        data = response.json()
        genres = data.get("genres")
        if response.ok and isinstance(genres, list) and genres:
            _genre_cache = genres
            return _genre_cache
    except (requests.RequestException, ValueError, TypeError):
        pass

    return FALLBACK_GENRES


def genre_ids_from_names(genre_list, names):
    name_to_id = {genre["name"].lower(): genre["id"] for genre in genre_list}
    ids = []
    for name in names:
        genre_id = name_to_id.get(name.lower())
        if genre_id is not None:
            ids.append(genre_id)
    return ids


def build_with_genres(selected_genre_id, mood_key, genre_list):
    """Turn form choices into TMDB's with_genres value.

    TMDB uses a comma for AND and a pipe for OR.
    Example: Action + Scary becomes 28,27|53  (Action AND (Horror OR Thriller)).
    """
    mood_ids = genre_ids_from_names(
        genre_list, MOOD_TO_GENRE_NAMES.get(mood_key, [])
    )

    if selected_genre_id and mood_ids:
        selected = int(selected_genre_id)
        if selected in mood_ids:
            return "|".join(str(genre_id) for genre_id in mood_ids)
        mood_part = "|".join(str(genre_id) for genre_id in mood_ids)
        return f"{selected},{mood_part}"
    if selected_genre_id:
        return str(selected_genre_id)
    if mood_ids:
        return "|".join(str(genre_id) for genre_id in mood_ids)
    return None


def parse_year(value, field_label):
    if value == "":
        return None, None
    try:
        year = int(value)
    except ValueError:
        return None, f"{field_label} must be a whole number, such as 2015."

    max_year = current_year() + 1
    if year < 1900 or year > max_year:
        return None, f"{field_label} must be between 1900 and {max_year}."
    return year, None


def parse_rating(value):
    if value == "":
        return None, None
    try:
        rating = float(value)
    except ValueError:
        return None, "Minimum rating must be a number between 0 and 10."
    if rating < 0 or rating > 10:
        return None, "Minimum rating must be between 0 and 10."
    return rating, None


def empty_form():
    return {
        "genre": "",
        "mood": "",
        "min_rating": "",
        "year_from": "",
        "year_to": "",
    }


def read_form():
    return {
        "genre": request.form.get("genre", "").strip(),
        "mood": request.form.get("mood", "").strip(),
        "min_rating": request.form.get("min_rating", "").strip(),
        "year_from": request.form.get("year_from", "").strip(),
        "year_to": request.form.get("year_to", "").strip(),
    }


def validate_form(form, genre_list):
    """Return (error_message, cleaned_values). cleaned_values is None when invalid."""
    valid_genre_ids = {str(genre["id"]) for genre in genre_list}
    valid_moods = set(MOOD_TO_GENRE_NAMES.keys())

    genre = form["genre"]
    mood = form["mood"]

    if genre and genre not in valid_genre_ids:
        return "Please choose a genre from the list.", None
    if mood and mood not in valid_moods:
        return "Please choose a mood from the list.", None

    min_rating, rating_error = parse_rating(form["min_rating"])
    if rating_error:
        return rating_error, None

    year_from, year_from_error = parse_year(form["year_from"], "Start year")
    if year_from_error:
        return year_from_error, None

    year_to, year_to_error = parse_year(form["year_to"], "End year")
    if year_to_error:
        return year_to_error, None

    if year_from is not None and year_to is not None and year_from > year_to:
        return "Start year cannot be later than end year.", None

    has_any_filter = any(
        [
            genre,
            mood,
            min_rating is not None,
            year_from is not None,
            year_to is not None,
        ]
    )
    if not has_any_filter:
        return "Please choose at least a genre, mood, minimum rating, or year range.", None

    return None, {
        "genre": genre,
        "mood": mood,
        "min_rating": min_rating,
        "year_from": year_from,
        "year_to": year_to,
    }


def build_discover_params(cleaned, genre_list):
    params = {
        "api_key": get_api_key(),
        "language": "en-US",
        "sort_by": "popularity.desc",
        "include_adult": False,
        "page": 1,
        "vote_count.gte": MIN_VOTE_COUNT,
    }

    with_genres = build_with_genres(cleaned["genre"], cleaned["mood"], genre_list)
    if with_genres:
        params["with_genres"] = with_genres

    if cleaned["min_rating"] is not None:
        params["vote_average.gte"] = cleaned["min_rating"]

    if cleaned["year_from"] is not None:
        params["primary_release_date.gte"] = f"{cleaned['year_from']}-01-01"
    if cleaned["year_to"] is not None:
        params["primary_release_date.lte"] = f"{cleaned['year_to']}-12-31"

    return params


def format_movie(raw_movie):
    release_date = raw_movie.get("release_date") or ""
    year = release_date[:4] if len(release_date) >= 4 else "Unknown"

    overview = (raw_movie.get("overview") or "").strip()
    if not overview:
        overview = "No overview available."

    poster_path = raw_movie.get("poster_path")
    poster_url = f"{POSTER_BASE_URL}{poster_path}" if poster_path else None

    vote_average = raw_movie.get("vote_average")
    try:
        rating = f"{float(vote_average):.1f}"
    except (TypeError, ValueError):
        rating = "N/A"

    return {
        "title": raw_movie.get("title") or "Untitled",
        "year": year,
        "rating": rating,
        "overview": overview,
        "poster_url": poster_url,
    }


def search_movies(form, genre_list):
    error, cleaned = validate_form(form, genre_list)
    if error:
        return error, None

    if not has_api_key():
        return (
            "The TMDB API key is missing. Add TMDB_API_KEY to your .env file and restart the app.",
            None,
        )

    params = build_discover_params(cleaned, genre_list)

    try:
        response = requests.get(
            f"{TMDB_BASE_URL}/discover/movie",
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        return "The movie service took too long to respond. Please try again.", None
    except requests.exceptions.ConnectionError:
        return (
            "Could not connect to TMDB. Check your internet connection and try again.",
            None,
        )
    except requests.RequestException:
        return "A network error occurred while fetching movies. Please try again.", None

    try:
        data = response.json()
    except ValueError:
        return "TMDB returned a response that was not valid JSON.", None

    if response.status_code == 401:
        return "The TMDB API key looks invalid. Check the value in your .env file.", None
    if response.status_code == 429:
        return "Too many requests were sent to TMDB. Please wait a moment and try again.", None
    if not response.ok:
        status_message = data.get("status_message") if isinstance(data, dict) else None
        if status_message:
            return f"TMDB could not complete the search: {status_message}", None
        return "TMDB returned an unexpected error. Please try again.", None

    if not isinstance(data, dict) or "results" not in data:
        return "TMDB returned an unexpected response, so no movies could be shown.", None

    results = data.get("results")
    if not isinstance(results, list):
        return "TMDB returned an unexpected response, so no movies could be shown.", None

    movies = [format_movie(item) for item in results if isinstance(item, dict)]
    movies = movies[:RESULTS_TO_SHOW]
    return None, movies


@app.route("/", methods=["GET", "POST"])
def index():
    genre_list = get_genres()
    form = empty_form()
    movies = None
    error = None

    if request.method == "POST":
        form = read_form()
        error, movies = search_movies(form, genre_list)

    return render_template(
        "index.html",
        form=form,
        genres=genre_list,
        moods=MOOD_CHOICES,
        rating_choices=RATING_CHOICES,
        movies=movies,
        error=error,
        current_year=current_year(),
        min_vote_count=MIN_VOTE_COUNT,
    )


if __name__ == "__main__":
    # macOS Control Center often occupies port 5000.
    app.run(debug=True, port=8000)
