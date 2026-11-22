import pytest

from clima_g.services.environment import (
    EnvironmentService,
    GEOCODING_URL,
    REVERSE_URL,
    GDACS_URL,
    USGS_URL,
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

    def get(self, url, params=None, headers=None, timeout=None):
        self.calls.append({
            "url": url,
            "params": params,
            "headers": headers,
            "timeout": timeout,
        })

        if url == GEOCODING_URL:
            return FakeResponse({
                "results": [
                    {
                        "name": "Cordoba",
                        "admin1": "Córdoba",
                        "country": "Argentina",
                        "latitude": -31.4135,
                        "longitude": -64.1810,
                    },
                    {
                        "name": "Buenos Aires",
                        "admin1": "Buenos Aires",
                        "country": "Argentina",
                        "latitude": -34.6037,
                        "longitude": -58.3816,
                    },
                ]
            })

        if url == REVERSE_URL:
            return FakeResponse({
                "address": {"city": "Córdoba"}
            })

        if url in (GDACS_URL, USGS_URL):
            return FakeResponse({
                "features": [
                    {
                        "geometry": {
                            "coordinates": [-64.18, -31.42]
                        },
                        "properties": {"name": "Evento cercano"},
                    },
                    {
                        "geometry": {
                            "coordinates": [10, 10]
                        },
                        "properties": {"name": "Evento lejano"},
                    },
                ]
            })

        raise AssertionError(f"URL inesperada: {url}")


def test_busqueda_ciudades():
    session = FakeSession()
    service = EnvironmentService(session=session)

    results = service.search_cities("cordoba")

    assert len(results) == 1
    assert results[0]["name"] == "Cordoba"

    call = session.calls[0]
    assert call["url"] == GEOCODING_URL
    assert call["params"] == {
        "name": "cordoba",
        "count": 100,
        "language": "es",
    }


def test_busqueda_corta_no_consulta_api():
    session = FakeSession()
    service = EnvironmentService(session=session)

    assert service.search_cities("a") == []
    assert session.calls == []


def test_geocodificacion_inversa():
    session = FakeSession()
    service = EnvironmentService(session=session)

    result = service.reverse_geocode(-31.4135, -64.1810)

    assert result == "Córdoba"

    call = session.calls[0]
    assert call["url"] == REVERSE_URL
    assert call["params"]["zoom"] == 10
    assert call["params"]["accept-language"] == "es"
    assert call["headers"]["User-Agent"]


def test_alertas_gdacs_cercanas():
    session = FakeSession()
    service = EnvironmentService(session=session)

    results = service.get_gdacs_alerts(-31.42, -64.18)

    assert len(results) == 1
    assert session.calls[0]["url"] == GDACS_URL


def test_sismos_usgs_cercanos():
    session = FakeSession()
    service = EnvironmentService(session=session)

    results = service.get_usgs_earthquakes(-31.42, -64.18)

    assert len(results) == 1
    assert session.calls[0]["url"] == USGS_URL


def test_rechaza_coordenadas_invalidas():
    service = EnvironmentService(session=FakeSession())

    with pytest.raises(ValueError):
        service.reverse_geocode(100, 0)

    with pytest.raises(ValueError):
        service.get_usgs_earthquakes(0, 200)


def test_resultados_vacios():
    class EmptySession:
        def get(self, url, params=None, headers=None, timeout=None):
            return FakeResponse({"results": []})

    service = EnvironmentService(session=EmptySession())

    assert service.search_cities("Cordoba") == []
