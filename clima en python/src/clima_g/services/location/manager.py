"""Coordinador multiplataforma de proveedores de ubicación."""

from importlib.metadata import entry_points

from clima_g.services.location.providers import (
    BeaconDBProvider,
    GPSDProvider,
    GeoClueProvider,
    ManualLocationProvider,
)


class LocationManager:
    def __init__(self, providers=None, location_preferences=None):
        self.providers = list(providers or [])
        self.errors = []

        if providers is None:
            preferences = (
                location_preferences
                if isinstance(location_preferences, dict)
                else {}
            )

            external_enabled = (
                preferences.get("external_wifi_enabled") is True
                and preferences.get("external_wifi_consent") is True
                and preferences.get("external_wifi_provider") == "beacondb"
            )

            self.register(GPSDProvider())
            self.register(GeoClueProvider())

            self.register(
                BeaconDBProvider(
                    enabled=external_enabled,
                    consent=preferences.get(
                        "external_wifi_consent"
                    ) is True,
                )
            )

            self.register_plugins()

    def register(self, provider):
        if not any(
            item.name == provider.name
            for item in self.providers
        ):
            self.providers.append(provider)

        self.providers.sort(
            key=lambda item: getattr(item, "priority", 100)
        )

    def register_plugins(self):
        try:
            discovered = entry_points(
                group="clima_g.location_providers"
            )
        except TypeError:
            discovered = entry_points().get(
                "clima_g.location_providers",
                [],
            )

        for entry in discovered:
            try:
                self.register(entry.load()())
            except Exception as error:
                self.errors.append(
                    f"Plugin {entry.name}: {error}"
                )

    def available_providers(self):
        available = []

        for provider in self.providers:
            try:
                if provider.is_available():
                    available.append(provider.name)
            except Exception as error:
                self.errors.append(
                    f"{provider.name}: {error}"
                )

        return available

    def locate(self, timeout=10):
        self.errors.clear()

        for provider in self.providers:
            try:
                if not provider.is_available():
                    continue

                location = provider.locate(timeout=timeout)

                if location is not None:
                    return location

            except Exception as error:
                self.errors.append(
                    f"{provider.name}: {error}"
                )

        return None

    def set_manual_location(self, latitude, longitude, name):
        provider = next(
            (
                item for item in self.providers
                if isinstance(item, ManualLocationProvider)
            ),
            None,
        )

        if provider is None:
            provider = ManualLocationProvider()
            self.register(provider)

        provider.set_location(latitude, longitude, name)

    def get_provider_status(self):
        return [
            {
                "name": provider.name,
                "priority": provider.priority,
                "available": self._is_available(provider),
            }
            for provider in self.providers
        ]

    def _is_available(self, provider):
        try:
            return bool(provider.is_available())
        except Exception as error:
            self.errors.append(
                f"{provider.name}: {error}"
            )
            return False
