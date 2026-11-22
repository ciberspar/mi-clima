import sys
import requests
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtWidgets import (QApplication, QWidget, QLabel, QVBoxLayout, 
                             QHBoxLayout, QPushButton, QFrame, QScrollArea)

WEATHER_CODES = {
    0: ('Cielo despejado', '☀️'), 1: ('Mayormente despejado', '🌤️'), 
    2: ('Parcialmente nublado', '⛅'), 3: ('Nublado', '☁️'),
    45: ('Neblina', '🌫️'), 48: ('Neblina con escarcha', '🌫️'),
    51: ('Llovizna ligera', '🌦️'), 53: ('Llovizna', '🌦️'), 55: ('Llovizna intensa', '🌧️'),
    61: ('Lluvia ligera', '🌧️'), 63: ('Lluvia', '🌧️'), 65: ('Lluvia intensa', '🌧️'),
    71: ('Nevada ligera', '🌨️'), 73: ('Nevada', '🌨️'), 75: ('Nevada intensa', '❄️'),
    80: ('Chubascos', '🌦️'), 81: ('Chubascos', '🌧️'), 82: ('Chubascos intensos', '⛈️'),
    95: ('Tormenta', '⛈️'), 96: ('Tormenta con granizo', '⛈️'), 99: ('Tormenta con granizo', '⛈️')
}

class ClimaWorker(QThread):
    datos_listos = pyqtSignal(dict)
    
    def __init__(self, lat, lon, nombre):
        super().__init__()
        self.lat = lat
        self.lon = lon
        self.nombre = nombre

    def run(self):
        try:
            # 1. API Open-Meteo (Clima actual, horario y diario)
            url_weather = f"https://api.open-meteo.com/v1/forecast?latitude={self.lat}&longitude={self.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code,cloud_cover&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset,moonrise,moonset,moon_phase,weather_code&past_days=1&timezone=auto"
            weather_res = requests.get(url_weather, timeout=5).json()

            # 2. API OpenStreetMap / Nominatim (Si no hay nombre, geocodificación inversa)
            lugar_nombre = self.nombre
            if not lugar_nombre:
                url_place = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={self.lat}&lon={self.lon}&zoom=10&accept-language=es"
                place_res = requests.get(url_place, headers={'User-Agent': 'ClimaG-Python'}, timeout=5).json()
                addr = place_res.get('address', {})
                lugar_nombre = addr.get('city') or addr.get('town') or addr.get('village') or 'Mi ubicación'

            # 3. API USGS (Sismos recientes)
            sismo_texto = None
            try:
                usgs_res = requests.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', timeout=4).json()
                for eq in usgs_res.get('features', []):
                    coords = eq.get('geometry', {}).get('coordinates', [])
                    if len(coords) >= 2 and abs(self.lat - coords[1]) < 4.5 and abs(self.lon - coords[0]) < 4.5:
                        mag = eq.get('properties', {}).get('mag', 0)
                        lugar_sismo = eq.get('properties', {}).get('place', 'Cerca de ti')
                        sismo_texto = f"🌋 Sismo Detectado: M {mag:.1f} - {lugar_sismo}"
                        break
            except Exception:
                pass

            self.datos_listos.emit({
                "weather": weather_res,
                "lugar": lugar_nombre,
                "sismo": sismo_texto
            })
        except Exception as e:
            print("Error al obtener datos:", e)

class ClimaGApp(QWidget):
    def __init__(self):
        super().__init__()
        self.unidad_actual = "C"
        self.init_ui()
        self.obtener_ubicacion_ip()

    def init_ui(self):
        self.setWindowTitle("Clima G - Python Nativo")
        self.setFixedSize(410, 720)
        
        self.setStyleSheet("""
            QWidget { background-color: #eef2f8; color: #12203a; font-family: Roboto, sans-serif; }
            .CardPrincipal { background-color: #ffffff; border: 1px solid #dbe3ef; border-radius: 24px; }
            .HeaderTop { background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #0284c7, stop:1 #38bdf8); color: #ffffff; border-top-left-radius: 24px; border-top-right-radius: 24px; padding: 20px; }
            QPushButton { background-color: #1c2a4f; color: #ffffff; border: none; border-radius: 12px; padding: 12px; font-weight: bold; }
            QPushButton:hover { background-color: #33507f; }
        """)

        layout_principal = QVBoxLayout(self)
        self.tarjeta = QFrame()
        self.tarjeta.setProperty("class", "CardPrincipal")
        layout_tarjeta = QVBoxLayout(self.tarjeta)

        # Header Superior
        self.header = QFrame()
        self.header.setProperty("class", "HeaderTop")
        h_layout = QVBoxLayout(self.header)

        self.lbl_lugar = QLabel("Detectando ubicación...")
        self.lbl_lugar.setStyleSheet("font-size: 1.1rem; font-weight: 600;")
        h_layout.addWidget(self.lbl_lugar, alignment=Qt.AlignmentFlag.AlignCenter)

        self.lbl_emoji = QLabel("🌤️")
        self.lbl_emoji.setStyleSheet("font-size: 2.2rem;")
        h_layout.addWidget(self.lbl_emoji, alignment=Qt.AlignmentFlag.AlignCenter)

        self.lbl_temp = QLabel("--°C")
        self.lbl_temp.setStyleSheet("font-size: 4.2rem; font-weight: bold;")
        h_layout.addWidget(self.lbl_temp, alignment=Qt.AlignmentFlag.AlignCenter)

        self.lbl_desc = QLabel("Cargando datos del clima")
        self.lbl_desc.setStyleSheet("font-size: 0.95rem;")
        h_layout.addWidget(self.lbl_desc, alignment=Qt.AlignmentFlag.AlignCenter)

        layout_tarjeta.addWidget(self.header)

        # Cuerpo Inferior
        self.cuerpo = QWidget()
        c_layout = QVBoxLayout(self.cuerpo)

        self.lbl_stats = QLabel("Sensación: --° | Humedad: --% | Viento: -- km/h")
        self.lbl_stats.setStyleSheet("font-size: 0.88rem; font-weight: 600; color: #46546d;")
        c_layout.addWidget(self.lbl_stats)

        self.lbl_sismo = QLabel("")
        self.lbl_sismo.setStyleSheet("background: #b91c1c; color: white; border-radius: 8px; padding: 8px; font-size: 0.8rem; font-weight: bold;")
        self.lbl_sismo.setVisible(False)
        c_layout.addWidget(self.lbl_sismo)

        btn_actualizar = QPushButton("Actualizar clima")
        btn_actualizar.clicked.connect(self.obtener_ubicacion_ip)
        c_layout.addWidget(btn_actualizar)

        layout_tarjeta.addWidget(self.cuerpo)
        layout_principal.addWidget(self.tarjeta)

    def convertir_temp(self, celsius):
        if self.unidad_actual == "F":
            return round(celsius * 9/5 + 32)
        return round(celsius)

    def obtener_ubicacion_ip(self):
        self.lbl_lugar.setText("Buscando ubicación por IP...")
        try:
            # API IPAPI para obtener lat/lon iniciales por red
            res = requests.get('https://ipapi.co/json/', timeout=4).json()
            lat, lon = res.get('latitude'), res.get('longitude')
            ciudad = f"{res.get('city', 'Mi ubicación')}, {res.get('country_name', '')}"
            if lat and lon:
                self.lanzar_hilo_clima(lat, lon, ciudad)
            else:
                self.lanzar_hilo_clima(-31.4135, -64.1810, "Córdoba, Argentina")
        except Exception:
            self.lanzar_hilo_clima(-31.4135, -64.1810, "Córdoba, Argentina")

    def lanzar_hilo_clima(self, lat, lon, nombre):
        self.worker = ClimaWorker(lat, lon, nombre)
        self.worker.datos_listos.connect(self.actualizar_interfaz)
        self.worker.start()

    def actualizar_interfaz(self, data):
        w = data["weather"]
        c = w["current"]
        
        code = c["weather_code"]
        desc, emoji = WEATHER_CODES.get(code, ('—', '🌡️'))
        
        temp = self.convertir_temp(c["temperature_2m"])
        feels = self.convertir_temp(c["apparent_temperature"])
        
        self.lbl_lugar.setText(data["lugar"])
        self.lbl_emoji.setText(emoji)
        self.lbl_temp.setText(f"{temp}°{self.unidad_actual}")
        self.lbl_desc.setText(desc)
        self.lbl_stats.setText(f"Sensación: {feels}° | Humedad: {round(c['relative_humidity_2m'])}% | Viento: {round(c['wind_speed_10m'])} km/h")

        if data["sismo"]:
            self.lbl_sismo.setText(data["sismo"])
            self.lbl_sismo.setVisible(True)
        else:
            self.lbl_sismo.setVisible(False)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ventana = ClimaGApp()
    ventana.show()
    sys.exit(app.exec())
