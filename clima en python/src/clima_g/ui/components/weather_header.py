"""Cabecera nativa de Clima G basada en la interfaz web."""

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QColor, QLinearGradient, QPainter
from PyQt6.QtWidgets import (
    QWidget, QLabel, QPushButton, QVBoxLayout, QHBoxLayout,
    QFrame, QSizePolicy
)


class WeatherHeader(QWidget):
    city_requested = pyqtSignal()
    settings_requested = pyqtSignal()
    tab_changed = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)

        self.setObjectName("weatherHeader")

        root = QVBoxLayout(self)
        root.setContentsMargins(20, 16, 20, 20)
        root.setSpacing(12)

        # Acciones superiores
        actions = QHBoxLayout()

        self.cities_button = self._round_button("📋")
        self.cities_button.setToolTip("Mis ciudades")
        self.cities_button.clicked.connect(self.city_requested.emit)

        self.settings_button = self._round_button("•••")
        self.settings_button.setToolTip("Configuración")
        self.settings_button.clicked.connect(self.settings_requested.emit)

        actions.addWidget(self.cities_button)
        actions.addStretch()
        actions.addWidget(self.settings_button)
        root.addLayout(actions)

        # Ubicación
        self.location = QLabel("Detectando ubicación...")
        self.location.setObjectName("weatherLocation")
        self.location.setAlignment(Qt.AlignmentFlag.AlignCenter)
        root.addWidget(self.location)

        # Icono meteorológico
        self.weather_icon = QLabel("🌤️")
        self.weather_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.weather_icon.setStyleSheet("font-size: 35px;")
        root.addWidget(self.weather_icon)

        # Temperatura
        self.temperature = QLabel("--")
        self.temperature.setObjectName("weatherTemperature")
        self.temperature.setAlignment(Qt.AlignmentFlag.AlignCenter)
        root.addWidget(self.temperature)

        # Descripción
        self.description = QLabel("Cargando datos del clima")
        self.description.setObjectName("weatherDescription")
        self.description.setAlignment(Qt.AlignmentFlag.AlignCenter)
        root.addWidget(self.description)

        self.yesterday = QLabel("")
        self.yesterday.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.yesterday.setVisible(False)
        self.yesterday.setStyleSheet("""
            QLabel {
                color: white;
                background: rgba(255,255,255,0.28);
                border-radius: 10px;
                padding: 5px 12px;
                font-size: 12px;
            }
        """)
        root.addWidget(self.yesterday, alignment=Qt.AlignmentFlag.AlignCenter)

        # Widget imperial de Baco
        self.baco_card = QFrame()
        self.baco_card.setObjectName("bacoOracle")

        baco_layout = QHBoxLayout(self.baco_card)
        baco_layout.setContentsMargins(14, 12, 14, 12)
        baco_layout.setSpacing(12)

        self.baco_icon = QLabel("🐢")
        self.baco_icon.setStyleSheet("font-size: 35px;")

        baco_text = QVBoxLayout()
        baco_text.setSpacing(3)

        self.baco_heading = QLabel("DECRETO IMPERIAL DE BACO")
        self.baco_heading.setStyleSheet("""
            color: #fef08a;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
        """)

        self.baco_message = QLabel("Analizando balcón...")
        self.baco_message.setWordWrap(True)
        self.baco_message.setStyleSheet("""
            color: white;
            font-size: 13px;
            font-weight: 600;
        """)

        baco_text.addWidget(self.baco_heading)
        baco_text.addWidget(self.baco_message)

        baco_layout.addWidget(self.baco_icon)
        baco_layout.addLayout(baco_text, 1)
        root.addWidget(self.baco_card)

        # Ventana atmosférica
        self.atmosphere = QFrame()
        self.atmosphere.setObjectName("weatherWindow")
        self.atmosphere.setMinimumHeight(100)
        self.atmosphere.setSizePolicy(
            QSizePolicy.Policy.Expanding,
            QSizePolicy.Policy.Minimum
        )

        atmosphere_layout = QVBoxLayout(self.atmosphere)
        atmosphere_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.atmosphere_title = QLabel("Cargando entorno...")
        self.atmosphere_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.atmosphere_title.setStyleSheet("""
            color: white;
            font-size: 14px;
            font-weight: 600;
        """)

        self.atmosphere_subtitle = QLabel("Simulación atmosférica")
        self.atmosphere_subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.atmosphere_subtitle.setStyleSheet("""
            color: #f8fafc;
            font-size: 11px;
        """)

        atmosphere_layout.addWidget(self.atmosphere_title)
        atmosphere_layout.addWidget(self.atmosphere_subtitle)
        root.addWidget(self.atmosphere)

        # Navegación de cinco pestañas
        self.tabs = QFrame()
        self.tabs.setObjectName("weatherTabs")

        tabs_layout = QHBoxLayout(self.tabs)
        tabs_layout.setContentsMargins(4, 4, 4, 4)
        tabs_layout.setSpacing(3)

        self.tab_buttons = {}

        for key, label in (
            ("hoy", "Hoy"),
            ("semana", "Semana"),
            ("aire", "Aire"),
            ("mapa", "Mapa"),
            ("resumen", "Resumen"),
        ):
            button = QPushButton(label)
            button.setCheckable(True)
            button.setObjectName("weatherTab")
            button.clicked.connect(
                lambda checked=False, tab=key: self.select_tab(tab)
            )

            tabs_layout.addWidget(button)
            self.tab_buttons[key] = button

        root.addWidget(self.tabs)
        self.select_tab("hoy")

        self.setStyleSheet("""
            QWidget#weatherHeader {
                color: white;
            }

            QLabel#weatherLocation {
                color: white;
                font-size: 17px;
                font-weight: 600;
                margin-top: 8px;
            }

            QLabel#weatherTemperature {
                color: white;
                font-size: 67px;
                font-weight: 700;
            }

            QLabel#weatherDescription {
                color: white;
                font-size: 14px;
            }

            QFrame#bacoOracle {
                background: rgba(255,255,255,0.15);
                border: none;
                border-radius: 16px;
            }

            QFrame#weatherWindow {
                background: rgba(0,0,0,0.25);
                border: none;
                border-radius: 18px;
            }

            QFrame#weatherTabs {
                background: rgba(15,23,48,0.20);
                border: none;
                border-radius: 13px;
            }

            QPushButton#weatherTab {
                color: white;
                background: transparent;
                border: none;
                border-radius: 10px;
                padding: 9px 5px;
                font-size: 12px;
                font-weight: 600;
            }

            QPushButton#weatherTab:checked {
                background: rgba(255,255,255,0.28);
            }
        """)

    def _round_button(self, text):
        button = QPushButton(text)
        button.setFixedSize(36, 36)
        button.setCursor(Qt.CursorShape.PointingHandCursor)
        button.setStyleSheet("""
            QPushButton {
                background: rgba(255,255,255,0.25);
                border: none;
                border-radius: 18px;
                color: white;
                font-size: 15px;
                font-weight: bold;
            }
            QPushButton:hover {
                background: rgba(255,255,255,0.4);
            }
        """)
        return button

    def select_tab(self, tab):
        if tab not in self.tab_buttons:
            return

        for name, button in self.tab_buttons.items():
            button.setChecked(name == tab)

        self.tab_changed.emit(tab)

    def update_weather(
        self,
        temperature,
        description,
        icon="🌤️",
        location=None
    ):
        self.temperature.setText(str(temperature))
        self.description.setText(description)
        self.weather_icon.setText(icon)

        if location:
            self.location.setText(location)

    def update_baco(self, decree):
        self.baco_icon.setText(decree.get("emoji", "🐢"))
        self.baco_message.setText(decree.get("mensaje", ""))

        title = decree.get("titulo")
        if title:
            self.baco_heading.setText(
                f"DECRETO IMPERIAL DE BACO · {title.upper()}"
            )

    def update_atmosphere(self, title, subtitle="Simulación atmosférica"):
        self.atmosphere_title.setText(title)
        self.atmosphere_subtitle.setText(subtitle)

    def update_yesterday(self, text):
        self.yesterday.setText(text)
        self.yesterday.setVisible(bool(text))

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        gradient = QLinearGradient(0, 0, self.width(), self.height())
        gradient.setColorAt(0, QColor("#0284c7"))
        gradient.setColorAt(1, QColor("#38bdf8"))

        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(gradient)
        painter.drawRoundedRect(self.rect(), 0, 0)
        painter.end()
