/* =====================================================
   REAL TOURIST PLACES
   Images and descriptions from Wikipedia
===================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const placesGrid = document.getElementById("placesGrid");

    if (!placesGrid) return;

    const trip = readJSON(sessionStorage.getItem("tripRequirements"), {});
    let destination = String(trip.destination || "").trim();

    const FAVORITES_KEY = "favoritePlaces";
    const TRIP_PLACES_KEY = "selectedTripPlaces";

    let places = [];

    function readJSON(value, fallback) {
        try {
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function getSavedList(key) {
        const value = readJSON(localStorage.getItem(key), []);
        return Array.isArray(value) ? value : [];
    }

    function saveList(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    function normalizeName(value) {
        return String(value || "").trim().toLowerCase();
    }

    function isFavorite(place) {
        return getSavedList(FAVORITES_KEY).some(function (item) {
            const name =
                typeof item === "string"
                    ? item
                    : item && (
                        item.name ||
                        item.placeName ||
                        item.place_name ||
                        item.title
                    );

            return normalizeName(name) === normalizeName(place.name);
        });
    }

    function isAddedToTrip(place) {
        return getSavedList(TRIP_PLACES_KEY).some(function (item) {
            return normalizeName(item.name) === normalizeName(place.name);
        });
    }

    function escapeHTML(value) {
        return String(value || "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    const PLACE_CACHE_PREFIX = "aiTravelPlacesCache:";
    const PLACE_CACHE_TTL = 24 * 60 * 60 * 1000;
    function getCacheKey() {
        return PLACE_CACHE_PREFIX + normalizeName(destination);
    }

    function showMessage(message, allowRetry = true) {
        // Do not erase useful cards when a background refresh fails.
        if (places.length) return;
        placesGrid.innerHTML = "";
        const box = document.createElement("div");
        box.className = "places-status";
        const text = document.createElement("p");
        text.textContent = message;
        box.appendChild(text);
        if (allowRetry) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "place-add-button";
            button.textContent = "Try again";
            button.addEventListener("click", searchPlaces);
            box.appendChild(button);
        }
        placesGrid.appendChild(box);
    }

    function showLoading(message) {
        // Keep existing cards visible while refreshing in the background.
        if (places.length) return;
        placesGrid.innerHTML = "";
        const box = document.createElement("div");
        box.className = "places-status is-loading";
        box.setAttribute("role", "status");
        box.setAttribute("aria-live", "polite");
        const spinner = document.createElement("span");
        spinner.className = "places-loading-spinner";
        spinner.setAttribute("aria-hidden", "true");
        const text = document.createElement("span");
        text.textContent = message;
        box.append(spinner, text);
        placesGrid.appendChild(box);
    }

    function loadCachedPlaces() {
        try {
            const cached = readJSON(localStorage.getItem(getCacheKey()), null);
            if (!cached || !Array.isArray(cached.places)) return false;
            places = cached.places;
            renderPlaces();
            console.info("Showing saved tourist places for", destination);
            return true;
        } catch (error) {
            console.warn("Could not read saved places:", error);
            return false;
        }
    }

    function saveCachedPlaces(list) {
        try {
            localStorage.setItem(getCacheKey(), JSON.stringify({
                savedAt: Date.now(),
                places: list
            }));
        } catch (error) {
            console.warn("Could not save tourist places:", error);
        }
    }

    // All photograph searching and downloading happens on the Flask backend.
    // The browser displays the locally cached image URL returned by /api/places.

    /* =================================================
       SEARCH WIKIPEDIA - CACHE FIRST, THEN REFRESH
    ================================================= */

    let searchInProgress = false;
    let searchGeneration = 0;

    async function fetchWikipediaPlaces(searchDestination = destination) {
        const params = new URLSearchParams({
            action: "query", generator: "search",
            gsrsearch: `${searchDestination} tourist attractions India`,
            gsrnamespace: "0", gsrlimit: "15",
            prop: "pageimages|extracts|info", piprop: "thumbnail",
            pithumbsize: "800", exintro: "1", explaintext: "1",
            exsentences: "3", inprop: "url", format: "json", origin: "*"
        });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5500);
        try {
            const response = await fetch(
                "https://en.wikipedia.org/w/api.php?" + params,
                { signal: controller.signal }
            );
            if (!response.ok) throw new Error("Wikipedia search unavailable");
            const data = await response.json();
            return Object.values(data.query?.pages || {}).map(page => ({
                id: page.pageid,
                name: page.title,
                image: page.thumbnail?.source || "",
                description: page.extract || "Explore this attraction.",
                articleURL: page.fullurl || "",
                category: "Tourist attraction"
            })).filter(place => place.name);
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchOSMPlaces(searchDestination = destination) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25000);
        try {
            const response = await fetch(
                `/api/places?destination=${encodeURIComponent(searchDestination)}`,
                { headers: { "Accept": "application/json" }, signal: controller.signal }
            );
            if (!response.ok) throw new Error("Geoapify attraction search unavailable");
            const data = await response.json();
            return (data.places || []).map(item => ({
                id: item.id || item.name,
                name: item.name,
                image: item.image || "",
                description: item.description || item.category || "Explore this attraction.",
                articleURL: item.wikipedia_url || item.map_url || "",
                category: item.category || "Attraction",
                latitude: item.latitude,
                longitude: item.longitude,
                opening_hours: item.opening_hours || "",
                website: item.website || "",
                map_url: item.map_url || ""
            })).filter(place => place.name);
        } finally {
            clearTimeout(timer);
        }
    }

    function mergeProviderPlaces(osmPlaces, wikiPlaces) {
        const merged = [];
        const byName = new Map();

        // Keep OSM results first, then enrich matching attractions with Wikipedia images.
        for (const item of [...osmPlaces, ...wikiPlaces]) {
            const key = normalizeName(item.name).replace(/[^a-z0-9]/g, "");
            if (!key) continue;

            if (byName.has(key)) {
                const existing = byName.get(key);
                if (!existing.image && item.image) existing.image = item.image;
                if ((!existing.description || existing.description.length < 35) &&
                    item.description) existing.description = item.description;
                if (!existing.articleURL && item.articleURL) existing.articleURL = item.articleURL;
                continue;
            }

            const copy = { ...item };
            byName.set(key, copy);
            merged.push(copy);
        }

        return merged.slice(0, 18);
    }

    async function searchPlaces() {
        const requestedDestination = destination;
        if (!requestedDestination) {
            showMessage("Add a destination to your trip details first.", false);
            return;
        }

        const generation = ++searchGeneration;
        const hadPlaces = places.length > 0 || loadCachedPlaces();
        if (!hadPlaces) showLoading("Finding attractions…");

        try {
            const fresh = await fetchOSMPlaces(requestedDestination);

            // Ignore stale responses if the user changed destination while searching.
            if (generation !== searchGeneration || requestedDestination !== destination) return;

            if (fresh.length) {
                places = fresh;
                saveCachedPlaces(places);
                renderPlaces();
            } else if (places.length) {
                renderPlaces();
                showMessage("No new live attractions were found. Showing previously saved results.", false);
            } else {
                showMessage("No live attractions were found for this destination in India. Try a nearby city or a more specific destination.", true);
            }
        } catch (error) {
            if (generation !== searchGeneration) return;
            console.error("Geoapify attraction search failed:", error);
            if (places.length) {
                renderPlaces();
                console.warn("Showing cached attractions because the live search failed.");
            } else {
                showMessage("Live attractions are temporarily unavailable. Check your Geoapify API key or try again shortly.", true);
            }
        }
    }

    // Destination edits from the trip summary immediately refresh attractions.
    window.addEventListener("travel:destination-changed", function (event) {
        const nextDestination = String(event.detail?.destination || "").trim();
        if (!nextDestination || normalizeName(nextDestination) === normalizeName(destination)) return;

        destination = nextDestination;
        places = [];
        searchGeneration += 1; // invalidate any in-flight previous search
        searchPlaces();
    });

    /* =================================================
       DISPLAY PLACE CARDS
    ================================================= */

    function renderPlaces() {
        placesGrid.innerHTML = "";

        let lastGroup = "";
        places.forEach(function (place, index) {
            const group = place.place_type === "Famous Place" ? "Famous Places" : "Beautiful & Scenic Places";
            if (group !== lastGroup) {
                const heading = document.createElement("h2");
                heading.className = "place-results-group-heading";
                heading.textContent = group;
                placesGrid.appendChild(heading);
                lastGroup = group;
            }
            const card = document.createElement("article");
            card.className = "real-place-card";

            const imageArea = document.createElement("div");
            imageArea.className = "real-place-image";

            // Fixed-size thumbnail area. Never print a giant text placeholder.
            imageArea.innerHTML = '<div class="place-photo-loading" aria-label="Loading photograph"></div>';
            const initialPhoto = place.image || "";
            const setPhoto = (url) => {
                if (!url) {
                    imageArea.innerHTML = '<div class="place-photo-unavailable">📷<span>Photo unavailable</span></div>';
                    return;
                }
                const image = document.createElement("img");
                image.src = url;
                image.alt = place.name;
                image.loading = index < 9 ? "eager" : "lazy";
                image.decoding = "async";
                image.onerror = () => {
                    image.remove();
                    place.image = "";
                    imageArea.innerHTML = '<div class="place-photo-unavailable">📷<span>Photo could not be loaded</span></div>';
                };
                imageArea.replaceChildren(image);
                if (place.image_attribution_url) {
                    const attribution = document.createElement("a");
                    attribution.href = place.image_attribution_url;
                    attribution.target = "_blank";
                    attribution.rel = "noopener noreferrer";
                    attribution.className = "place-image-attribution";
                    attribution.textContent = "Photo source";
                    attribution.addEventListener("click", event => event.stopPropagation());
                    imageArea.appendChild(attribution);
                }
            };
            if (initialPhoto) setPhoto(initialPhoto);
            else imageArea.innerHTML = '<div class="place-photo-unavailable">📷<span>Searching for a photograph… refresh later if unavailable</span></div>';

            const content = document.createElement("div");
            content.className = "real-place-content";

            const typeBadge = document.createElement("span");
            typeBadge.className = "place-type-badge";
            typeBadge.textContent = place.place_type || "Tourist Attraction";

            const name = document.createElement("h3");
            name.textContent = place.name;

            const location = document.createElement("p");
            location.className = "real-place-location";
            location.textContent = "📍 " + destination;

            const timing = document.createElement("p");
            timing.className = "real-place-timing";
            timing.textContent = "🕒 Check official visiting hours";

            const actions = document.createElement("div");
            actions.className = "real-place-actions";

            const favoriteButton = document.createElement("button");
            favoriteButton.type = "button";
            favoriteButton.className = "place-heart-button";
            favoriteButton.textContent = isFavorite(place) ? "♥" : "♡";
            favoriteButton.classList.toggle("is-favorite", isFavorite(place));
            favoriteButton.setAttribute(
                "aria-label",
                isFavorite(place) ? "Remove favorite" : "Add to favorites"
            );
            favoriteButton.title = "Favorite";

            favoriteButton.addEventListener("click", function (event) {
                event.stopPropagation();
                toggleFavorite(place);
                renderPlaces();
            });

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "place-add-button";

            function updateAddButton() {
                const added = isAddedToTrip(place);
                addButton.textContent = added ? "✓ Added to Trip" : "+ Add to Trip";
                addButton.classList.toggle("is-added", added);
            }

            updateAddButton();

            addButton.addEventListener("click", function (event) {
                event.stopPropagation();
                toggleTripPlace(place);
                updateAddButton();
            });

            // Explicit See Details button
const detailsButton = document.createElement("button");
detailsButton.type = "button";
detailsButton.className = "place-details-button";
detailsButton.textContent = "See Details →";

detailsButton.addEventListener("click", function (event) {
    event.stopPropagation();
    openPlaceDetails(place);
});

// Card order: image, name, visiting hours, actions, details
actions.append(favoriteButton, addButton);

content.append(typeBadge, name, timing, actions, detailsButton);

card.append(imageArea, content);

            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute("aria-label", "View details for " + place.name);

            card.addEventListener("click", function () {
                openPlaceDetails(place);
            });

            card.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    openPlaceDetails(place);
                }
            });

            placesGrid.appendChild(card);
        });
    }

    /* =================================================
       FAVORITES
    ================================================= */

    function toggleFavorite(place) {
        const favorites = getSavedList(FAVORITES_KEY);
        const index = favorites.findIndex(function (item) {
            const name =
                typeof item === "string"
                    ? item
                    : item && (
                        item.name ||
                        item.placeName ||
                        item.place_name ||
                        item.title
                    );

            return normalizeName(name) === normalizeName(place.name);
        });

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.push({
                name: place.name,
                destination: destination,
                ...place,
                destination: destination
            });
        }

        saveList(FAVORITES_KEY, favorites);
    }

    /* =================================================
       ADD TO TRIP
    ================================================= */

    function toggleTripPlace(place) {
        const selected = getSavedList(TRIP_PLACES_KEY);

        const index = selected.findIndex(function (item) {
            return normalizeName(item.name) === normalizeName(place.name);
        });

        if (index >= 0) {
            selected.splice(index, 1);
        } else {
            selected.push({
                name: place.name,
                destination: destination,
                image: place.image,
                articleURL: place.articleURL,
                description: place.description
            });
        }

        saveList(TRIP_PLACES_KEY, selected);
    }

    /* =================================================
       PLACE DETAILS MODAL
    ================================================= */

    function createDetailsModal() {
        let modal = document.getElementById("placeDetailsModal");

        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "placeDetailsModal";
        modal.className = "place-details-modal";
        modal.setAttribute("aria-hidden", "true");

        modal.innerHTML = `
            <div class="place-details-panel" role="dialog"
                 aria-modal="true" aria-labelledby="placeDetailsTitle">

                <button type="button"
                        class="place-details-close"
                        aria-label="Close details">×</button>

                <div class="place-details-body"></div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener("click", function (event) {
            if (
                event.target === modal ||
                event.target.closest(".place-details-close")
            ) {
                closePlaceDetails();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closePlaceDetails();
        });

        return modal;
    }

    function openPlaceDetails(place) {
        const modal = createDetailsModal();
        const body = modal.querySelector(".place-details-body");

        const imageMarkup = place.image
            ? `<img class="place-details-image"
                    src="${escapeHTML(place.image)}"
                    alt="${escapeHTML(place.name)}">`
            : `<div class="place-details-image-fallback">🏞️</div>`;

        body.innerHTML = `
            ${imageMarkup}

            <div class="place-details-content">
                <p class="place-details-eyebrow">TRAVEL DESTINATION</p>

                <h2 id="placeDetailsTitle">
                    ${escapeHTML(place.name)}
                </h2>

                <p class="place-details-location">
                    📍 ${escapeHTML(destination)}
                </p>

                <section class="place-fact-section">
                    <h3>About this place</h3>
                    <p>
                        ${escapeHTML(
                            place.description ||
                            "A detailed description is not available in the source."
                        )}
                    </p>
                </section>

                <section class="place-fact-section">
                    <h3>History and significance</h3>
                    <p>
                        The available article may describe the history and
                        significance of this attraction. Open the source below
                        for more detailed historical information.
                    </p>
                </section>

                <section class="place-fact-section">
                    <h3>Visiting hours</h3>
                    <p>
                        Hours have not been verified here. Check the official
                        website or contact the site before travelling.
                    </p>
                </section>

                <div class="place-detail-links">
                    <a href="${escapeHTML(place.articleURL)}"
                       target="_blank" rel="noopener noreferrer">
                        Read source article ↗
                    </a>

                    <a href="https://www.google.com/maps/search/?api=1&query=${
                        encodeURIComponent(place.name + " " + destination)
                    }"
                       target="_blank" rel="noopener noreferrer">
                        Open map and directions ↗
                    </a>
                </div>

                <div class="place-details-actions">
                    <button type="button" class="place-heart-button details-heart">
                        ${isFavorite(place) ? "♥" : "♡"} Favorite
                    </button>

                    <button type="button" class="place-add-button details-add">
                        ${isAddedToTrip(place) ? "✓ Added to Trip" : "+ Add to Trip"}
                    </button>
                </div>

                <p class="place-source-note">
                    Article text and images are provided by Wikipedia.
                    Check official sources for current access rules and hours.
                </p>
            </div>
        `;

        const heartButton = body.querySelector(".details-heart");
        heartButton.classList.toggle("is-favorite", isFavorite(place));

        heartButton.addEventListener("click", function () {
            toggleFavorite(place);
            const favorite = isFavorite(place);
            heartButton.textContent = favorite ? "♥ Favorite" : "♡ Favorite";
            heartButton.classList.toggle("is-favorite", favorite);
            renderPlaces();
        });

        const addButton = body.querySelector(".details-add");

        addButton.addEventListener("click", function () {
            toggleTripPlace(place);

            addButton.textContent = isAddedToTrip(place)
                ? "✓ Added to Trip"
                : "+ Add to Trip";

            renderPlaces();
        });

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("place-modal-open");
    }

    function closePlaceDetails() {
        const modal = document.getElementById("placeDetailsModal");

        if (!modal) return;

        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("place-modal-open");
    }

    /* Refresh favorites if they change in another tab. */
    window.addEventListener("storage", function (event) {
        if (event.key === FAVORITES_KEY || event.key === TRIP_PLACES_KEY) {
            renderPlaces();
        }
    });

    searchPlaces();
});