"""Proveedores incluidos de Clima G."""

from clima_g.services.location.providers.beacondb import BeaconDBProvider
from clima_g.services.location.providers.gpsd import GPSDProvider
from clima_g.services.location.providers.geoclue import GeoClueProvider
from clima_g.services.location.providers.manual import ManualLocationProvider

__all__ = [
    "BeaconDBProvider",
    "GPSDProvider",
    "GeoClueProvider",
    "ManualLocationProvider",
]
