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
    """Guarda preferencias y ciudades de Clima G."""

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

    def set_location(self, latitude, longitude, name):
        location = {
            "latitude": float(latitude),
            "longitude": float(longitude),
            "name": str(name).strip(),
        }

        if not self._valid_location(location):
            raise ValueError("La ubicación no es válida.")

        data = self.load()
        data["location"] = location
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
