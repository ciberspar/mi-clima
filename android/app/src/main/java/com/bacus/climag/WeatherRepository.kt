
package com.bacus.climag

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

data class WeatherData(
    val temperature: Double?,
    val feelsLike: Double?,
    val humidity: Int?,
    val windSpeed: Double?,
    val windDirection: Double?,
    val pressure: Double?,
    val weatherCode: Int?,
    val cloudCover: Int?,
    val hourlyTimes: List<String>,
    val hourlyTemperatures: List<Double?>,
    val hourlyCodes: List<Int?>,
    val hourlyRainProbabilities: List<Int?>,
    val dailyDates: List<String>,
    val dailyMax: List<Double?>,
    val dailyMin: List<Double?>,
    val dailyRain: List<Double?>,
    val dailyUv: List<Double?>,
    val sunrise: List<String>,
    val sunset: List<String>,
    val moonrise: List<String>,
    val moonset: List<String>,
    val moonPhase: List<Double?>
)

data class AirQualityData(
    val europeanAqi: Double?,
    val pm10: Double?,
    val pm25: Double?,
    val carbonMonoxide: Double?
)

data class CityResult(
    val name: String,
    val country: String,
    val admin1: String,
    val latitude: Double,
    val longitude: Double
)

data class Earthquake(
    val place: String,
    val magnitude: Double,
    val depthKm: Double,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long
)

data class DisasterAlert(
    val title: String,
    val country: String,
    val eventType: String,
    val latitude: Double?,
    val longitude: Double?,
    val severity: String
)

object WeatherRepository {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS)
        .build()

    private suspend fun getJson(url: String): JSONObject =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "ClimaG-Android/0.3.0")
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException(
                        "Error HTTP ${response.code}"
                    )
                }

                val body = response.body?.string()
                    ?: throw IllegalStateException("Respuesta vacía")

                JSONObject(body)
            }
        }

    private fun JSONObject.numberOrNull(key: String): Double? {
        if (!has(key) || isNull(key)) return null
        val value = optDouble(key, Double.NaN)
        return value.takeIf { it.isFinite() }
    }

    private fun JSONObject.intOrNull(key: String): Int? {
        if (!has(key) || isNull(key)) return null
        val value = optDouble(key, Double.NaN)
        return if (value.isFinite()) value.toInt() else null
    }

    private fun JSONArray.doubles(): List<Double?> =
        (0 until length()).map { index ->
            if (isNull(index)) null
            else optDouble(index, Double.NaN)
                .takeIf { it.isFinite() }
        }

    private fun JSONArray.ints(): List<Int?> =
        (0 until length()).map { index ->
            if (isNull(index)) null
            else optDouble(index, Double.NaN)
                .takeIf { it.isFinite() }
                ?.toInt()
        }

    private fun JSONArray.strings(): List<String> =
        (0 until length()).map { optString(it, "") }

    suspend fun getForecast(
        latitude: Double,
        longitude: Double
    ): WeatherData {
        val url =
            "https://api.open-meteo.com/v1/forecast" +
            "?latitude=$latitude" +
            "&longitude=$longitude" +
            "&current=temperature_2m,relative_humidity_2m," +
            "apparent_temperature,wind_speed_10m,wind_direction_10m," +
            "surface_pressure,weather_code,cloud_cover" +
            "&hourly=temperature_2m,weather_code," +
            "precipitation_probability,wind_speed_10m" +
            "&daily=temperature_2m_max,temperature_2m_min," +
            "precipitation_sum,uv_index_max,sunrise,sunset," +
            "moonrise,moonset,moon_phase,weather_code" +
            "&past_days=1&timezone=auto"

        val json = getJson(url)
        val current = json.optJSONObject("current") ?: JSONObject()
        val hourly = json.optJSONObject("hourly") ?: JSONObject()
        val daily = json.optJSONObject("daily") ?: JSONObject()

        return WeatherData(
            temperature = current.numberOrNull("temperature_2m"),
            feelsLike = current.numberOrNull("apparent_temperature"),
            humidity = current.intOrNull("relative_humidity_2m"),
            windSpeed = current.numberOrNull("wind_speed_10m"),
            windDirection = current.numberOrNull("wind_direction_10m"),
            pressure = current.numberOrNull("surface_pressure"),
            weatherCode = current.intOrNull("weather_code"),
            cloudCover = current.intOrNull("cloud_cover"),

            hourlyTimes = hourly.optJSONArray("time")?.strings().orEmpty(),
            hourlyTemperatures = hourly.optJSONArray("temperature_2m")?.doubles().orEmpty(),
            hourlyCodes = hourly.optJSONArray("weather_code")?.ints().orEmpty(),
            hourlyRainProbabilities = hourly.optJSONArray("precipitation_probability")?.ints().orEmpty(),

            dailyDates = daily.optJSONArray("time")?.strings().orEmpty(),
            dailyMax = daily.optJSONArray("temperature_2m_max")?.doubles().orEmpty(),
            dailyMin = daily.optJSONArray("temperature_2m_min")?.doubles().orEmpty(),
            dailyRain = daily.optJSONArray("precipitation_sum")?.doubles().orEmpty(),
            dailyUv = daily.optJSONArray("uv_index_max")?.doubles().orEmpty(),
            sunrise = daily.optJSONArray("sunrise")?.strings().orEmpty(),
            sunset = daily.optJSONArray("sunset")?.strings().orEmpty(),
            moonrise = daily.optJSONArray("moonrise")?.strings().orEmpty(),
            moonset = daily.optJSONArray("moonset")?.strings().orEmpty(),
            moonPhase = daily.optJSONArray("moon_phase")?.doubles().orEmpty()
        )
    }

    suspend fun getAirQuality(
        latitude: Double,
        longitude: Double
    ): AirQualityData {
        val url =
            "https://air-quality-api.open-meteo.com/v1/air-quality" +
            "?latitude=$latitude&longitude=$longitude" +
            "&current=european_aqi,pm10,pm2_5,carbon_monoxide"

        val current = getJson(url).optJSONObject("current")
            ?: JSONObject()

        return AirQualityData(
            europeanAqi = current.numberOrNull("european_aqi"),
            pm10 = current.numberOrNull("pm10"),
            pm25 = current.numberOrNull("pm2_5"),
            carbonMonoxide = current.numberOrNull("carbon_monoxide")
        )
    }

    suspend fun searchCities(query: String): List<CityResult> {
        if (query.isBlank()) return emptyList()

        val encoded = URLEncoder.encode(query, "UTF-8")
        val url =
            "https://geocoding-api.open-meteo.com/v1/search" +
            "?name=$encoded&count=100&language=es"

        val results = getJson(url).optJSONArray("results")
            ?: return emptyList()

        return (0 until results.length()).mapNotNull { index ->
            val item = results.optJSONObject(index) ?: return@mapNotNull null

            CityResult(
                name = item.optString("name"),
                country = item.optString("country"),
                admin1 = item.optString("admin1"),
                latitude = item.optDouble("latitude", Double.NaN),
                longitude = item.optDouble("longitude", Double.NaN)
            ).takeIf {
                it.latitude.isFinite() && it.longitude.isFinite()
            }
        }
    }

    suspend fun reverseGeocode(
        latitude: Double,
        longitude: Double
    ): String {
        val url =
            "https://geocoding-api.open-meteo.com/v1/reverse" +
            "?latitude=$latitude&longitude=$longitude&language=es&format=json"

        val results = getJson(url).optJSONArray("results")
        val place = results?.optJSONObject(0) ?: return "Mi ubicación"

        return listOf(
            place.optString("name"),
            place.optString("admin1"),
            place.optString("country")
        ).filter { it.isNotBlank() }.distinct().joinToString(", ")
    }

    suspend fun getEarthquakes(): List<Earthquake> {
        val url =
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"

        val features = getJson(url).optJSONArray("features")
            ?: return emptyList()

        return (0 until features.length()).mapNotNull { index ->
            val feature = features.optJSONObject(index)
                ?: return@mapNotNull null
            val properties = feature.optJSONObject("properties")
                ?: return@mapNotNull null
            val geometry = feature.optJSONObject("geometry")
                ?: return@mapNotNull null
            val coordinates = geometry.optJSONArray("coordinates")
                ?: return@mapNotNull null

            if (coordinates.length() < 3) return@mapNotNull null

            val magnitude = properties.optDouble("mag", Double.NaN)
            if (!magnitude.isFinite()) return@mapNotNull null

            Earthquake(
                place = properties.optString("place", "Lugar desconocido"),
                magnitude = magnitude,
                depthKm = coordinates.optDouble(2),
                longitude = coordinates.optDouble(0),
                latitude = coordinates.optDouble(1),
                timestamp = properties.optLong("time")
            )
        }
    }

    suspend fun getDisasterAlerts(): List<DisasterAlert> {
        val json = getJson("https://www.gdacs.org/xml/gdacs.geojson")
        val features = json.optJSONArray("features") ?: return emptyList()

        return (0 until features.length()).mapNotNull { index ->
            val feature = features.optJSONObject(index)
                ?: return@mapNotNull null
            val properties = feature.optJSONObject("properties")
                ?: JSONObject()
            val geometry = feature.optJSONObject("geometry")
            val coordinates = geometry?.optJSONArray("coordinates")

            val latitude = coordinates?.let {
                if (it.length() >= 2) it.optDouble(1) else null
            }
            val longitude = coordinates?.let {
                if (it.length() >= 2) it.optDouble(0) else null
            }

            DisasterAlert(
                title = properties.optString(
                    "name",
                    properties.optString("eventname", "Alerta GDACS")
                ),
                country = properties.optString("country", ""),
                eventType = properties.optString("eventtype", ""),
                latitude = latitude,
                longitude = longitude,
                severity = properties.optString("alertlevel", "")
            )
        }
    }
}
