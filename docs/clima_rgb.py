#!/usr/bin/env python3
# Clima G RGB
# Requiere Python 3.10+, Flask y openrgb-python.

import threading
import time
from flask import Flask, request, jsonify, make_response

try:
    from openrgb import OpenRGBClient
    from openrgb.utils import RGBColor
except ImportError:
    OpenRGBClient = None
    RGBColor = None

HOST = "127.0.0.1"
PORT = 8765

ORIGINS = {
    "https://climag.duckdns.org",
    "https://ciberspar.github.io",
    "http://localhost",
    "http://127.0.0.1"
}

app = Flask(__name__)
lock = threading.Lock()
last_alert_id = None


def cors(response):
    origin = request.headers.get("Origin", "")

    if origin in ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"

    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Private-Network"] = "true"

    return response


@app.after_request
def add_cors(response):
    return cors(response)


@app.route("/clima", methods=["POST", "OPTIONS"])
def recibir_clima():
    if request.method == "OPTIONS":
        return make_response("", 204)

    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return jsonify({"error": "JSON inválido"}), 400

    alertas = datos.get("alerts", [])

    if not isinstance(alertas, list):
        return jsonify({"error": "Formato de alertas inválido"}), 400

    if alertas:
        iniciar_parpadeo()

    return jsonify({
        "success": True,
        "alert": bool(alertas),
        "message": "Datos recibidos por Clima en RGB."
    })


def iniciar_parpadeo():
    global last_alert_id

    with lock:
        if last_alert_id is not None:
            return

        last_alert_id = str(time.time())

    thread = threading.Thread(
        target=parpadear_colores,
        daemon=True
    )
    thread.start()


def parpadear_colores():
    global last_alert_id

    cliente = None
    originales = []

    try:
        if OpenRGBClient is None:
            print("Falta instalar openrgb-python.")
            return

        cliente = OpenRGBClient()

        dispositivos = cliente.devices

        if not dispositivos:
            print("OpenRGB no detectó dispositivos.")
            return

        # Guardamos los colores originales de cada dispositivo.
        for dispositivo in dispositivos:
            colores = list(dispositivo.colors)

            originales.append((dispositivo, colores))

        # Hacemos el parpadeo usando el color original atenuado.
        for _ in range(4):
            for dispositivo, colores in originales:
                atenuados = [
                    RGBColor(
                        int(color.red * 0.20),
                        int(color.green * 0.20),
                        int(color.blue * 0.20)
                    )
                    for color in colores
                ]

                dispositivo.set_colors(atenuados)

            time.sleep(0.35)

            for dispositivo, colores in originales:
                dispositivo.set_colors(colores)

            time.sleep(0.35)

    except Exception as error:
        print("Error RGB:", error)

    finally:
        # Restauramos los colores originales incluso si ocurre un error.
        for dispositivo, colores in originales:
            try:
                dispositivo.set_colors(colores)
            except Exception as error:
                print("No se pudo restaurar un dispositivo:", error)

        with lock:
            last_alert_id = None


@app.route("/estado", methods=["GET"])
def estado():
    return jsonify({
        "servicio": "Clima en RGB",
        "estado": "activo"
    })


if __name__ == "__main__":
    print("🐢 Clima en RGB iniciado.")
    print(f"Servicio local: http://{HOST}:{PORT}")
    print("Comprobá que OpenRGB esté abierto y su SDK Server activado.")

    app.run(
        host=HOST,
        port=PORT,
        debug=False,
        threaded=True
    )
