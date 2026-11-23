import pytest

from clima_g.services.location.providers.beacondb import (
    BEACONDB_URL,
    BeaconDBProvider,
)
from clima_g.services.location.manager import LocationManager


class FakeResponse:
    status_code = 200

    def raise_for_status(self):
        pass

    def json(self):
        return {
            "location": {
                "lat": -31.4167,
                "lng": -64.1833,
            },
            "accuracy": 350,
        }


class FakeSession:
    def __init__(self):
        self.calls = []

    def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return FakeResponse()


def test_beacondb_disabled_by_default():
    provider = BeaconDBProvider()

    assert provider.is_available() is False


def test_beacondb_requires_consent():
    provider = BeaconDBProvider(
        enabled=True,
        consent=False,
        scanner=lambda: [],
    )

    assert provider.is_available() is False

    with pytest.raises(PermissionError):
        provider.locate()


def test_beacondb_does_not_scan_when_disabled():
    scans = []

    def scanner():
        scans.append(True)
        return []

    provider = BeaconDBProvider(scanner=scanner)

    assert provider.is_available() is False
    assert scans == []


def test_beacondb_filters_invalid_and_duplicate_macs():
    access_points = [
        {"macAddress": "AA:BB:CC:DD:EE:01"},
        {"macAddress": "AA:BB:CC:DD:EE:01"},
        {"macAddress": "invalid"},
        {"macAddress": "FF:FF:FF:FF:FF:FF"},
        {"macAddress": "00:00:00:00:00:00"},
        {"macAddress": "AA:BB:CC:DD:EE:02"},
    ]

    result = BeaconDBProvider._valid_access_points(access_points)

    assert result == [
        {"macAddress": "aa:bb:cc:dd:ee:01"},
        {"macAddress": "aa:bb:cc:dd:ee:02"},
    ]


def test_beacondb_sends_request_without_ip_fallback():
    session = FakeSession()

    provider = BeaconDBProvider(
        enabled=True,
        consent=True,
        scanner=lambda: [
            {"macAddress": "AA:BB:CC:DD:EE:01"},
            {"macAddress": "AA:BB:CC:DD:EE:02"},
        ],
        session=session,
    )

    location = provider.locate()

    assert location.source == "beacondb"
    assert location.latitude == pytest.approx(-31.4167)
    assert location.longitude == pytest.approx(-64.1833)
    assert location.accuracy_m == 350

    url, request = session.calls[0]

    assert url == BEACONDB_URL
    assert request["json"]["considerIp"] is False
    assert len(request["json"]["wifiAccessPoints"]) == 2
    assert "User-Agent" in request["headers"]


def test_beacondb_does_not_request_when_no_networks_exist():
    session = FakeSession()

    provider = BeaconDBProvider(
        enabled=True,
        consent=True,
        scanner=lambda: [],
        session=session,
    )

    assert provider.locate() is None
    assert session.calls == []


def test_manager_registers_beacondb_disabled_by_default():
    manager = LocationManager()

    provider = next(
        item for item in manager.providers
        if item.name == "beacondb"
    )

    assert provider.is_available() is False


def test_manager_enables_beacondb_only_with_consent():
    manager = LocationManager(
        location_preferences={
            "external_wifi_enabled": True,
            "external_wifi_consent": True,
            "external_wifi_provider": "beacondb",
        }
    )

    provider = next(
        item for item in manager.providers
        if item.name == "beacondb"
    )

    assert provider.enabled is True
    assert provider.consent is True


def test_manager_rejects_unknown_external_provider():
    manager = LocationManager(
        location_preferences={
            "external_wifi_enabled": True,
            "external_wifi_consent": True,
            "external_wifi_provider": "unknown",
        }
    )

    provider = next(
        item for item in manager.providers
        if item.name == "beacondb"
    )

    assert provider.enabled is False
