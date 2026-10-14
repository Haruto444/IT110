const API_URL = "https://api.open-meteo.com/v1/forecast";

let useFahrenheit = false;
let currentField = null;
let weatherData = null;

let fields = JSON.parse(localStorage.getItem("farmcast-fields") || "[]");

const defaultField = {
    name: "Butuan City",
    latitude: 8.9492,
    longitude: 125.5436
};

function weatherDescription(code) {
    if (code === 0) return "Clear sky";
    if (code === 1) return "Mainly clear";
    if (code === 2) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if (code === 45 || code === 48) return "Foggy";
    if ([51, 53, 55].includes(code)) return "Drizzle";
    if ([56, 57].includes(code)) return "Freezing drizzle";
    if ([61, 63, 65].includes(code)) return "Rain";
    if ([66, 67].includes(code)) return "Freezing rain";
    if ([71, 73, 75, 77].includes(code)) return "Snow";
    if ([80, 81, 82].includes(code)) return "Rain showers";
    if ([85, 86].includes(code)) return "Snow showers";
    if (code === 95) return "Thunderstorm";
    if ([96, 99].includes(code)) return "Thunderstorm with hail";

    return "Unknown conditions";
}

function weatherIcon(code) {
    if (code === 0) return "☀️";
    if (code === 1 || code === 2) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return "🌧️";
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";

    return "🌦️";
}

function displayTemperature(celsius) {
    if (celsius === null || celsius === undefined) return "--";

    if (useFahrenheit) {
        return `${Math.round((celsius * 9 / 5 + 32) * 10) / 10}°F`;
    }

    return `${Math.round(celsius * 10) / 10}°C`;
}

function saveFields() {
    localStorage.setItem("farmcast-fields", JSON.stringify(fields));
}

function setStatus(message) {
    document.getElementById("status").textContent = message;
}

async function getWeather(latitude, longitude) {
    const params = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,

        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "rain",
            "weather_code",
            "wind_speed_10m",
            "uv_index"
        ].join(","),

        hourly: [
            "temperature_2m",
            "rain",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "uv_index"
        ].join(","),

        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "precipitation_sum",
            "sunrise",
            "sunset",
            "uv_index_max"
        ].join(","),

        timezone: "auto",
        forecast_days: "7"
    });

    try {
        const response = await fetch(`${API_URL}?${params}`);

        if (!response.ok) {
            throw new Error(`Weather request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Weather error:", error);
        return null;
    }
}

async function loadField(field) {
    currentField = field;

    setStatus("Loading weather...");
    document.getElementById("place").textContent = field.name;
    document.getElementById("big").textContent = "--";
    document.getElementById("line").textContent = "Getting the latest forecast...";

    const data = await getWeather(field.latitude, field.longitude);

    if (!data) {
        setStatus("Unable to load weather. Check your internet connection.");
        return;
    }

    weatherData = data;

    displayCurrentWeather(data, field);
    displayHourlyForecast(data);
    displayWeeklyForecast(data);
    displaySprayWindow(data);
    displayAlerts(data, field);

    setStatus("Weather updated successfully.");
    renderFields();
}

function displayCurrentWeather(data, field) {
    const current = data.current;

    document.getElementById("place").textContent = field.name;
    document.getElementById("big").textContent =
        displayTemperature(current.temperature_2m);

    document.getElementById("line").textContent =
        `${weatherDescription(current.weather_code)} · Feels like ${displayTemperature(current.apparent_temperature)}`;

    document.getElementById("icon").textContent =
        weatherIcon(current.weather_code);

    document.getElementById("now").innerHTML = `
        <div class="weather-stat">
            <span>💧 Humidity</span>
            <strong>${current.relative_humidity_2m}%</strong>
        </div>

        <div class="weather-stat">
            <span>💨 Wind</span>
            <strong>${current.wind_speed_10m} km/h</strong>
        </div>

        <div class="weather-stat">
            <span>🌧️ Rain</span>
            <strong>${current.precipitation} mm</strong>
        </div>

        <div class="weather-stat">
            <span>☀️ UV Index</span>
            <strong>${current.uv_index ?? "N/A"}</strong>
        </div>
    `;

    const updated = new Date(current.time);

    document.getElementById("upd").textContent =
        `Last updated: ${updated.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        })}`;
}

function displayHourlyForecast(data) {
    const hourly = data.hourly;
    const container = document.getElementById("hourly");

    container.innerHTML = "";

    const currentHour = new Date(data.current.time).getTime();

    let startIndex = hourly.time.findIndex(time =>
        new Date(time).getTime() >= currentHour
    );

    if (startIndex === -1) startIndex = 0;

    for (let i = startIndex; i < Math.min(startIndex + 8, hourly.time.length); i++) {
        const time = new Date(hourly.time[i]);

        const card = document.createElement("div");
        card.className = "hour-card";

        card.innerHTML = `
            <p>${time.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            })}</p>

            <div>${weatherIcon(hourly.weather_code[i])}</div>

            <strong>${displayTemperature(hourly.temperature_2m[i])}</strong>

            <p>🌧️ ${hourly.precipitation_probability[i] ?? 0}%</p>
        `;

        container.appendChild(card);
    }
}

function displayWeeklyForecast(data) {
    const daily = data.daily;
    const container = document.getElementById("week-grid");

    container.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(`${daily.time[i]}T12:00:00`);

        const dayName = i === 0
            ? "Today"
            : date.toLocaleDateString([], { weekday: "short" });

        const card = document.createElement("div");
        card.className = "week-card";

        card.innerHTML = `
            <strong>${dayName}</strong>

            <div class="week-icon">
                ${weatherIcon(daily.weather_code[i])}
            </div>

            <p>${weatherDescription(daily.weather_code[i])}</p>

            <strong>
                ${displayTemperature(daily.temperature_2m_max[i])}
            </strong>

            <p>
                Low: ${displayTemperature(daily.temperature_2m_min[i])}
            </p>

            <p>🌧️ ${daily.precipitation_probability_max[i] ?? 0}%</p>

            <p>Rain: ${daily.precipitation_sum[i] ?? 0} mm</p>
        `;

        container.appendChild(card);
    }
}

function isSpraySuitable(rainChance, windSpeed, temperature) {
    // These are example screening thresholds, not pesticide label rules.
    return rainChance < 30 &&
        windSpeed < 15 &&
        temperature >= 10 &&
        temperature <= 30;
}

function displaySprayWindow(data) {
    const hourly = data.hourly;
    const container = document.getElementById("hours");
    const verdict = document.getElementById("verdict");
    const key = document.getElementById("key");

    container.innerHTML = "";

    const currentHour = new Date(data.current.time).getTime();

    let startIndex = hourly.time.findIndex(time =>
        new Date(time).getTime() >= currentHour
    );

    if (startIndex === -1) startIndex = 0;

    let suitableHours = 0;

    // Display the next 15 hours as a simple suitability timeline.
    for (let i = startIndex; i < Math.min(startIndex + 15, hourly.time.length); i++) {
        const rainChance = hourly.precipitation_probability[i] ?? 0;
        const windSpeed = hourly.wind_speed_10m[i];
        const temperature = hourly.temperature_2m[i];

        const suitable = isSpraySuitable(
            rainChance,
            windSpeed,
            temperature
        );

        if (suitable) suitableHours++;

        const hour = document.createElement("span");
        hour.className = suitable ? "hour good" : "hour bad";
        hour.title =
            `${hourly.time[i]}: ${suitable ? "Potentially suitable" : "Conditions to check"}`;

        container.appendChild(hour);
    }

    if (suitableHours > 0) {
        verdict.textContent =
            `${suitableHours} of the next hours may be suitable based on the weather screening.`;
    } else {
        verdict.textContent =
            "No hours currently meet the basic weather screening. Check the forecast later.";
    }

    key.textContent =
        "Green = passes basic weather checks. Orange/red = check rain, wind, or temperature.";
}

function displayAlerts(data, field) {
    const current = data.current;
    const daily = data.daily;
    const container = document.getElementById("alerts-list");

    container.innerHTML = "";

    document.getElementById("alert-for").textContent =
        `Weather alerts for ${field.name}`;

    const alerts = [];

    if (current.wind_speed_10m >= 20) {
        alerts.push({
            title: "Strong wind",
            message: "Wind is elevated. Check pesticide label limits and avoid spraying when drift may occur."
        });
    }

    if (current.precipitation >= 5 || current.rain >= 5) {
        alerts.push({
            title: "Rain currently reported",
            message: "Check field drainage and postpone activities that should not take place during rain."
        });
    }

    if (daily.precipitation_sum[0] >= 20) {
        alerts.push({
            title: "Heavy rainfall forecast",
            message: "Rainfall may affect field access and drainage. Plan work with local conditions in mind."
        });
    }

    if (current.uv_index >= 8) {
        alerts.push({
            title: "Very high UV index",
            message: "Consider shade, protective clothing, and breaks during outdoor work."
        });
    }

    if (alerts.length === 0) {
        alerts.push({
            title: "No basic weather flags detected",
            message: "Continue checking forecasts and official local weather advisories."
        });
    }

    for (const alert of alerts) {
        const item = document.createElement("div");
        item.className = "alert-card";

        const title = document.createElement("strong");
        title.textContent = alert.title;

        const message = document.createElement("p");
        message.textContent = alert.message;

        item.append(title, message);
        container.appendChild(item);
    }

    const note = document.createElement("p");
    note.textContent =
        "These are general weather-based reminders, not official severe-weather warnings. Follow PAGASA bulletins and product labels.";
    container.appendChild(note);
}

function renderFields() {
    const container = document.getElementById("fields");
    container.innerHTML = "";

    const allFields = [defaultField, ...fields];

    allFields.forEach((field, index) => {
        const button = document.createElement("button");
        button.className = "chip";
        button.textContent = field.name;

        if (currentField &&
            currentField.latitude === field.latitude &&
            currentField.longitude === field.longitude) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => loadField(field));
        container.appendChild(button);
    });

    document.getElementById("pin").hidden = !currentField ||
        allFields.some(field =>
            field.latitude === currentField.latitude &&
            field.longitude === currentField.longitude &&
            field !== defaultField
        );

    document.getElementById("unpin").hidden = !currentField ||
        !fields.some(field =>
            field.latitude === currentField.latitude &&
            field.longitude === currentField.longitude
        );
}

function locateUser() {
    if (!navigator.geolocation) {
        setStatus("Your browser does not support location services.");
        return;
    }

    setStatus("Requesting your location...");

    navigator.geolocation.getCurrentPosition(
        async position => {
            const field = {
                name: "My Current Location",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            await loadField(field);
            setStatus("Location found. You can pin it as a field.");
            document.getElementById("pin").hidden = false;
        },
        error => {
            if (error.code === error.PERMISSION_DENIED) {
                setStatus("Location access was denied. Allow location access in your browser.");
            } else {
                setStatus("Unable to get your location. Try again or use Butuan City.");
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}

document.getElementById("locate").addEventListener("click", locateUser);

document.getElementById("pin").addEventListener("click", () => {
    if (!currentField) return;

    const alreadyPinned = fields.some(field =>
        field.latitude === currentField.latitude &&
        field.longitude === currentField.longitude
    );

    if (alreadyPinned) {
        setStatus("This field is already pinned.");
        return;
    }

    const field = {
        ...currentField,
        name: `Field ${fields.length + 1}`
    };

    fields.push(field);
    saveFields();
    renderFields();
    setStatus(`${field.name} pinned successfully.`);
});

document.getElementById("unpin").addEventListener("click", () => {
    if (!currentField) return;

    const index = fields.findIndex(field =>
        field.latitude === currentField.latitude &&
        field.longitude === currentField.longitude
    );

    if (index === -1) return;

    const removed = fields.splice(index, 1)[0];
    saveFields();

    currentField = defaultField;
    loadField(defaultField);

    setStatus(`${removed.name} removed.`);
});

document.getElementById("theme").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    document.getElementById("theme").textContent =
        isDark ? "Light theme" : "Dark theme";
});

const unitButton = document.createElement("button");
unitButton.className = "theme";
unitButton.textContent = "°C / °F";
unitButton.setAttribute("aria-label", "Switch temperature units");
document.querySelector("header nav").appendChild(unitButton);

unitButton.addEventListener("click", () => {
    useFahrenheit = !useFahrenheit;

    if (weatherData && currentField) {
        displayCurrentWeather(weatherData, currentField);
        displayHourlyForecast(weatherData);
        displayWeeklyForecast(weatherData);
    }
});

renderFields();
loadField(defaultField);