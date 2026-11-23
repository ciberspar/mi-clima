"""Geolocalización Wi-Fi opcional mediante BeaconDB."""

import re
import shutil
import subprocess
import sys

import requests

from clima_g.services.location.base import LocationProvider
from clima_g.services.location.models import Location


BEACONDB_URL = "https://api.beacondb.net/v1/geolocate"
USER_AGENT = "Clima-G-Desktop/1.34.0"

MAC_PATTERN = re.compile(
    r"(?i)([0-9a-f]{2}(?::[0-9a-f]{2}){5})"
)


class BeaconDBProvider(LocationProvider):
    name = "beacondb"
    priority = 30

    def __init__(
        self,
        enabled=False,
        consent=False,
        scanner=None,
        session=None,
    ):
        self.enabled = enabled is True
        self.consent = consent is True
        self.scanner = scanner or self._scan_wifi_linux
        self.session = session or requests.Session()

    def _scanner_available(self):
        if self.scanner != self._scan_wifi_linux:
            return callable(self.scanner)

        return (
            sys.platform.startswith("linux")
            and shutil.which("nmcli") is not None
        )

    def is_available(self):
        return (
            self.enabled
            and self.consent
            and self._scanner_available()
        )

    @staticmethod
    def _scan_wifi_linux():
        """Obtiene BSSID cercanos mediante NetworkManager."""
        if not sys.platform.startswith("linux"):
            return []

        if shutil.which("nmcli") is None:
            return []

        result = subprocess.run(
            [
                "nmcli",
                "--fields",
                "BSSID",
                "--mode",
                "tabular",
                "device",
                "wifi",
                "list",
                "--rescan",
                "yes",
            ],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        )

        if result.returncode != 0:
            return []

        networks = []

        for line in result.stdout.splitlines():
            match = MAC_PATTERN.search(line)

            if match:
                networks.append({
                    "macAddress": match.group(1).lower()
                })

        return networks

    @staticmethod
    def _valid_access_points(access_points):
        """Filtra identificadores inválidos y duplicados."""
        if not isinstance(access_points, list):
            return []

        valid = []
        seen = set()

        for item in access_points:
            if not isinstance(item, dict):
                continue

            mac = item.get("macAddress") or item.get("bssid")

            if not isinstance(mac, str):
                continue

            mac = mac.strip().lower()

            if not MAC_PATTERN.fullmatch(mac):
                continue

            first_octet = int(mac[:2], 16)

            # Descarta direcciones multicast, broadcast y nulas.
            if first_octet & 1:
                continue

            if mac == "00:00:00:00:00:00":
                continue

            if mac in seen:
                continue

            seen.add(mac)
            valid.append({"macAddress": mac})

        return valid[:30]

    def locate(self, timeout=10):
        if not self.enabled or not self.consent:
            raise PermissionError(
                "BeaconDB requiere activación y autorización explícitas."
            )

        if not self._scanner_available():
            return None

        access_points = self._valid_access_points(
            self.scanner()
        )

        if not access_points:
            return None

        payload = {
            "considerIp": False,
            "wifiAccessPoints": access_points,
        }

        response = self.session.post(
            BEACONDB_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
            },
            timeout=(3, max(1, float(timeout))),
        )

        if response.status_code == 404:
            return None

        response.raise_for_status()

        data = response.json()
        coordinates = data.get("location")

        if not isinstance(coordinates, dict):
            return None

        latitude = coordinates.get("lat")
        longitude = coordinates.get("lng")
        accuracy = data.get("accuracy")

        if latitude is None or longitude is None:
            return None

        if accuracy is not None:
            accuracy = float(accuracy)

        return Location(
            latitude=float(latitude),
            longitude=float(longitude),
            name="Ubicación estimada por Wi-Fi",
            source="beacondb",
            accuracy_m=accuracy,
        )
