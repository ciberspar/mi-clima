import pytest

from clima_g.services.location import (
    Location,
    LocationManager,
    ManualLocationProvider,
)


def test_location_valid():
    location = Location(
        latitude=-31.4135,
        longitude=-64.1810,
        name="Córdoba",
        source="manual",
    )

    assert location.name == "Córdoba"
    assert location.source == "manual"
    assert location.timestamp is not None


@pytest.mark.parametrize(
    "latitude,longitude",
    [
        (91, 0),
        (-91, 0),
        (0, 181),
        (0, -181),
        (float("nan"), 0),
        (0, float("inf")),
    ],
)
def test_invalid_coordinates(latitude, longitude):
    with pytest.raises(ValueError):
        Location(
            latitude=latitude,
            longitude=longitude,
        )


def test_manual_provider():
    provider = ManualLocationProvider()

    assert not provider.is_available()

    provider.set_location(
        -31.4135,
        -64.1810,
        "Córdoba",
    )

    assert provider.is_available()

    location = provider.locate()

    assert location.latitude == -31.4135
    assert location.longitude == -64.1810
    assert location.source == "manual"


def test_manager_uses_available_provider():
    provider = ManualLocationProvider()

    manager = LocationManager([provider])
    manager.set_manual_location(
        -31.4135,
        -64.1810,
        "Córdoba",
    )

    location = manager.locate()

    assert location is not None
    assert location.name == "Córdoba"


def test_manager_continues_after_provider_failure():
    class BrokenProvider:
        name = "broken"
        priority = 1

        def is_available(self):
            return True

        def locate(self, timeout=10):
            raise RuntimeError("Proveedor desconectado")

    manual = ManualLocationProvider()
    manual.set_location(-31.4, -64.1, "Córdoba")

    manager = LocationManager([
        BrokenProvider(),
        manual,
    ])

    location = manager.locate()

    assert location is not None
    assert location.source == "manual"
    assert any("broken" in error for error in manager.errors)


def test_provider_status():
    provider = ManualLocationProvider()
    manager = LocationManager([provider])

    status = manager.get_provider_status()

    assert len(status) == 1
    assert status[0]["name"] == "manual"
    assert status[0]["available"] is False
