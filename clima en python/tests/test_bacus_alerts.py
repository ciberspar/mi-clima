import json

import pytest

from clima_g.services.bacus_alerts import BacusAlerts


@pytest.fixture
def alerts(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path))
    service = BacusAlerts()
    service.notify_command = None
    return service


@pytest.fixture
def current():
    return {
        "time": "2026-11-23T12:00",
        "temperature_2m": 25,
        "apparent_temperature": 26,
        "wind_speed_10m": 15,
        "weather_code": 0,
    }


@pytest.fixture
def hourly():
    return {
        "time": [
            "2026-11-23T12:00",
            "2026-11-23T13:00",
            "2026-11-23T14:00",
        ],
        "precipitation_probability": [10, 20, 30],
        "wind_speed_10m": [15, 20, 25],
        "weather_code": [0, 0, 0],
    }


def test_inicializacion(alerts):
    assert alerts.notify_command is None
    assert alerts.last_notifications == {}
    assert alerts.current_decree["emoji"] == "🐢"


def test_decreto_imperial(alerts, current, hourly):
    alerts.evaluate(current, hourly, "Córdoba", uv_index=9)

    assert alerts.current_decree["titulo"] == "Protección solar"


def test_datos_actuales_invalidos(alerts, hourly):
    alerts.evaluate(None, hourly, "Córdoba")
    assert alerts.last_notifications == {}


def test_datos_horarios_invalidos(alerts, current):
    alerts.evaluate(current, None, "Córdoba")
    assert alerts.current_decree


def test_deteccion_lluvia(alerts, current, hourly, monkeypatch):
    calls = []

    def fake_notify(*args):
        calls.append(args)
        return True

    monkeypatch.setattr(alerts, "notify", fake_notify)
    hourly["precipitation_probability"] = [10, 75, 30]

    alerts.evaluate(current, hourly, "Córdoba")

    assert any(call[0] == "lluvia" for call in calls)


def test_deteccion_tormenta(alerts, current, hourly, monkeypatch):
    calls = []

    def fake_notify(*args):
        calls.append(args)
        return True

    monkeypatch.setattr(alerts, "notify", fake_notify)
    hourly["weather_code"] = [0, 95, 0]

    alerts.evaluate(current, hourly, "Córdoba")

    assert any(call[0] == "tormenta" for call in calls)


def test_deteccion_viento(alerts, current, hourly, monkeypatch):
    calls = []

    def fake_notify(*args):
        calls.append(args)
        return True

    monkeypatch.setattr(alerts, "notify", fake_notify)
    hourly["wind_speed_10m"] = [15, 60, 20]

    alerts.evaluate(current, hourly, "Córdoba")

    assert any(call[0] == "viento" for call in calls)


@pytest.mark.parametrize(
    ("temperature", "expected"),
    [
        (36, "calor"),
        (-1, "frio"),
    ],
)
def test_temperaturas_extremas(
    alerts, current, hourly, monkeypatch, temperature, expected
):
    calls = []

    def fake_notify(*args):
        calls.append(args)
        return True

    monkeypatch.setattr(alerts, "notify", fake_notify)
    current["temperature_2m"] = temperature

    alerts.evaluate(current, hourly, "Córdoba")

    assert any(call[0] == expected for call in calls)


def test_sin_notify_send(alerts):
    assert alerts.notify(
        "lluvia",
        "Prueba",
        "Mensaje de prueba",
        "Córdoba",
    ) is False


def test_carga_estado_persistido(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path))

    directory = tmp_path / "clima-g"
    directory.mkdir()
    state = {"lluvia|Córdoba": 1234567890}

    (directory / "bacus-alerts.json").write_text(
        json.dumps(state),
        encoding="utf-8",
    )

    service = BacusAlerts()

    assert service.last_notifications == state


def test_archivo_estado_invalido(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path))

    directory = tmp_path / "clima-g"
    directory.mkdir()

    (directory / "bacus-alerts.json").write_text(
        "{contenido inválido",
        encoding="utf-8",
    )

    service = BacusAlerts()

    assert service.last_notifications == {}


def test_guardado_estado(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path))

    service = BacusAlerts()
    service.last_notifications = {"lluvia|Córdoba": 123}

    service._save_state()

    saved = json.loads(service.state_file.read_text(encoding="utf-8"))

    assert saved == {"lluvia|Córdoba": 123}
