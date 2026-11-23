"""Bacus Alerts: notificaciones meteorológicas de Clima G."""

import json
import os
import shutil
import subprocess
import time
from pathlib import Path

from clima_g.services.baco import generar_decreto


class BacusAlerts:
    """Notificaciones meteorológicas con decretos imperiales y persistencia."""

    RAIN_THRESHOLD = 70
    WIND_THRESHOLD = 50
    HEAT_THRESHOLD = 35
    COLD_THRESHOLD = 0
    COOLDOWN_SECONDS = 3 * 60 * 60

    STORM_CODES = {95, 96, 99}

    def __init__(self):
        self.notify_command = shutil.which("notify-send")
        self.icon_path = (
            Path(__file__).resolve().parents[1]
            / "assets"
            / "favicon.svg"
        )

        state_home = Path(
            os.environ.get(
                "XDG_STATE_HOME",
                str(Path.home() / ".local" / "state")
            )
        )
        self.state_dir = state_home / "clima-g"
        self.state_file = self.state_dir / "bacus-alerts.json"

        self.last_notifications = self._load_state()
        self.current_decree = {
            "emoji": "🐢",
            "titulo": "Decreto imperial",
            "mensaje": "Baco ordena mantener la atención sobre el territorio."
        }

    def _load_state(self):
        try:
            data = json.loads(self.state_file.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
        except (OSError, ValueError, TypeError):
            pass
        return {}

    def _save_state(self):
        try:
            self.state_dir.mkdir(parents=True, exist_ok=True)
            temporary = self.state_file.with_suffix(".tmp")
            temporary.write_text(
                json.dumps(self.last_notifications, indent=2),
                encoding="utf-8"
            )
            temporary.replace(self.state_file)
        except OSError:
            pass

    @staticmethod
    def _number(value):
        try:
            if value is None:
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _format(value, suffix="", decimals=0):
        if value is None:
            return "No disponible"
        return f"{round(value, decimals):g}{suffix}"

    @staticmethod
    def _hour(value):
        if not value:
            return "horario no disponible"
        try:
            return value[11:16]
        except (TypeError, IndexError):
            return "horario no disponible"

    def notify(self, alert_type, title, message, location):
        """Envía una notificación acompañada por el decreto de Baco."""

        if not self.notify_command:
            return False

        key = f"{alert_type}|{location}"
        now = time.time()
        previous = self._number(self.last_notifications.get(key))

        if previous is not None:
            if now - previous < self.COOLDOWN_SECONDS:
                return False

        decree = self.current_decree
        imperial_message = (
            f"{decree.get('emoji', '🐢')} "
            f"DECRETO IMPERIAL DE BACO\n"
            f"{decree.get('titulo', 'Decreto imperial')}\n"
            f"{decree.get('mensaje', '')}"
        )

        body = (
            f"{message}\n\n"
            f"Ubicación: {location}\n\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"{imperial_message}"
        )

        command = [
            self.notify_command,
            "--app-name=Bacus Alerts for Clima G Desktop",
            "--urgency=normal",
            "--expire-time=12000",
        ]

        if self.icon_path.is_file():
            command.extend(["--icon", str(self.icon_path)])

        command.extend([title, body])

        try:
            result = subprocess.run(
                command,
                check=False,
                timeout=8,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except (OSError, subprocess.TimeoutExpired):
            return False

        if result.returncode != 0:
            return False

        self.last_notifications[key] = now
        self._save_state()
        return True

    def evaluate(self, current, hourly, location, uv_index=None):
        """Analiza el clima actual y las próximas tres horas."""

        if not isinstance(current, dict):
            return

        if not isinstance(hourly, dict):
            hourly = {}

        temperature = self._number(current.get("temperature_2m"))
        feels_like = self._number(current.get("apparent_temperature"))
        current_wind = self._number(current.get("wind_speed_10m"))
        weather_code = self._number(current.get("weather_code"))
        uv_index = self._number(uv_index)

        self.current_decree = generar_decreto(
            temperature if temperature is not None else 0,
            weather_code if weather_code is not None else 0,
            uv_index if uv_index is not None else 0,
        )

        times = hourly.get("time", [])
        probabilities = hourly.get("precipitation_probability", [])
        wind_values = hourly.get("wind_speed_10m", [])
        weather_codes = hourly.get("weather_code", [])

        current_time = current.get("time", "")
        start_index = 0

        if current_time and times:
            for index, hour in enumerate(times):
                if hour >= current_time:
                    start_index = index
                    break

        indices = list(
            range(start_index, min(start_index + 3, len(times)))
        )

        # TORMENTAS
        storm_code = weather_code if weather_code in self.STORM_CODES else None
        storm_hour = None

        for index in indices:
            if index >= len(weather_codes):
                continue
            code = self._number(weather_codes[index])
            if code in self.STORM_CODES:
                storm_code = code
                storm_hour = times[index] if index < len(times) else None
                break

        if storm_code is not None:
            details = [
                f"Temperatura: {self._format(temperature, ' °C')}",
                f"Sensación térmica: {self._format(feels_like, ' °C')}",
                f"Viento: {self._format(current_wind, ' km/h')}",
            ]
            if storm_hour:
                details.append(f"Horario previsto: {self._hour(storm_hour)}")

            self.notify(
                "tormenta",
                "⛈️ Tormenta prevista",
                "El pronóstico detectó condiciones meteorológicas de tormenta.\n\n"
                + "\n".join(details),
                location,
            )

        # LLUVIA
        rain_alert = None

        for index in indices:
            if index >= len(probabilities):
                continue
            probability = self._number(probabilities[index])
            if probability is not None and probability >= self.RAIN_THRESHOLD:
                rain_alert = (index, probability)
                break

        if rain_alert:
            index, probability = rain_alert
            rain_hour = times[index] if index < len(times) else None

            details = [
                f"Probabilidad de precipitación: {self._format(probability, '%')}",
                f"Temperatura: {self._format(temperature, ' °C')}",
                f"Sensación térmica: {self._format(feels_like, ' °C')}",
                f"Viento: {self._format(current_wind, ' km/h')}",
            ]
            if rain_hour:
                details.append(f"Horario previsto: {self._hour(rain_hour)}")

            self.notify(
                "lluvia",
                "🌧️ Lluvia próxima",
                "La probabilidad de precipitación superó el umbral configurado.\n\n"
                + "\n".join(details),
                location,
            )

        # VIENTO FUERTE
        wind_alert = None

        if current_wind is not None and current_wind >= self.WIND_THRESHOLD:
            wind_alert = (current_wind, None)

        for index in indices:
            if index >= len(wind_values):
                continue
            speed = self._number(wind_values[index])
            if speed is not None and speed >= self.WIND_THRESHOLD:
                if wind_alert is None or speed > wind_alert[0]:
                    wind_alert = (
                        speed,
                        times[index] if index < len(times) else None,
                    )

        if wind_alert:
            speed, wind_hour = wind_alert
            details = [
                f"Velocidad prevista: {self._format(speed, ' km/h')}",
                f"Temperatura: {self._format(temperature, ' °C')}",
                f"Sensación térmica: {self._format(feels_like, ' °C')}",
            ]
            if wind_hour:
                details.append(f"Horario previsto: {self._hour(wind_hour)}")

            self.notify(
                "viento",
                "💨 Viento fuerte",
                f"Se detectó viento por encima del umbral de "
                f"{self.WIND_THRESHOLD} km/h.\n\n" + "\n".join(details),
                location,
            )

        # TEMPERATURAS EXTREMAS
        if temperature is not None:
            if temperature >= self.HEAT_THRESHOLD:
                self.notify(
                    "calor",
                    "🌡️ Temperatura elevada",
                    f"Temperatura actual: {self._format(temperature, ' °C')}\n"
                    f"Sensación térmica: {self._format(feels_like, ' °C')}\n"
                    f"Viento: {self._format(current_wind, ' km/h')}",
                    location,
                )
            elif temperature <= self.COLD_THRESHOLD:
                self.notify(
                    "frio",
                    "❄️ Temperatura muy baja",
                    f"Temperatura actual: {self._format(temperature, ' °C')}\n"
                    f"Sensación térmica: {self._format(feels_like, ' °C')}\n"
                    f"Viento: {self._format(current_wind, ' km/h')}",
                    location,
                )
