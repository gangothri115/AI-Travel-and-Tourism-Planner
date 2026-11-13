/* =====================================================
   AI TRAVEL PLANNING DASHBOARD
===================================================== */


document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =================================================
           GET SAVED TRIP
        ================================================= */

        const savedTrip =
            sessionStorage.getItem(
                "tripRequirements"
            );


        let trip = {};


        if (savedTrip) {

            try {

                trip =
                    JSON.parse(
                        savedTrip
                    );

            } catch (error) {

                console.error(
                    "Trip data error:",
                    error
                );

            }

        }


        console.log(
            "Trip requirements:",
            trip
        );



        /* =================================================
           HELPER
        ================================================= */

        function getValue(
            value,
            fallback
        ) {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                return fallback;

            }

            return value;

        }



        /* =================================================
           DISPLAY SUMMARY
        ================================================= */

        const fromLocation =
            document.getElementById(
                "fromLocation"
            );


        const destination =
            document.getElementById(
                "destination"
            );


        const tripDays =
            document.getElementById(
                "tripDays"
            );


        const transport =
            document.getElementById(
                "transport"
            );


        const budget =
            document.getElementById(
                "budget"
            );


        const travellers =
            document.getElementById(
                "travellers"
            );


        fromLocation.textContent =
            getValue(
                trip.from_location,
                "Not specified"
            );


        destination.textContent =
            getValue(
                trip.destination,
                "Not specified"
            );


        tripDays.textContent =
            trip.days
                ? `${trip.days} days`
                : "AI estimated";


        transport.textContent =
            getValue(
                trip.transport,
                "AI suggested"
            );


        budget.textContent =
            trip.budget
                ? `₹${trip.budget}`
                : "Flexible";


        travellers.textContent =
            getValue(
                trip.travellers,
                "Not specified"
            );

            

                    /* =================================================
           EDIT TRIP SUMMARY
        ================================================= */

        const editableFields = document.querySelectorAll(
            ".summary-item.editable[data-field]"
        );

        const displayElements = {
            from_location: fromLocation,
            destination: destination,
            days: tripDays,
            transport: transport,
            budget: budget,
            travellers: travellers
        };

        editableFields.forEach(function (item) {
            item.style.cursor = "pointer";

            item.addEventListener("click", function () {
                const field = item.dataset.field;

                const labels = {
                    from_location: "Starting location",
                    destination: "Destination",
                    days: "Number of days",
                    transport: "Transport (Car, Bike, Bus, Train, Flight)",
                    budget: "Budget in rupees",
                    travellers: "Number of travellers"
                };

                const currentValues = {
                    from_location: trip.from_location || "",
                    destination: trip.destination || "",
                    days: trip.days || "",
                    transport: trip.transport || "",
                    budget: trip.budget ?? "",
                    travellers: trip.travellers || ""
                };

                const answer = window.prompt(
                    "Edit " + labels[field] + ":",
                    currentValues[field]
                );

                // Cancel means leave the existing value unchanged.
                if (answer === null) return;

                const value = answer.trim();

                if (!value) {
                    alert("Please enter a value.");
                    return;
                }

                // Validate numeric fields.
                if (["days", "budget", "travellers"].includes(field)) {
                    const number = Number(value);

                    if (!Number.isFinite(number) || number < 0) {
                        alert("Please enter a valid positive number.");
                        return;
                    }

                    if (
                        field !== "budget" &&
                        (!Number.isInteger(number) || number < 1)
                    ) {
                        alert("Please enter a whole number greater than zero.");
                        return;
                    }

                    if (field === "budget" && !Number.isInteger(number)) {
                        alert("Please enter a whole-number budget.");
                        return;
                    }

                    trip[field] = number;
                } else {
                    trip[field] = value;
                }

                // Save the updated trip for this browser session.
                sessionStorage.setItem(
                    "tripRequirements",
                    JSON.stringify(trip)
                );

                // Update the displayed value.
                const display = displayElements[field];

                if (display) {
                    if (field === "days") {
                        display.textContent = trip.days + " days";
                    } else if (field === "budget") {
                        display.textContent = "₹" + trip.budget;
                    } else {
                        display.textContent = String(trip[field]);
                    }
                }

                console.log("Updated trip requirements:", trip);
            });
        });

        /* =================================================
           TAB SWITCHING
        ================================================= */

        const tabs =
            document.querySelectorAll(
                ".planning-tab"
            );


        const sections =
            document.querySelectorAll(
                ".tab-section"
            );


        tabs.forEach(
            function (tab) {

                tab.addEventListener(
                    "click",
                    function () {


                        const selectedTab =
                            tab.dataset.tab;


                        /* Remove active */

                        tabs.forEach(
                            function (item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                        sections.forEach(
                            function (section) {

                                section.classList.remove(
                                    "active"
                                );

                            }
                        );


                        /* Add active */

                        tab.classList.add(
                            "active"
                        );


                        const selectedSection =
                            document.getElementById(
                                `${selectedTab}-section`
                            );


                        if (selectedSection) {

                            selectedSection.classList.add(
                                "active"
                            );

                        }

                    }
                );

            }
        );



        /* =================================================
           PLACES
        ================================================= */

        const placesGrid =
            document.getElementById(
                "placesGrid"
            );


        const destinationName =
            getValue(
                trip.destination,
                "Your destination"
            );


        /*
         * These are temporary demonstration cards.
         *
         * Later these will come from the real
         * destination search API.
         */

        const places = [

            {
                name: "Popular Tourist Place",
                icon: "🏞️",
                description:
                    `Explore a popular attraction in ${destinationName}.`
            },

            {
                name: "Nature & Scenic Spot",
                icon: "🌄",
                description:
                    "Discover beautiful natural surroundings."
            },

            {
                name: "Cultural Attraction",
                icon: "🏛️",
                description:
                    "Explore the local culture and heritage."
            },

            {
                name: "Local Experience",
                icon: "📸",
                description:
                    "Experience something special at your destination."
            }

        ];


        places.forEach(
            function (place) {


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "place-card";


                card.innerHTML = `

                    <div class="place-top">
                        ${place.icon}
                    </div>

                    <div class="place-content">

                        <h3>
                            ${place.name}
                        </h3>

                        <p>
                            📍 ${destinationName}
                        </p>

                        <p>
                            ${place.description}
                        </p>

                        <button
                            class="favorite-button"
                            onclick="addFavorite('${place.name}')"
                        >
                             Add to Favorites
                        </button>

                    </div>

                `;


                placesGrid.appendChild(
                    card
                );

            }
        );



        /* =================================================
           WEATHER
        ================================================= */

        const weatherGrid =
            document.getElementById(
                "weatherGrid"
            );


        /*
         * Temporary weather cards.
         *
         * Later real weather API data
         * will replace these.
         */

        let numberOfDays =
            parseInt(
                trip.days
            );


        if (
            isNaN(numberOfDays) ||
            numberOfDays <= 0
        ) {

            numberOfDays = 3;

        }


        /*
         * Prevent creating hundreds
         * of cards if incorrect data
         * comes from the chatbot.
         */

        numberOfDays =
            Math.min(
                numberOfDays,
                15
            );


        for (
            let day = 1;
            day <= numberOfDays;
            day++
        ) {


            const weatherCard =
                document.createElement(
                    "div"
                );


            weatherCard.className =
                "weather-card";


            weatherCard.innerHTML = `

                <h3>
                    Day ${day}
                </h3>

                <div class="weather-symbol">
                    🌤️
                </div>

                <div class="temperature">
                    --
                </div>

                <p>
                    Weather data pending
                </p>

                <p>
                    ${destinationName}
                </p>

            `;


            weatherGrid.appendChild(
                weatherCard
            );

        }



        /* =================================================
           ROUTES
        ================================================= */

        const routesGrid =
            document.getElementById(
                "routesGrid"
            );


        const fromName =
            getValue(
                trip.from_location,
                "Starting location"
            );


        /*
         * Temporary route cards.
         *
         * Later these will be generated
         * using the actual route API.
         */

        const routes = [

            {
                title: "Route Option 1",
                type: "Fastest",
                path:
                    `${fromName} → ${destinationName}`,
                time:
                    "Travel time",
                toll:
                    "Toll information",
                cost:
                    "Estimated cost"
            },


            {
                title: "Route Option 2",
                type: "Alternative",
                path:
                    `${fromName} → ${destinationName}`,
                time:
                    "Travel time",
                toll:
                    "Toll information",
                cost:
                    "Estimated cost"
            },


            {
                title: "Route Option 3",
                type: "Low Toll",
                path:
                    `${fromName} → ${destinationName}`,
                time:
                    "Travel time",
                toll:
                    "Fewer tolls",
                cost:
                    "Estimated cost"
            }

        ];


        routes.forEach(
            function (route, index) {


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "route-card";


                card.innerHTML = `

                    <div class="route-header">

                        <h3>
                            ${route.title}
                        </h3>

                        <span class="route-type">
                            ${route.type}
                        </span>

                    </div>


                    <div class="route-path">

                        📍 ${route.path}

                    </div>


                    <div class="route-details">

                        <div class="route-detail">
                            ⏱️ ${route.time}
                        </div>

                        <div class="route-detail">
                            🛣️ ${route.toll}
                        </div>

                        <div class="route-detail">
                            💰 ${route.cost}
                        </div>

                        <div class="route-detail">
                            🚗 ${getValue(
                                trip.transport,
                                "Transport"
                            )}
                        </div>

                    </div>


                    <button
                        class="select-route"
                        onclick="selectRoute(${index})"
                    >
                        SELECT ROUTE
                    </button>

                `;


                routesGrid.appendChild(
                    card
                );

            }
        );



        /* =================================================
           MODIFY TRIP
        ================================================= */

        const continueButton =
            document.getElementById(
                "continueButton"
            );


        continueButton.addEventListener(
            "click",
            function () {

                const routesTab =
                    document.querySelector(
                        '[data-tab="routes"]'
                    );


                if (routesTab) {

                    routesTab.click();

                }

            }
        );


    }
);



/* =====================================================
   FAVORITES
===================================================== */

function addFavorite(
    placeName
) {

    let favorites =
        JSON.parse(
            localStorage.getItem(
                "favoritePlaces"
            ) || "[]"
        );


    if (
        !favorites.includes(
            placeName
        )
    ) {

        favorites.push(
            placeName
        );

    }


    localStorage.setItem(
        "favoritePlaces",
        JSON.stringify(
            favorites
        )
    );


    alert(
        `${placeName} ❤️ added to Favorites`
    );

}



/* =====================================================
   SELECT ROUTE
===================================================== */

function selectRoute(
    routeNumber
) {

    localStorage.setItem(
        "selectedRoute",
        routeNumber
    );


    alert(
        `Route ${routeNumber + 1} selected.`
    );


    /*
     * Later this button will:
     *
     * 1. Save the selected route
     * 2. Generate route-specific requirements
     * 3. Show hotels/restaurants
     * 4. Show petrol bunks for car/bike
     * 5. Generate itinerary
     */

}