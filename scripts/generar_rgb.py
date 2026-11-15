import json
import urllib.request

# Ejemplo consultando Open-Meteo (ajustalo a tu API/coordenadas)
url = "https://open-meteo.com"
data = json.loads(urllib.request.urlopen(url).read().decode())
temp = data["current_weather"]["temperature"]
code = data["current_weather"]["weathercode"]

# Elegir color según clima/temperatura
if code >= 51:       # Lluvia / tormenta
    color, estado = "2200FF", "lluvia"
elif temp >= 30:     # Calor fuerte
    color, estado = "FF4500", "calor"
elif temp <= 12:     # Frío
    color, estado = "00FFFF", "frio"
else:                # Despejado / agradable
    color, estado = "00FF66", "agradable"

salida = {
    "temperatura": temp,
    "estado": estado,
    "color_hex": color
}

with open("rgb.json", "w") as f:
    json.dump(salida, f)
