
const API_URL = "https://api.open-meteo.com/v1/forecast";

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
            "wind_speed_10m"
        ].join(","),

        hourly: [
            "temperature_2m",
            "rain",
            "soil_temperature_0cm",
            "soil_temperature_6cm",
            "relative_humidity_2m",
            "dew_point_2m",
            "precipitation_probability",
            "wind_speed_10m"
        ].join(","),

        daily: [
            "sunrise",
            "sunset",
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min"
        ].join(","),

        timezone: "Asia/Manila",
        forecast_days: "7"
    });

    try {
        const response = await fetch(`${API_URL}?${params}`);

        if (!response.ok) {
            throw new Error(
                `Failed to retrieve weather data. Status: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Current Weather:", data.current);
        console.log("Hourly Forecast:", data.hourly);
        console.log("Daily Forecast:", data.daily);

        return data;

    } catch (error) {
        console.error("Weather error:", error.message);
        return null;
    }
}

// Test using coordinates for Butuan City
getWeather(8.9492, 125.5436);


async function searchLocation(locationName) {
    const params = new URLSearchParams({
        name: locationName,
        count: "5",
        language: "en",
        format: "json",
        countryCode: "PH"
    });

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?${params}`
        );

        if (!response.ok) {
            throw new Error("Location search failed.");
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            console.log("No matching location found.");
            return [];
        }

        console.log("Matching locations:", data.results);

        return data.results.map(place => ({
            name: place.name,
            province: place.admin1,
            latitude: place.latitude,
            longitude: place.longitude,
            country: place.country
        }));
    } catch (error) {
        console.error(error.message);
        return [];
    }
}

// Test the search
searchLocation("Butuan");


function generateFarmAdvisories(weather) {
    const advisories = [];

    if (weather.precipitation_probability_max >= 70) {
        advisories.push({
            level: "Caution",
            title: "Rain Expected",
            message:
                "Check field drainage and monitor rainfall forecasts before planning farm activities."
        });
    }

    if (weather.temperature_2m_max >= 35) {
        advisories.push({
            level: "Caution",
            title: "High Temperature",
            message:
                "Monitor soil moisture and check crops for signs of heat stress."
        });
    }

    if (weather.wind_speed_10m >= 30) {
        advisories.push({
            level: "Caution",
            title: "Strong Winds",
            message:
                "Check crop supports and secure loose materials around the farm."
        });
    }

    if (advisories.length === 0) {
        advisories.push({
            level: "Information",
            title: "No Rule Triggered",
            message:
                "Continue monitoring the forecast and follow your usual farm maintenance practices."
        });
    }

    return advisories;
}
