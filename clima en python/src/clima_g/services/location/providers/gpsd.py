"""Proveedor GPS compatible con el protocolo JSON de gpsd."""

import json
import socket

from clima_g.services.location.base import LocationProvider
from clima_g.services.location.models import Location


class GPSDProvider(LocationProvider):
    name = "gpsd"
    priority = 10

    def __init__(self, host="127.0.0.1", port=2947):
        self.host = host
        self.port = int(port)

    def is_available(self):
        try:
            with socket.create_connection(
                (self.host, self.port),
                timeout=1,
            ):
                return True
        except OSError:
            return False

    def locate(self, timeout=10):
        connection = socket.create_connection(
            (self.host, self.port),
            timeout=max(1, float(timeout)),
        )

        try:
            connection.settimeout(max(1, float(timeout)))
            stream = connection.makefile(
                "r",
                encoding="utf-8",
                errors="replace",
            )

            connection.sendall(b'?WATCH={"enable":true,"json":true};\n')

            while True:
                line = stream.readline()

                if not line:
                    return None

                try:
                    message = json.loads(line)
                except (ValueError, TypeError):
                    continue

                if message.get("class") != "TPV":
                    continue

                mode = message.get("mode", 0)

                if mode < 2:
                    continue

                latitude = message.get("lat")
                longitude = message.get("lon")

                if latitude is None or longitude is None:
                    continue

                accuracy = None
                error = message.get("eph")

                if isinstance(error, (int, float)):
                    accuracy = float(error)

                return Location(
                    latitude=float(latitude),
                    longitude=float(longitude),
                    name="GPS",
                    source="gps",
                    accuracy_m=accuracy,
                )

        finally:
            connection.close()
