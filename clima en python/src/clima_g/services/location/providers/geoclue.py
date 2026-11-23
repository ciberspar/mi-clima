"""Proveedor GeoClue con conexión D-Bus persistente."""

import asyncio
import importlib.util

from clima_g.services.location.base import LocationProvider
from clima_g.services.location.models import Location


BUS_NAME = "org.freedesktop.GeoClue2"
MANAGER_PATH = "/org/freedesktop/GeoClue2/Manager"
MANAGER_INTERFACE = "org.freedesktop.GeoClue2.Manager"
CLIENT_INTERFACE = "org.freedesktop.GeoClue2.Client"
LOCATION_INTERFACE = "org.freedesktop.GeoClue2.Location"
PROPERTIES_INTERFACE = "org.freedesktop.DBus.Properties"


class GeoClueProvider(LocationProvider):
    name = "geoclue"
    priority = 20

    def __init__(self, desktop_id="com.climag.desktop"):
        self.desktop_id = desktop_id

    def is_available(self):
        if importlib.util.find_spec("dbus_next") is None:
            return False

        try:
            return asyncio.run(self._check_available())
        except Exception:
            return False

    async def _check_available(self):
        from dbus_next import BusType
        from dbus_next.aio import MessageBus

        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()

        try:
            await bus.introspect(BUS_NAME, MANAGER_PATH)
            return True
        finally:
            bus.disconnect()

    def locate(self, timeout=15):
        if importlib.util.find_spec("dbus_next") is None:
            raise RuntimeError(
                "Falta dbus-next. Instale clima-g[location-linux]."
            )

        try:
            return asyncio.run(
                asyncio.wait_for(
                    self._locate_async(timeout),
                    timeout=max(1, float(timeout)) + 5,
                )
            )
        except asyncio.TimeoutError:
            return None

    async def _locate_async(self, timeout):
        from dbus_next import BusType, Variant
        from dbus_next.aio import MessageBus

        bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        started = False
        client_path = None

        try:
            # La misma conexión permanece abierta durante toda la solicitud.
            manager_xml = await bus.introspect(
                BUS_NAME,
                MANAGER_PATH,
            )
            manager_object = bus.get_proxy_object(
                BUS_NAME,
                MANAGER_PATH,
                manager_xml,
            )
            manager = manager_object.get_interface(MANAGER_INTERFACE)

            client_path = await manager.call_get_client()

            client_xml = await bus.introspect(
                BUS_NAME,
                client_path,
            )
            client_object = bus.get_proxy_object(
                BUS_NAME,
                client_path,
                client_xml,
            )

            client = client_object.get_interface(CLIENT_INTERFACE)
            properties = client_object.get_interface(
                PROPERTIES_INTERFACE
            )

            await properties.call_set(
                CLIENT_INTERFACE,
                "DesktopId",
                Variant("s", self.desktop_id),
            )

            # Precisión de ciudad: suficiente para consultar el clima.
            await properties.call_set(
                CLIENT_INTERFACE,
                "RequestedAccuracyLevel",
                Variant("u", 4),
            )

            await properties.call_set(
                CLIENT_INTERFACE,
                "DistanceThreshold",
                Variant("u", 0),
            )

            await client.call_start()
            started = True

            deadline = asyncio.get_running_loop().time() + max(
                1,
                float(timeout),
            )

            while asyncio.get_running_loop().time() < deadline:
                location_variant = await properties.call_get(
                    CLIENT_INTERFACE,
                    "Location",
                )
                location_path = location_variant.value

                if location_path and location_path != "/":
                    location_xml = await bus.introspect(
                        BUS_NAME,
                        location_path,
                    )
                    location_object = bus.get_proxy_object(
                        BUS_NAME,
                        location_path,
                        location_xml,
                    )
                    location_properties = (
                        location_object.get_interface(
                            PROPERTIES_INTERFACE
                        )
                    )

                    latitude = (
                        await location_properties.call_get(
                            LOCATION_INTERFACE,
                            "Latitude",
                        )
                    ).value

                    longitude = (
                        await location_properties.call_get(
                            LOCATION_INTERFACE,
                            "Longitude",
                        )
                    ).value

                    accuracy = (
                        await location_properties.call_get(
                            LOCATION_INTERFACE,
                            "Accuracy",
                        )
                    ).value

                    return Location(
                        latitude=float(latitude),
                        longitude=float(longitude),
                        name="Ubicación del dispositivo",
                        source="geoclue",
                        accuracy_m=float(accuracy),
                    )

                await asyncio.sleep(0.5)

            return None

        finally:
            if started and client_path:
                try:
                    await client.call_stop()
                except Exception:
                    pass

            bus.disconnect()
