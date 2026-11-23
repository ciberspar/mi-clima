"""Servicio independiente de Bacus Alerts."""

import logging
import os
import signal
import time
from pathlib import Path

from clima_g.services.bacus_alerts import BacusAlerts
from clima_g.services.weather import WeatherService
from clima_g.storage.settings import SettingsStore


INTERVAL_SECONDS = 15 * 60
running = True


def stop_service(signum, frame):
    global running
    running = False


def main():
    global running

    signal.signal(signal.SIGTERM, stop_service)
    signal.signal(signal.SIGINT, stop_service)

    state_home = Path(os.environ.get("XDG_STATE_HOME", str(Path.home() / ".local" / "state")))
    state_dir = state_home / "clima-g"
    state_dir.mkdir(parents=True, exist_ok=True)

    logging.basicConfig(
        filename=state_dir / "bacus-alerts.log",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    alerts = BacusAlerts()
    weather_service = WeatherService()
    settings = SettingsStore()

    logging.info("Bacus Alerts for Clima G Desktop iniciado.")

    while running:
        try:
            location = settings.get_location()
            latitude = float(location["latitude"])
            longitude = float(location["longitude"])
            location_name = location["name"]

            forecast = weather_service.get_forecast(latitude, longitude)

            current = forecast["current"]
            hourly = forecast["hourly"]
            daily = forecast.get("daily", {})

            uv_values = daily.get("uv_index_max", [])
            uv_index = uv_values[0] if uv_values else None

            alerts.evaluate(
                current,
                hourly,
                location_name,
                uv_index,
            )

            logging.info("Pronóstico consultado correctamente: %s", location_name)

        except Exception:
            logging.exception("Error al consultar o procesar el pronóstico.")

        for _ in range(INTERVAL_SECONDS):
            if not running:
                break
            time.sleep(1)

    logging.info("Bacus Alerts detenido.")


if __name__ == "__main__":
    main()
