from unittest.mock import patch

import pytest

from clima_g.services.location.providers.geoclue import GeoClueProvider


def test_geoclue_name_and_priority():
    provider = GeoClueProvider()

    assert provider.name == "geoclue"
    assert provider.priority == 20


def test_geoclue_desktop_id():
    provider = GeoClueProvider("test.clima.g")

    assert provider.desktop_id == "test.clima.g"


def test_geoclue_is_unavailable_without_dbus_next():
    provider = GeoClueProvider()

    with patch(
        "importlib.util.find_spec",
        return_value=None,
    ):
        assert provider.is_available() is False


def test_geoclue_locate_requires_dependency():
    provider = GeoClueProvider()

    with patch(
        "importlib.util.find_spec",
        return_value=None,
    ):
        with pytest.raises(RuntimeError, match="dbus-next"):
            provider.locate()


def test_default_accuracy_is_city_level():
    from pathlib import Path

    source = Path(
        "src/clima_g/services/location/providers/geoclue.py"
    ).read_text(encoding="utf-8")

    assert 'Variant("u", 4)' in source


def test_default_manager_registers_geoclue():
    from clima_g.services.location import LocationManager

    manager = LocationManager()

    names = [item.name for item in manager.providers]

    assert "gpsd" in names
    assert "geoclue" in names
