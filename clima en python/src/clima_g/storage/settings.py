"""Almacenamiento multiplataforma de Clima G."""

import json
import math
import os
import sys
from pathlib import Path

from clima_g.config import APP_NAME, DEFAULT_LOCATION


def data_directory(system=None, environ=None, home=None):
    """Devuelve el directorio de datos adecuado para cada sistema."""
    system = system or sys.platform
    environ = os.environ if environ is None else environ
    home = Path.home() if home is None else Path(home)

    if system.startswith("win"):
        base = environ.get("APPDATA") or environ.get("LOCALAPPDATA")
        if base:
            return Path(base) / APP_NAME
        return home / "AppData" / "Roaming" / APP_NAME

    if system == "darwin":
        return home / "Library" / "Application Support" / APP_NAME

    xdg = environ.get("XDG_DATA_HOME")
    if xdg and Path(xdg).is_absolute():
        return Path(xdg) / "clima-g"

    return home / ".local" / "share" / "clima-g"


class SettingsStore:
    """Guarda preferencias, ciudades y procedencia de ubicación."""

    def __init__(self, directory=None):
        self.directory = (
            Path(directory) if directory else data_directory()
        )
        self.file = self.directory / "settings.json"

    @staticmethod
    def defaults():
        return {
            "version": 1,
            "location": dict(DEFAULT_LOCATION),
            "location_metadata": {
                "source": "default",
                "accuracy_m": None,
                "timestamp": None,
            },
            "location_preferences": {
                "external_wifi_enabled": False,
                "external_wifi_provider": None,
                "external_wifi_consent": False,
            },
            "favorites": [],
        }

    def load(self):
        data = self.defaults()

        try:
            stored = json.loads(self.file.read_text(encoding="utf-8"))

            if not isinstance(stored, dict):
                return data

            location = stored.get("location")
            if self._valid_location(location):
                data["location"] = location

            metadata = stored.get("location_metadata")
            if isinstance(metadata, dict):
                source = metadata.get("source")
                accuracy = metadata.get("accuracy_m")
                timestamp = metadata.get("timestamp")

                if isinstance(source, str) and source.strip():
                    data["location_metadata"]["source"] = source

                if (
                    accuracy is None
                    or (
                        isinstance(accuracy, (int, float))
                        and math.isfinite(accuracy)
                        and accuracy >= 0
                    )
                ):
                    data["location_metadata"]["accuracy_m"] = accuracy

                if timestamp is None or isinstance(timestamp, str):
                    data["location_metadata"]["timestamp"] = timestamp

            preferences = stored.get("location_preferences")
            if isinstance(preferences, dict):
                consent = preferences.get("external_wifi_consent") is True
                provider = preferences.get("external_wifi_provider")

                if (
                    not isinstance(provider, str)
                    or not provider.strip()
                    or len(provider) > 64
                ):
                    provider = None
                else:
                    provider = provider.strip()

                enabled = (
                    preferences.get("external_wifi_enabled") is True
                    and consent
                    and provider is not None
                )

                data["location_preferences"] = {
                    "external_wifi_enabled": enabled,
                    "external_wifi_provider": provider,
                    "external_wifi_consent": consent,
                }

            favorites = stored.get("favorites")
            if isinstance(favorites, list):
                data["favorites"] = [
                    item for item in favorites
                    if self._valid_location(item)
                ]

            return data

        except (OSError, ValueError, TypeError):
            return data

    @staticmethod
    def _valid_location(location):
        if not isinstance(location, dict):
            return False

        try:
            latitude = float(location["latitude"])
            longitude = float(location["longitude"])
            name = location["name"]

            return (
                math.isfinite(latitude)
                and math.isfinite(longitude)
                and -90 <= latitude <= 90
                and -180 <= longitude <= 180
                and isinstance(name, str)
                and bool(name.strip())
            )
        except (KeyError, TypeError, ValueError):
            return False

    def save(self, data):
        if not isinstance(data, dict):
            raise ValueError("La configuración debe ser un diccionario.")

        self.directory.mkdir(parents=True, exist_ok=True)

        temporary = self.file.with_suffix(".tmp")
        content = json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        )

        try:
            temporary.write_text(content, encoding="utf-8")
            os.replace(temporary, self.file)
        finally:
            if temporary.exists():
                temporary.unlink()

    def get_location(self):
        return dict(self.load()["location"])

    def get_location_preferences(self):
        """Devuelve las preferencias de ubicación y privacidad."""
        return dict(self.load()["location_preferences"])

    def set_external_wifi_location(
        self,
        enabled,
        provider=None,
        consent=False,
    ):
        """Configura la ubicación Wi-Fi externa con autorización explícita."""
        if not isinstance(enabled, bool):
            raise ValueError("El estado debe ser verdadero o falso.")

        data = self.load()
        current = data["location_preferences"]

        if enabled:
            if consent is not True:
                raise PermissionError(
                    "Se necesita autorización explícita para activar "
                    "la geolocalización Wi-Fi externa."
                )

            if (
                not isinstance(provider, str)
                or not provider.strip()
                or len(provider.strip()) > 64
            ):
                raise ValueError("El proveedor seleccionado no es válido.")

            data["location_preferences"] = {
                "external_wifi_enabled": True,
                "external_wifi_provider": provider.strip(),
                "external_wifi_consent": True,
            }
        else:
            data["location_preferences"] = {
                "external_wifi_enabled": False,
                "external_wifi_provider": (
                    provider.strip()
                    if isinstance(provider, str) and provider.strip()
                    else current["external_wifi_provider"]
                ),
                "external_wifi_consent": current["external_wifi_consent"],
            }

        self.save(data)

    def revoke_external_wifi_consent(self):
        """Revoca la autorización y desactiva la ubicación externa."""
        data = self.load()
        data["location_preferences"] = {
            "external_wifi_enabled": False,
            "external_wifi_provider": None,
            "external_wifi_consent": False,
        }
        self.save(data)

    def get_location_metadata(self):
        return dict(self.load()["location_metadata"])

    def set_location(self, latitude, longitude, name):
        """Guarda una ubicación elegida manualmente."""
        location = {
            "latitude": float(latitude),
            "longitude": float(longitude),
            "name": str(name).strip(),
        }

        if not self._valid_location(location):
            raise ValueError("La ubicación no es válida.")

        data = self.load()
        data["location"] = location
        data["location_metadata"] = {
            "source": "manual",
            "accuracy_m": None,
            "timestamp": None,
        }
        self.save(data)

    def set_detected_location(self, location):
        """Guarda una ubicación obtenida por un proveedor automático."""
        if hasattr(location, "to_dict"):
            location = location.to_dict()

        if not isinstance(location, dict):
            raise ValueError("La ubicación detectada no es válida.")

        coordinates = {
            "latitude": float(location["latitude"]),
            "longitude": float(location["longitude"]),
            "name": str(
                location.get("name", "Ubicación detectada")
            ).strip(),
        }

        if not self._valid_location(coordinates):
            raise ValueError("Las coordenadas detectadas no son válidas.")

        source = location.get("source", "unknown")
        accuracy = location.get("accuracy_m")
        timestamp = location.get("timestamp")

        if not isinstance(source, str) or not source.strip():
            source = "unknown"

        if accuracy is not None:
            accuracy = float(accuracy)
            if not math.isfinite(accuracy) or accuracy < 0:
                accuracy = None

        if hasattr(timestamp, "isoformat"):
            timestamp = timestamp.isoformat()

        if timestamp is not None and not isinstance(timestamp, str):
            timestamp = None

        data = self.load()
        data["location"] = coordinates
        data["location_metadata"] = {
            "source": source,
            "accuracy_m": accuracy,
            "timestamp": timestamp,
        }
        self.save(data)

    def get_favorites(self):
        return [dict(item) for item in self.load()["favorites"]]

    def add_favorite(self, latitude, longitude, name):
        location = {
            "latitude": float(latitude),
            "longitude": float(longitude),
            "name": str(name).strip(),
        }

        if not self._valid_location(location):
            raise ValueError("La ciudad no es válida.")

        data = self.load()

        if not any(
            item["latitude"] == location["latitude"]
            and item["longitude"] == location["longitude"]
            for item in data["favorites"]
        ):
            data["favorites"].append(location)
            self.save(data)

    def remove_favorite(self, latitude, longitude):
        data = self.load()
        data["favorites"] = [
            item for item in data["favorites"]
            if not (
                item["latitude"] == float(latitude)
                and item["longitude"] == float(longitude)
            )
        ]
        self.save(data)
