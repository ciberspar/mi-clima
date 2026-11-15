
#!/usr/bin/env python3
"""Servicio local oficial de Clima G RGB."""

import argparse
import json
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8765
OPENRGB_HOST = "127.0.0.1"
OPENRGB_PORT = 6742

MAX_BODY = 65536
BLINK_SECONDS = 8
BLINK_INTERVAL = 0.65

ALLOWED_ORIGINS = {
    "https://climag.duckdns.org",
}

DEFAULT_COLOR = "#38BDF8"
FALLBACK_ALERT_COLOR = "#FACC15"

_lock = threading.RLock()
_rgb_lock = threading.Lock()

_client = None
_last_signature = ()
_blink_generation = 0
_blink_until = 0


def valid_color(value):
    if not isinstance(value, str):
        return None

    value = value.strip()

    if re.fullmatch(r"#?[0-9a-fA-F]{6}", value):
        return "#" + value.lstrip("#").upper()

    return None


def get_client():
    global _client

    if _client is None:
        from openrgb import OpenRGBClient

        _client = OpenRGBClient(
            address=OPENRGB_HOST,
            port=OPENRGB_PORT,
            name="Clima G RGB"
        )

    return _client


def apply_color(hex_color):
    from openrgb.utils import RGBColor

    color = RGBColor.fromHEX(hex_color)

    with _rgb_lock:
        get_client().set_color(color)


def normalize_alerts(payload):
    alerts = payload.get("alerts", [])

    if not isinstance(alerts, list):
        return []

    return [
        alert for alert in alerts
        if isinstance(alert, dict)
    ]


def choose_color(payload, alerts):
    candidates = [
        payload.get("color"),
        payload.get("color_hex")
    ]

    for alert in alerts:
        candidates.extend([
            alert.get("color"),
            alert.get("color_hex")
        ])

    for candidate in candidates:
        color = valid_color(candidate)

        if color:
            return color

    if payload.get("alert") is True or alerts:
        # Compatibilidad temporal con el index antiguo.
        return FALLBACK_ALERT_COLOR

    return DEFAULT_COLOR


def alert_signature(alerts):
    identifiers = []

    for alert in alerts:
        identifier = (
            alert.get("id")
            or alert.get("type")
            or alert.get("origen")
            or alert.get("mensaje")
        )

        if identifier is not None:
            identifiers.append(str(identifier))

    return tuple(sorted(set(identifiers)))


def stop_blink():
    global _blink_generation, _blink_until

    with _lock:
        _blink_generation += 1
        _blink_until = 0


def blink_color(color):
    global _blink_generation, _blink_until

    with _lock:
        _blink_generation += 1
        generation = _blink_generation
        _blink_until = time.monotonic() + BLINK_SECONDS

    def worker():
        visible = True

        while time.monotonic() < _blink_until:
            with _lock:
                if generation != _blink_generation:
                    return

            try:
                apply_color(color if visible else "#000000")
            except Exception as error:
                print(
                    f"[Clima G RGB] Error OpenRGB: {error}",
                    file=sys.stderr
                )
                return

            visible = not visible
            time.sleep(BLINK_INTERVAL)

        with _lock:
            if generation != _blink_generation:
                return

        try:
            apply_color(color)
        except Exception as error:
            print(f"[Clima G RGB] {error}", file=sys.stderr)

    threading.Thread(
        target=worker,
        daemon=True,
        name="ClimaG-RGB-Blink"
    ).start()


def process_payload(payload):
    global _last_signature

    alerts = normalize_alerts(payload)
    has_alert = payload.get("alert") is True or bool(alerts)

    color = choose_color(payload, alerts)

    signature = alert_signature(alerts)

    if has_alert and not signature:
        signature = ("generic-alert",)

    with _lock:
        new_alert = (
            has_alert
            and signature != _last_signature
        )

        if has_alert:
            _last_signature = signature
        else:
            _last_signature = ()

        blinking = time.monotonic() < _blink_until

    if new_alert:
        blink_color(color)

    elif not has_alert:
        stop_blink()

        try:
            apply_color(color)
        except Exception as error:
            print(f"[Clima G RGB] {error}", file=sys.stderr)

    elif not blinking:
        try:
            apply_color(color)
        except Exception as error:
            print(f"[Clima G RGB] {error}", file=sys.stderr)

    return {
        "ok": True,
        "service": "Clima G RGB",
        "color": color,
        "alert": has_alert,
        "blink_started": new_alert
    }


class ClimaGHandler(BaseHTTPRequestHandler):

    server_version = "ClimaGRGB/1.0"

    def cors_headers(self):
        origin = self.headers.get("Origin")

        if origin in ALLOWED_ORIGINS:
            self.send_header(
                "Access-Control-Allow-Origin",
                origin
            )
            self.send_header("Vary", "Origin")
            self.send_header(
                "Access-Control-Allow-Methods",
                "POST, OPTIONS"
            )
            self.send_header(
                "Access-Control-Allow-Headers",
                "Content-Type"
            )

            if self.headers.get(
                "Access-Control-Request-Private-Network"
            ) == "true":
                self.send_header(
                    "Access-Control-Allow-Private-Network",
                    "true"
                )

    def send_json(self, status, data):
        raw = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)
        self.cors_headers()

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header(
            "Content-Length",
            str(len(raw))
        )
        self.send_header("Cache-Control", "no-store")

        self.end_headers()

        if status != 204:
            self.wfile.write(raw)

    def do_OPTIONS(self):
        origin = self.headers.get("Origin")

        if origin not in ALLOWED_ORIGINS:
            self.send_json(
                403,
                {"ok": False, "error": "Origen no permitido"}
            )
            return

        self.send_json(204, {})

    def do_POST(self):
        if self.path != "/clima":
            self.send_json(
                404,
                {"ok": False, "error": "Ruta no encontrada"}
            )
            return

        origin = self.headers.get("Origin")

        if origin and origin not in ALLOWED_ORIGINS:
            self.send_json(
                403,
                {"ok": False, "error": "Origen no permitido"}
            )
            return

        try:
            length = int(
                self.headers.get("Content-Length", "0")
            )
        except ValueError:
            length = 0

        if length <= 0 or length > MAX_BODY:
            self.send_json(
                413,
                {"ok": False, "error": "Tamaño inválido"}
            )
            return

        try:
            payload = json.loads(
                self.rfile.read(length).decode("utf-8")
            )
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(
                400,
                {"ok": False, "error": "JSON inválido"}
            )
            return

        if not isinstance(payload, dict):
            self.send_json(
                400,
                {"ok": False, "error": "Se esperaba un objeto JSON"}
            )
            return

        result = process_payload(payload)
        self.send_json(200, result)

    def log_message(self, fmt, *args):
        print("[Clima G RGB] " + (fmt % args))


def self_test():
    assert valid_color("#12abEF") == "#12ABEF"
    assert valid_color("12abef") == "#12ABEF"
    assert valid_color("rojo") is None

    assert choose_color(
        {"color": "#123456"}, []
    ) == "#123456"

    assert choose_color(
        {"alert": True}, []
    ) == FALLBACK_ALERT_COLOR

    assert choose_color({}, []) == DEFAULT_COLOR

    assert alert_signature([
        {"id": "viento"},
        {"id": "lluvia"}
    ]) == ("lluvia", "viento")

    print("Autopruebas Clima G RGB: CORRECTAS")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--self-test",
        action="store_true"
    )

    args = parser.parse_args()

    if args.self_test:
        self_test()
        return

    print(
        f"Clima G RGB: http://{HOST}:{PORT}/clima"
    )
    print(
        "OpenRGB debe estar abierto con su SDK Server habilitado."
    )
    print("El servicio solo escucha en localhost.")

    server = ThreadingHTTPServer(
        (HOST, PORT),
        ClimaGHandler
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando Clima G RGB...")
    finally:
        stop_blink()
        server.server_close()


if __name__ == "__main__":
    main()
