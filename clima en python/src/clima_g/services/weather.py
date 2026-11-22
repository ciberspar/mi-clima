"""Motor meteorológico oficial de Clima G Python 1.34.0.

Reproduce las consultas meteorológicas utilizadas por Clima G Web.
"""

from typing import Any

import requests


FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

AIR_QUALITY_URL = (
    "https://air-quality-api.open-meteo.com/v1/air-quality"
)

TIMEOUT = 15

CURRENT_VARIABLES = (
    "temperature_2m,"
    "relative_humidity_2m,"
    "apparent_temperature,"
    "wind_speed_10m,"
    "wind_direction_10m,"
    "surface_pressure,"
    "weather_code,"
    "cloud_cover"
)

HOURLY_VARIABLES = (
    "temperature_2m,"
    "weather_code,"
    "precipitation_probability,"
    "wind_speed_10m"
)

DAILY_VARIABLES = (
    "temperature_2m_max,"
    "temperature_2m_min,"
    "precipitation_sum,"
    "uv_index_max,"
    "sunrise,"
    "sunset,"
    "moonrise,"
    "moonset,"
    "moon_phase,"
    "weather_code"
)

AIR_CURRENT_VARIABLES = (
    "european_aqi,"
    "pm10,"
    "pm2_5,"
    "carbon_monoxide"
)


class WeatherError(Exception):
    """Error controlado del motor meteorológico."""


class WeatherService:
    """Acceso a los servicios meteorológicos de Clima G."""

    def __init__(
        self,
        session: requests.Session | None = None,
        timeout: int = TIMEOUT,
    ):
        self.session = session or requests.Session()
        self.timeout = timeout

    @staticmethod
    def _validate_coordinates(latitude: float, longitude: float):
        if not -90 <= latitude <= 90:
            raise ValueError("Latitud fuera de rango.")

        if not -180 <= longitude <= 180:
            raise ValueError("Longitud fuera de rango.")

    def _get_json(
        self,
        url: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = self.session.get(
                url,
                params=params,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            if not isinstance(data, dict):
                raise WeatherError(
                    "La respuesta del servicio no es válida."
                )

            return data

        except requests.Timeout as exc:
            raise WeatherError(
                "El servicio meteorológico tardó demasiado."
            ) from exc

        except requests.RequestException as exc:
            raise WeatherError(
                f"No se pudo consultar el servicio: {exc}"
            ) from exc

        except ValueError as exc:
            raise WeatherError(
                "El servicio devolvió datos JSON inválidos."
            ) from exc

    def get_forecast(
        self,
        latitude: float,
        longitude: float,
    ) -> dict[str, Any]:
        """Obtiene clima actual, horario, diario e historial."""

        self._validate_coordinates(latitude, longitude)

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": CURRENT_VARIABLES,
            "hourly": HOURLY_VARIABLES,
            "daily": DAILY_VARIABLES,
            "past_days": 1,
            "timezone": "auto",
        }

        data = self._get_json(FORECAST_URL, params)

        required_sections = ("current", "hourly", "daily")

        for section in required_sections:
            if not isinstance(data.get(section), dict):
                raise WeatherError(
                    f"Faltan datos meteorológicos: {section}."
                )

        return data

    def get_air_quality(
        self,
        latitude: float,
        longitude: float,
    ) -> dict[str, Any]:
        """Obtiene calidad del aire con las variables de Clima G Web."""

        self._validate_coordinates(latitude, longitude)

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": AIR_CURRENT_VARIABLES,
        }

        data = self._get_json(AIR_QUALITY_URL, params)

        if not isinstance(data.get("current"), dict):
            raise WeatherError(
                "No hay datos actuales de calidad del aire."
            )

        return data

    def get_complete_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> dict[str, Any]:
        """Obtiene meteorología y calidad del aire."""

        forecast = self.get_forecast(latitude, longitude)

        air_quality = None
        air_quality_error = None

        try:
            air_quality = self.get_air_quality(
                latitude,
                longitude,
            )
        except WeatherError as exc:
            air_quality_error = str(exc)

        return {
            "weather": forecast,
            "air_quality": air_quality,
            "air_quality_error": air_quality_error,
            "latitude": latitude,
            "longitude": longitude,
        }
