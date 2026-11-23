"""Interfaz común para proveedores de ubicación."""

from abc import ABC, abstractmethod

from clima_g.services.location.models import Location


class LocationProvider(ABC):
    name = "unknown"
    priority = 100

    @abstractmethod
    def is_available(self):
        """Indica si el proveedor puede utilizarse."""

    @abstractmethod
    def locate(self, timeout=10):
        """Obtiene una ubicación o devuelve None."""

    def describe(self):
        return self.name
