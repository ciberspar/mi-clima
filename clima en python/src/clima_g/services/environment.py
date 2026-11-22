"""Servicios geográficos y de eventos oficiales de Clima G."""

from typing import Any
import unicodedata

import requests


GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
GDACS_URL = "https://www.gdacs.org/xml/gdacs.geojson"
USGS_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/"
    "summary/all_day.geojson"
)

TIMEOUT = 15
USER_AGENT = "ClimaG/1.34.0"


class EnvironmentError(Exception):
    """Error controlado de los servicios geográficos y de eventos."""


class EnvironmentService:
    """Cliente común para las APIs geográficas y de eventos de Clima G."""

    def __init__(self, session=None, timeout=TIMEOUT):
        self.session = session or requests.Session()
        self.timeout = timeout

    @staticmethod
    def validate_coordinates(latitude, longitude):
        if not -90 <= latitude <= 90:
            raise ValueError("Latitud fuera de rango.")
        if not -180 <= longitude <= 180:
            raise ValueError("Longitud fuera de rango.")

    def _get_json(self, url, params=None, headers=None):
        try:
            response = self.session.get(
                url,
                params=params,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()

            if not isinstance(data, dict):
                raise EnvironmentError("La respuesta recibida no es válida.")

            return data

        except requests.Timeout as exc:
            raise EnvironmentError("El servicio tardó demasiado.") from exc
        except requests.RequestException as exc:
            raise EnvironmentError(
                f"No se pudo consultar el servicio: {exc}"
            ) from exc
        except ValueError as exc:
            raise EnvironmentError("La respuesta JSON no es válida.") from exc

    @staticmethod
    def _normalize(value):
        value = unicodedata.normalize("NFD", str(value or ""))
        value = "".join(
            char for char in value
            if unicodedata.category(char) != "Mn"
        )
        return value.casefold()

    def search_cities(self, query):
        """Busca ciudades con los parámetros utilizados por Clima G Web."""
        query = str(query).strip()

        if len(query) < 2:
            return []

        data = self._get_json(
            GEOCODING_URL,
            params={
                "name": query,
                "count": 100,
                "language": "es",
            },
        )

        results = data.get("results") or []

        if not isinstance(results, list):
            raise EnvironmentError("Los resultados de ciudades no son válidos.")

        term = self._normalize(query)

        filtered = [
            item for item in results
            if isinstance(item, dict)
            and any(
                term in self._normalize(item.get(field))
                for field in ("name", "admin1", "admin2", "country")
            )
            and self._valid_city(item)
        ]

        filtered.sort(
            key=lambda item: (
                not self._normalize(item.get("name")).startswith(term),
                self._normalize(item.get("name")),
            )
        )

        return filtered

    @staticmethod
    def _valid_city(item):
        try:
            latitude = float(item["latitude"])
            longitude = float(item["longitude"])
            return (
                -90 <= latitude <= 90
                and -180 <= longitude <= 180
            )
        except (KeyError, TypeError, ValueError):
            return False

    def reverse_geocode(self, latitude, longitude):
        """Obtiene el nombre de un lugar mediante Nominatim."""
        self.validate_coordinates(latitude, longitude)

        data = self._get_json(
            REVERSE_URL,
            params={
                "format": "json",
                "lat": latitude,
                "lon": longitude,
                "zoom": 10,
                "accept-language": "es",
            },
            headers={"User-Agent": USER_AGENT},
        )

        address = data.get("address") or {}

        if not isinstance(address, dict):
            address = {}

        return str(
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("suburb")
            or address.get("county")
            or data.get("display_name")
            or "Mi ubicación"
        )

    def get_gdacs_alerts(self, latitude, longitude):
        """Obtiene eventos GDACS cercanos, como hace la versión Web."""
        self.validate_coordinates(latitude, longitude)

        data = self._get_json(GDACS_URL)
        features = data.get("features") or []

        if not isinstance(features, list):
            raise EnvironmentError("Los eventos GDACS no son válidos.")

        nearby = []

        for feature in features:
            if not isinstance(feature, dict):
                continue

            geometry = feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []

            if len(coordinates) < 2:
                continue

            try:
                event_lon = float(coordinates[0])
                event_lat = float(coordinates[1])
            except (TypeError, ValueError):
                continue

            if (
                abs(latitude - event_lat) < 4.0
                and abs(longitude - event_lon) < 4.0
            ):
                nearby.append(feature)

        return nearby[:5]

    def get_usgs_earthquakes(self, latitude, longitude):
        """Obtiene sismos cercanos del feed diario oficial USGS."""
        self.validate_coordinates(latitude, longitude)

        data = self._get_json(USGS_URL)
        features = data.get("features") or []

        if not isinstance(features, list):
            raise EnvironmentError("Los eventos USGS no son válidos.")

        nearby = []

        for feature in features:
            if not isinstance(feature, dict):
                continue

            geometry = feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") or []

            if len(coordinates) < 2:
                continue

            try:
                event_lon = float(coordinates[0])
                event_lat = float(coordinates[1])
            except (TypeError, ValueError):
                continue

            if (
                abs(latitude - event_lat) < 4.5
                and abs(longitude - event_lon) < 4.5
            ):
                nearby.append(feature)

        return nearby
