import pytest

from clima_g.services.weather import (
    WeatherService,
    WeatherError,
    FORECAST_URL,
    AIR_QUALITY_URL,
)


class FakeResponse:

    def __init__(self, data):
        self.data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self.data


class FakeSession:

    def __init__(self):
        self.calls = []

    def get(self, url, params, timeout):
        self.calls.append({
            "url": url,
            "params": params,
            "timeout": timeout,
        })

        if url == FORECAST_URL:
            return FakeResponse({
                "current": {
                    "temperature_2m": 25,
                    "weather_code": 0,
                },
                "hourly": {
                    "temperature_2m": [25, 24],
                },
                "daily": {
                    "temperature_2m_max": [29],
                },
            })

        if url == AIR_QUALITY_URL:
            return FakeResponse({
                "current": {
                    "european_aqi": 25,
                    "pm10": 10,
                    "pm2_5": 5,
                    "carbon_monoxide": 100,
                }
            })

        raise AssertionError("URL inesperada")


def test_consulta_pronostico():
    session = FakeSession()
    service = WeatherService(session=session)

    data = service.get_forecast(-31.4135, -64.1810)

    assert data["current"]["temperature_2m"] == 25
    assert data["hourly"]["temperature_2m"] == [25, 24]
    assert data["daily"]["temperature_2m_max"] == [29]

    call = session.calls[0]

    assert call["url"] == FORECAST_URL
    assert call["params"]["past_days"] == 1
    assert call["params"]["timezone"] == "auto"


def test_consulta_calidad_aire():
    session = FakeSession()
    service = WeatherService(session=session)

    data = service.get_air_quality(-31.4135, -64.1810)

    assert data["current"]["european_aqi"] == 25
    assert data["current"]["pm2_5"] == 5

    assert session.calls[0]["url"] == AIR_QUALITY_URL


def test_rechaza_latitud_incorrecta():
    service = WeatherService(session=FakeSession())

    with pytest.raises(ValueError):
        service.get_forecast(120, -64)


def test_rechaza_longitud_incorrecta():
    service = WeatherService(session=FakeSession())

    with pytest.raises(ValueError):
        service.get_forecast(-31, 250)


def test_obtiene_meteorologia_y_calidad():
    session = FakeSession()
    service = WeatherService(session=session)

    data = service.get_complete_weather(-31.4135, -64.1810)

    assert data["weather"]["current"]["temperature_2m"] == 25
    assert data["air_quality"]["current"]["european_aqi"] == 25
    assert data["air_quality_error"] is None
    assert len(session.calls) == 2
