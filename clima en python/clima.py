import sys
import requests
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import (QApplication, QWidget, QLabel, QVBoxLayout, 
                             QHBoxLayout, QPushButton, QScrollArea, QFrame, QGridLayout)

# Diccionario de códigos de clima idéntico al tuyo
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

class ClimaGApp(QWidget):
    def __init__(self):
        super().__init__()
        self.unidad_actual = "C"
        self.datos_clima = None
        self.init_ui()
        self.obtener_ubicacion_ip()

    def init_ui(self):
        self.setWindowTitle("Clima G - El tiempo en vivo")
        self.setFixedSize(410, 720)
        
        # Estética idéntica a tu diseño CSS (--sky-800, --card, --mist, etc.)
        self.setStyleSheet("""
            QWidget {
                background-color: #eef2f8;
                color: #12203a;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .CardPrincipal {
                background-color: #ffffff;
                border: 1px solid #dbe3ef;
                border-radius: 24px;
            }
            .HeaderTop {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #0284c7, stop:1 #38bdf8);
                color: #ffffff;
                border-top-left-radius: 24px;
                border-top-right-radius: 24px;
                padding: 20px;
            }
            QLabel {
                background: transparent;
            }
            QPushButton {
                background-color: #1c2a4f;
                color: #ffffff;
                border: none;
                border-radius: 12px;
                padding: 12px;
                font-weight: bold;
                font-size: 0.9rem;
            }
            QPushButton:hover {
                background-color: #33507f;
            }
        """)

        layout_principal = QVBoxLayout(self)
        layout_principal.setContentsMargins(10, 10, 10, 10)

        # Contenedor principal estilo tarjeta móvil
        self.tarjeta = QFrame()
        self.tarjeta.setProperty("class", "CardPrincipal")
        layout_tarjeta = QVBoxLayout(self.tarjeta)
        layout_tarjeta.setContentsMargins(0, 0, 0, 0)
        layout_tarjeta.setSpacing(0)

        # --- SECCIÓN SUPERIOR (HEADER AZUL) ---
        self.header = QFrame()
        self.header.setProperty("class", "HeaderTop")
        header_layout = QVBoxLayout(self.header)

        self.lbl_lugar = QLabel("Detectando ubicación...")
        self.lbl_lugar.setStyleSheet("font-size: 1.1rem; font-weight: 600;")
        header_layout.addWidget(self.lbl_lugar, alignment=Qt.AlignmentFlag.AlignCenter)

        self.lbl_emoji = QLabel("🌤️")
        self.lbl_emoji.setStyleSheet("font-size: 2.2rem;")
        header_layout.addWidget(self.lbl_emoji, alignment=Qt.AlignmentFlag.AlignCenter)

        self.lbl_temp = QLabel("--°C")
        self.lbl_temp.setStyleSheet("font-size: 4.2rem; font-weight: bold;")
        header_layout.addWidget(self.lbl_temp, alignment=Qt.AlignmentFlag.AlignCenter)

        self.lbl_desc = QLabel("Cargando datos del clima")
        self.lbl_desc.setStyleSheet("font-size: 0.95rem; opacity: 0.95;")
        header_layout.addWidget(self.lbl_desc, alignment=Qt.AlignmentFlag.AlignCenter)

        layout_tarjeta.addWidget(self.header)

        # --- SECCIÓN INFERIOR (CUERPO BLANCO) ---
        self.cuerpo = QWidget()
        cuerpo_layout = QVBoxLayout(self.cuerpo)
        cuerpo_layout.setContentsMargins(20, 20, 20, 20)

        # Estadísticas (Sensación, Humedad, Viento, etc.)
        self.lbl_stats = QLabel("Sensación: --° | Humedad: --% | Viento: -- km/h")
        self.lbl_stats.setStyleSheet("font-size: 0.9rem; font-weight: 600; color: #46546d;")
        cuerpo_layout.addWidget(self.lbl_stats)

        # Botón de actualización
        btn_actualizar = QPushButton("Actualizar clima")
        btn_actualizar.clicked.connect(self.obtener_ubicacion_ip)
        cuerpo_layout.addWidget(btn_actualizar)

        layout_tarjeta.addWidget(self.cuerpo)
        layout_principal.addWidget(self.tarjeta)

    def convertir_temp(self, celsius):
        if self.unidad_actual == "F":
            return round(celsius * 9/5 + 32)
        return round(celsius)

    def obtener_ubicacion_ip(self):
        self.lbl_lugar.setText("Buscando ubicación...")
        try:
            res = requests.get('https://ipapi.co/json/', timeout=5).json()
            lat, lon = res.get('latitude'), res.get('longitude')
            ciudad = f"{res.get('city', 'Mi ubicación')}, {res.get('country_name', '')}"
            if lat and lon:
                self.cargar_clima(lat, lon, ciudad)
            else:
                self.lbl_lugar.setText("Ubicación no disponible")
        except Exception:
            self.lbl_lugar.setText("Error de red al ubicar")

    def cargar_clima(self, lat, lon, nombre_lugar):
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto"
            res = requests.get(url, timeout=5).json()
            c = res['current']
            
            code = c['weather_code']
            desc, emoji = WEATHER_CODES.get(code, ('—', '🌡️'))
            
            temp_val = self.convertir_temp(c['temperature_2m'])
            sensacion = self.convertir_temp(c['apparent_temperature'])
            
            self.lbl_lugar.setText(nombre_lugar)
            self.lbl_emoji.setText(emoji)
            self.lbl_temp.setText(f"{temp_val}°{self.unidad_actual}")
            self.lbl_desc.setText(desc)
            self.lbl_stats.setText(f"Sensación: {sensacion}° | Humedad: {round(c['relative_humidity_2m'])}% | Viento: {round(c['wind_speed_10m'])} km/h")
        except Exception:
            self.lbl_lugar.setText("Error al cargar clima")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    ventana = ClimaGApp()
    ventana.show()
    sys.exit(app.exec())
