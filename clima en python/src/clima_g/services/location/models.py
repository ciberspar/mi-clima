"""Modelos comunes del motor de ubicación."""

from dataclasses import dataclass
from datetime import datetime, timezone
import math


@dataclass(frozen=True)
class Location:
    latitude: float
    longitude: float
    name: str = "Ubicación detectada"
    source: str = "unknown"
    accuracy_m: float | None = None
    timestamp: datetime | None = None

    def __post_init__(self):
        if not math.isfinite(self.latitude):
            raise ValueError("Latitud no válida.")

        if not math.isfinite(self.longitude):
            raise ValueError("Longitud no válida.")

        if not -90 <= self.latitude <= 90:
            raise ValueError("Latitud fuera de rango.")

        if not -180 <= self.longitude <= 180:
            raise ValueError("Longitud fuera de rango.")

        if not isinstance(self.name, str) or not self.name.strip():
            raise ValueError("El nombre de la ubicación está vacío.")

        if self.accuracy_m is not None:
            if not math.isfinite(self.accuracy_m) or self.accuracy_m < 0:
                raise ValueError("Precisión no válida.")

        if self.timestamp is None:
            object.__setattr__(
                self,
                "timestamp",
                datetime.now(timezone.utc),
            )

    def to_dict(self):
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "name": self.name,
            "source": self.source,
            "accuracy_m": self.accuracy_m,
            "timestamp": self.timestamp.isoformat(),
        }
