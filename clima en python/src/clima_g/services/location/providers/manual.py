"""Proveedor de ubicación manual."""

from clima_g.services.location.base import LocationProvider
from clima_g.services.location.models import Location


class ManualLocationProvider(LocationProvider):
    name = "manual"
    priority = 1000

    def __init__(self, location=None):
        self.location = location

    def set_location(self, latitude, longitude, name):
        self.location = Location(
            latitude=float(latitude),
            longitude=float(longitude),
            name=str(name).strip(),
            source="manual",
        )

    def is_available(self):
        return self.location is not None

    def locate(self, timeout=10):
        return self.location
