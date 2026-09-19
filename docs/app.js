const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
const RESULTS_TO_SHOW = 8;
const MIN_VOTE_COUNT = 50;

const FALLBACK_GENRES = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
];

const MOOD_TO_GENRE_NAMES = {
    funny: ["Comedy"],
    scary: ["Horror", "Thriller"],
    romantic: ["Romance"],
    exciting: ["Action", "Adventure"],
    "thought-provoking": ["Drama", "Science Fiction"],
    "family-friendly": ["Family", "Animation"],
};

const form = document.getElementById("search-form");
const genreSelect = document.getElementById("genre");
const yearFromInput = document.getElementById("year-from");
const yearToInput = document.getElementById("year-to");
const statusBox = document.getElementById("status");
const resultsBox = document.getElementById("results");

let genres = FALLBACK_GENRES;

function currentYear() {
    return new Date().getFullYear();
}

function getApiKey() {
    return (window.TMDB_API_KEY || "").trim();
}

function hasApiKey() {
    return Boolean(getApiKey());
}

function showStatus(message, type) {
    statusBox.innerHTML = "";
    resultsBox.hidden = true;
    resultsBox.innerHTML = "";
    if (!message) {
        return;
    }
    const banner = document.createElement("p");
    banner.className = `banner ${type}`;
    banner.setAttribute("role", type === "error" ? "alert" : "status");
    banner.textContent = message;
    statusBox.appendChild(banner);
}

function genreIdsFromNames(names) {
    const nameToId = {};
    genres.forEach((genre) => {
        nameToId[genre.name.toLowerCase()] = genre.id;
    });
    return names
        .map((name) => nameToId[name.toLowerCase()])
        .filter((id) => id !== undefined);
}

function buildWithGenres(selectedGenreId, moodKey) {
    const moodIds = genreIdsFromNames(MOOD_TO_GENRE_NAMES[moodKey] || []);

    if (selectedGenreId && moodIds.length) {
        const selected = Number(selectedGenreId);
        if (moodIds.includes(selected)) {
            return moodIds.join("|");
        }
        return `${selected},${moodIds.join("|")}`;
    }
    if (selectedGenreId) {
        return String(selectedGenreId);
    }
    if (moodIds.length) {
        return moodIds.join("|");
    }
    return null;
}

function parseYear(value, fieldLabel) {
    if (value === "") {
        return { year: null, error: null };
    }
    const year = Number(value);
    const maxYear = currentYear() + 1;
    if (!Number.isInteger(year)) {
        return { year: null, error: `${fieldLabel} must be a whole number, such as 2015.` };
    }
    if (year < 1900 || year > maxYear) {
        return { year: null, error: `${fieldLabel} must be between 1900 and ${maxYear}.` };
    }
    return { year, error: null };
}

function parseRating(value) {
    if (value === "") {
        return { rating: null, error: null };
    }
    const rating = Number(value);
    if (Number.isNaN(rating)) {
        return { rating: null, error: "Minimum rating must be a number between 0 and 10." };
    }
    if (rating < 0 || rating > 10) {
        return { rating: null, error: "Minimum rating must be between 0 and 10." };
    }
    return { rating, error: null };
}

function validateForm(formValues) {
    const validGenreIds = new Set(genres.map((genre) => String(genre.id)));
    const validMoods = new Set(Object.keys(MOOD_TO_GENRE_NAMES));

    if (formValues.genre && !validGenreIds.has(formValues.genre)) {
        return { error: "Please choose a genre from the list." };
    }
    if (formValues.mood && !validMoods.has(formValues.mood)) {
        return { error: "Please choose a mood from the list." };
    }

    const ratingResult = parseRating(formValues.minRating);
    if (ratingResult.error) {
        return { error: ratingResult.error };
    }

    const fromResult = parseYear(formValues.yearFrom, "Start year");
    if (fromResult.error) {
        return { error: fromResult.error };
    }

    const toResult = parseYear(formValues.yearTo, "End year");
    if (toResult.error) {
        return { error: toResult.error };
    }

    if (fromResult.year !== null && toResult.year !== null && fromResult.year > toResult.year) {
        return { error: "Start year cannot be later than end year." };
    }

    const hasAnyFilter = Boolean(
        formValues.genre ||
        formValues.mood ||
        ratingResult.rating !== null ||
        fromResult.year !== null ||
        toResult.year !== null
    );
    if (!hasAnyFilter) {
        return { error: "Please choose at least one filter: a genre, mood, minimum rating, or year." };
    }

    return {
        error: null,
        cleaned: {
            genre: formValues.genre,
            mood: formValues.mood,
            minRating: ratingResult.rating,
            yearFrom: fromResult.year,
            yearTo: toResult.year,
        },
    };
}

function buildDiscoverUrl(cleaned) {
    const params = new URLSearchParams({
        api_key: getApiKey(),
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "false",
        page: "1",
        "vote_count.gte": String(MIN_VOTE_COUNT),
    });

    const withGenres = buildWithGenres(cleaned.genre, cleaned.mood);
    if (withGenres) {
        params.set("with_genres", withGenres);
    }
    if (cleaned.minRating !== null) {
        params.set("vote_average.gte", String(cleaned.minRating));
    }
    if (cleaned.yearFrom !== null) {
        params.set("primary_release_date.gte", `${cleaned.yearFrom}-01-01`);
    }
    if (cleaned.yearTo !== null) {
        params.set("primary_release_date.lte", `${cleaned.yearTo}-12-31`);
    }

    return `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
}

function formatMovie(rawMovie) {
    const releaseDate = rawMovie.release_date || "";
    const year = releaseDate.length >= 4 ? releaseDate.slice(0, 4) : "Unknown";
    const overview = (rawMovie.overview || "").trim() || "No overview available.";
    const posterUrl = rawMovie.poster_path
        ? `${POSTER_BASE_URL}${rawMovie.poster_path}`
        : null;

    let rating = "N/A";
    const voteAverage = Number(rawMovie.vote_average);
    if (!Number.isNaN(voteAverage)) {
        rating = voteAverage.toFixed(1);
    }

    return {
        title: rawMovie.title || "Untitled",
        year,
        rating,
        overview,
        posterUrl,
    };
}

function renderMovies(movies) {
    statusBox.innerHTML = "";
    resultsBox.hidden = false;
    resultsBox.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = "Recommendations";
    resultsBox.appendChild(heading);

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = `Showing ${movies.length} popular titles with at least ${MIN_VOTE_COUNT} ratings.`;
    resultsBox.appendChild(hint);

    const list = document.createElement("ul");
    list.className = "movie-list";

    movies.forEach((movie) => {
        const item = document.createElement("li");
        item.className = "movie-card";

        if (movie.posterUrl) {
            const image = document.createElement("img");
            image.src = movie.posterUrl;
            image.alt = `Poster for ${movie.title}`;
            item.appendChild(image);
        } else {
            const fallback = document.createElement("div");
            fallback.className = "poster-fallback";
            fallback.setAttribute("aria-hidden", "true");
            fallback.textContent = "No poster";
            item.appendChild(fallback);
        }

        const body = document.createElement("div");
        body.className = "movie-body";

        const title = document.createElement("h3");
        title.textContent = movie.title;

        const meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = `${movie.year} · ★ ${movie.rating}`;

        const overview = document.createElement("p");
        overview.className = "overview";
        overview.textContent = movie.overview;

        body.append(title, meta, overview);
        item.appendChild(body);
        list.appendChild(item);
    });

    resultsBox.appendChild(list);
}

async function fetchFromTmdb(url) {
    let response;
    try {
        response = await fetch(url);
    } catch (error) {
        throw new Error("Could not connect to TMDB. Check your internet connection and try again.");
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error("TMDB returned a response that was not valid JSON.");
    }

    if (response.status === 401) {
        throw new Error("The movie service rejected this request. Please try again later.");
    }
    if (response.status === 429) {
        throw new Error("Too many requests were sent to TMDB. Please wait a moment and try again.");
    }
    if (!response.ok) {
        const statusMessage = data && data.status_message;
        if (statusMessage) {
            throw new Error(`TMDB could not complete the search: ${statusMessage}`);
        }
        throw new Error("TMDB returned an unexpected error. Please try again.");
    }

    return data;
}

function fillGenreOptions() {
    const selected = genreSelect.value;
    genreSelect.innerHTML = "";
    const anyOption = document.createElement("option");
    anyOption.value = "";
    anyOption.textContent = "Any genre";
    genreSelect.appendChild(anyOption);

    genres.forEach((genre) => {
        const option = document.createElement("option");
        option.value = String(genre.id);
        option.textContent = genre.name;
        genreSelect.appendChild(option);
    });

    if (selected) {
        genreSelect.value = selected;
    }
}

async function loadGenres() {
    if (!hasApiKey()) {
        genres = FALLBACK_GENRES;
        fillGenreOptions();
        return;
    }

    try {
        const data = await fetchFromTmdb(
            `${TMDB_BASE_URL}/genre/movie/list?api_key=${encodeURIComponent(getApiKey())}&language=en-US`
        );
        if (data && Array.isArray(data.genres) && data.genres.length) {
            genres = data.genres;
        } else {
            genres = FALLBACK_GENRES;
        }
    } catch (error) {
        genres = FALLBACK_GENRES;
    }
    fillGenreOptions();
}

async function handleSearch(event) {
    event.preventDefault();

    const validation = validateForm({
        genre: genreSelect.value.trim(),
        mood: document.getElementById("mood").value.trim(),
        minRating: document.getElementById("min-rating").value.trim(),
        yearFrom: yearFromInput.value.trim(),
        yearTo: yearToInput.value.trim(),
    });

    if (validation.error) {
        showStatus(validation.error, "error");
        return;
    }

    if (!hasApiKey()) {
        showStatus("The movie service is not configured, so searches cannot run.", "error");
        return;
    }

    showStatus("Finding movies…", "empty");

    try {
        const data = await fetchFromTmdb(buildDiscoverUrl(validation.cleaned));
        if (!data || !Array.isArray(data.results)) {
            showStatus("TMDB returned an unexpected response, so no movies could be shown.", "error");
            return;
        }

        const movies = data.results
            .filter((item) => item && typeof item === "object")
            .slice(0, RESULTS_TO_SHOW)
            .map(formatMovie);

        if (!movies.length) {
            showStatus(
                "No movies matched those filters. Try a wider year range, a lower rating, or a different genre or mood.",
                "empty"
            );
            return;
        }

        renderMovies(movies);
    } catch (error) {
        showStatus(error.message, "error");
    }
}

function setupYearInputs() {
    const maxYear = currentYear() + 1;
    yearFromInput.max = String(maxYear);
    yearToInput.max = String(maxYear);
    yearToInput.placeholder = `e.g. ${currentYear()}`;
}

setupYearInputs();
fillGenreOptions();
loadGenres();
form.addEventListener("submit", handleSearch);
