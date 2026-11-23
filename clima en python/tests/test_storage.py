
from pathlib import Path

from clima_g.config import APP_NAME
from clima_g.storage.settings import SettingsStore, data_directory


def test_windows_data_directory(tmp_path):
    result = data_directory(
        system="win32",
        environ={"APPDATA": "C:/Users/Test/AppData/Roaming"},
        home=tmp_path,
    )

    expected = Path("C:/Users/Test/AppData/Roaming") / APP_NAME
    assert result == expected


def test_macos_data_directory(tmp_path):
    result = data_directory(
        system="darwin",
        environ={},
        home=tmp_path,
    )
    assert result == tmp_path / "Library" / "Application Support" / APP_NAME


def test_linux_data_directory(tmp_path):
    result = data_directory(
        system="linux",
        environ={"XDG_DATA_HOME": str(tmp_path / "data")},
        home=tmp_path,
    )
    assert result == tmp_path / "data" / "clima-g"


def test_location_persistence(tmp_path):
    store = SettingsStore(tmp_path)
    store.set_location(-34.6037, -58.3816, "Buenos Aires")
    assert SettingsStore(tmp_path).get_location()["name"] == "Buenos Aires"


def test_favorites(tmp_path):
    store = SettingsStore(tmp_path)
    store.add_favorite(-34.6037, -58.3816, "Buenos Aires")
    store.add_favorite(-34.6037, -58.3816, "Buenos Aires")
    assert len(store.get_favorites()) == 1

    store.remove_favorite(-34.6037, -58.3816)
    assert store.get_favorites() == []


def test_invalid_location_rejected(tmp_path):
    store = SettingsStore(tmp_path)
    try:
        store.set_location(120, 200, "Ubicación incorrecta")
    except ValueError:
        pass
    else:
        raise AssertionError("Debió rechazar las coordenadas inválidas.")


def test_location_metadata_defaults(tmp_path):
    store = SettingsStore(tmp_path)
    metadata = store.get_location_metadata()

    assert metadata["source"] == "default"
    assert metadata["accuracy_m"] is None


def test_manual_location_records_source(tmp_path):
    store = SettingsStore(tmp_path)
    store.set_location(-31.4, -64.1, "Córdoba")

    metadata = store.get_location_metadata()
    assert metadata["source"] == "manual"


def test_detected_location_is_saved(tmp_path):
    from clima_g.services.location import Location

    store = SettingsStore(tmp_path)

    location = Location(
        latitude=-31.4135,
        longitude=-64.1810,
        name="Ubicación GPS",
        source="gps",
        accuracy_m=8.5,
    )

    store.set_detected_location(location)

    saved = store.get_location()
    metadata = store.get_location_metadata()

    assert saved["name"] == "Ubicación GPS"
    assert metadata["source"] == "gps"
    assert metadata["accuracy_m"] == 8.5
    assert metadata["timestamp"] is not None


def test_old_settings_remain_compatible(tmp_path):
    import json

    path = tmp_path / "settings.json"
    path.write_text(
        json.dumps({
            "version": 1,
            "location": {
                "latitude": -31.4,
                "longitude": -64.1,
                "name": "Córdoba",
            },
            "favorites": [],
        }),
        encoding="utf-8",
    )

    store = SettingsStore(tmp_path)

    assert store.get_location()["name"] == "Córdoba"
    assert store.get_location_metadata()["source"] == "default"
