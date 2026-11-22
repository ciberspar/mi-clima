from clima_g.storage.settings import SettingsStore, data_directory


def test_windows_data_directory(tmp_path):
    result = data_directory(
        system="win32",
        environ={"APPDATA": "C:/Users/Test/AppData/Roaming"},
        home=tmp_path,
    )
    assert str(result).startswith("C:/Users/Test/AppData/Roaming")


def test_macos_data_directory(tmp_path):
    result = data_directory(
        system="darwin",
        environ={},
        home=tmp_path,
    )
    assert result == tmp_path / "Library" / "Application Support" / "Clima G"


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
