"""Tema visual nativo de Clima G Desktop.

La paleta se centraliza aquí para que los componentes no mantengan colores
propios ni sobrescriban el tema al actualizar los datos.
"""

from PyQt6.QtCore import QEvent, QObject
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import QApplication, QDialog, QWidget


PALETTES = {
    "light": {
        "background": "#eef2f8", "surface": "#ffffff",
        "surface_alt": "#e5ebf4", "text": "#12203a",
        "muted": "#526176", "line": "#cbd5e1",
        "navy": "#1c2a4f", "navy_hover": "#33507f",
        "accent": "#0284c7", "scroll": "#cbd5e1",
        "dialog": "#ffffff", "dialog_text": "#12203a",
    },
    "dark": {
        "background": "#0b1120", "surface": "#151f38",
        "surface_alt": "#202d49", "text": "#f8fafc",
        "muted": "#cbd5e1", "line": "#334155",
        "navy": "#263858", "navy_hover": "#38547d",
        "accent": "#38bdf8", "scroll": "#475569",
        "dialog": "#151f38", "dialog_text": "#f8fafc",
    },
}

_AQI_COLORS = {
    "good": "#15803d",
    "fair": "#65a30d",
    "moderate": "#ca8a04",
    "poor": "#ea580c",
    "veryPoor": "#b91c1c",
    "unknown": "#64748b",
}


def _stylesheet(p):
    return f"""
QWidget {{
    color: {p['text']};
    font-family: "Segoe UI", "Noto Sans", sans-serif;
    font-size: 13px;
}}
QWidget#climaGMainWindow, QWidget#climaGPage {{
    background-color: {p['background']};
}}
QWidget#weatherHeader {{ color: #ffffff; background: transparent; }}
QLabel {{ color: {p['text']}; background: transparent; }}
QLabel[muted="true"] {{ color: {p['muted']}; font-size: 12px; }}
QLabel[sectionTitle="true"] {{
    color: {p['text']}; font-size: 15px; font-weight: 700;
}}
QLabel[metricValue="true"] {{
    color: {p['text']}; font-size: 17px; font-weight: 700;
}}
QLabel#weatherLocation {{ color: #ffffff; font-size: 17px; font-weight: 600; }}
QLabel#weatherTemperature {{ color: #ffffff; font-size: 56px; font-weight: 700; }}
QLabel#weatherDescription {{ color: #ffffff; font-size: 14px; }}
QLabel#weatherIcon, QLabel#bacoIcon {{ background: transparent; }}
QLabel#weatherIcon, QLabel#bacoIcon {{ font-size: 35px; }}
QLabel#yesterdayBadge {{
    color: #ffffff; background: rgba(255,255,255,70);
    border-radius: 10px; padding: 5px 12px; font-size: 12px;
}}
QLabel#bacoHeading {{ color: #fef08a; font-size: 11px; font-weight: 700; }}
QLabel#bacoMessage, QLabel#atmosphereTitle, QLabel#atmosphereSubtitle,
QLabel#aqiTitle, QLabel#aqiValue, QLabel#aqiDescription {{
    color: #ffffff; background: transparent;
}}
QLabel#atmosphereTitle {{ font-size: 14px; font-weight: 600; }}
QLabel#atmosphereSubtitle {{ color: #f8fafc; font-size: 11px; }}
QFrame[card="true"] {{
    background: {p['surface']}; border: 1px solid {p['line']};
    border-radius: 16px;
}}
QFrame#metricCell, QFrame#hourlyTile, QFrame#dailyRow, QLabel#mapNotice {{
    color: {p['text']}; background: {p['surface_alt']};
    border: none; border-radius: 12px;
}}
QLabel[hourlyTemperature="true"] {{ color: {p['text']}; font-size: 15px; font-weight: 700; }}
QLabel#mapNotice {{ padding: 10px; }}
QFrame#bacoOracle {{
    background: rgba(255,255,255,35);
    border: 1px solid rgba(255,255,255,75); border-radius: 16px;
}}
QFrame#weatherWindow {{
    background: rgba(15,23,48,55);
    border: 1px solid rgba(255,255,255,75); border-radius: 18px;
}}
QFrame#weatherTabs {{
    background: rgba(15,23,48,35);
    border: 1px solid rgba(255,255,255,45); border-radius: 13px;
}}
QPushButton {{
    color: #ffffff; background: {p['navy']}; border: none;
    border-radius: 12px; padding: 10px 14px; font-weight: 600;
}}
QPushButton:hover {{ background: {p['navy_hover']}; }}
QPushButton:pressed {{ background: {p['accent']}; }}
QPushButton:disabled {{ background: #64748b; color: #f8fafc; }}
QPushButton[roundAction="true"] {{
    background: rgba(255,255,255,55); color: #ffffff;
    border-radius: 18px; padding: 0;
}}
QPushButton[roundAction="true"]:hover {{ background: rgba(255,255,255,95); }}
QPushButton#weatherTab {{
    color: rgba(255,255,255,185); background: transparent;
    border-radius: 10px; padding: 9px 5px; font-size: 12px; font-weight: 600;
}}
QPushButton#weatherTab:checked {{
    color: #ffffff; background: rgba(255,255,255,70);
    border-bottom: 2px solid #fbbf24;
}}
QPushButton[mapLayer="true"] {{
    color: {p['text']}; background: {p['surface_alt']};
    border: 1px solid {p['line']}; border-radius: 12px;
}}
QPushButton[mapLayer="true"]:checked {{
    color: #ffffff; background: {p['navy']}; border-color: {p['navy']};
}}
QLineEdit {{
    color: {p['text']}; background: {p['surface']};
    border: 1px solid {p['line']}; border-radius: 15px;
    padding: 10px 13px; selection-background-color: {p['accent']};
}}
QLineEdit:focus {{ border: 1px solid {p['accent']}; }}
QScrollArea, QScrollArea > QWidget > QWidget, QStackedWidget {{
    background: transparent; border: none;
}}
QScrollBar:vertical {{ width: 9px; background: transparent; margin: 3px; }}
QScrollBar::handle:vertical {{
    background: {p['scroll']}; border-radius: 4px; min-height: 24px;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {{
    background: transparent; border: none;
}}
QListWidget {{
    color: {p['text']}; background: {p['surface']};
    border: 1px solid {p['line']}; border-radius: 14px; padding: 4px;
}}
QListWidget::item {{
    color: {p['text']}; background: {p['surface_alt']};
    border-radius: 12px; padding: 12px; margin: 3px 1px;
}}
QListWidget::item:hover {{ background: {p['line']}; }}
QListWidget::item:selected {{ color: #ffffff; background: {p['navy_hover']}; }}
QFrame#dialogSeparator {{ background: {p['line']}; max-height: 1px; border: none; }}
QFrame#aqiBanner {{ background: {_AQI_COLORS['unknown']}; border: none; border-radius: 16px; }}
QFrame#aqiBanner[aqiLevel="good"] {{ background: {_AQI_COLORS['good']}; }}
QFrame#aqiBanner[aqiLevel="fair"] {{ background: {_AQI_COLORS['fair']}; }}
QFrame#aqiBanner[aqiLevel="moderate"] {{ background: {_AQI_COLORS['moderate']}; }}
QFrame#aqiBanner[aqiLevel="poor"] {{ background: {_AQI_COLORS['poor']}; }}
QFrame#aqiBanner[aqiLevel="veryPoor"] {{ background: {_AQI_COLORS['veryPoor']}; }}
QFrame#aqiBanner QLabel {{ color: #ffffff; }}
QDialog#climaGDialog {{ color: {p['dialog_text']}; background: {p['dialog']}; }}
QDialog#climaGDialog QLabel {{ color: {p['dialog_text']}; background: transparent; }}
QDialog#climaGDialog QLabel#title {{ font-size: 27px; font-weight: 800; }}
QDialog#climaGDialog QLabel#subtitle {{ color: {p['muted']}; font-size: 12px; }}
QDialog#climaGDialog QLineEdit {{
    color: {p['dialog_text']}; background: {p['surface_alt']};
    border: 1px solid {p['line']}; border-radius: 15px;
}}
QMessageBox, QMessageBox QLabel {{
    color: {p['dialog_text']}; background: {p['dialog']};
}}
"""


def _clear_local_styles(widget):
    """Retira QSS locales para que la hoja central controle los componentes."""
    widget.setStyleSheet("")
    for child in widget.findChildren(QWidget):
        child.setStyleSheet("")


class _DialogThemeFilter(QObject):
    """Aplica el tema compartido al mostrar diálogos."""

    def eventFilter(self, watched, event):
        if isinstance(watched, QDialog) and event.type() == QEvent.Type.Show:
            if not watched.property("climaGThemeApplied"):
                _clear_local_styles(watched)
                watched.setObjectName("climaGDialog")
                watched.setProperty("climaGThemeApplied", True)
        return False


def set_theme(app: QApplication, main_window: QWidget, mode: str = "light") -> str:
    """Cambia la paleta global entre light y dark y devuelve el modo aplicado."""
    selected = mode if mode in PALETTES else "light"
    app.setStyleSheet(_stylesheet(PALETTES[selected]))
    app.setProperty("climaGTheme", selected)
    return selected


def install_theme(app: QApplication, main_window: QWidget, mode: str = "light") -> None:
    """Instala el tema central y asigna roles semánticos a los widgets."""
    app.setFont(QFont("Segoe UI", 10))
    _clear_local_styles(main_window)
    main_window.setObjectName("climaGMainWindow")

    for page in getattr(main_window, "page_widgets", {}).values():
        page.setObjectName("climaGPage")

    header = getattr(main_window, "header", None)
    if header is not None:
        header.setObjectName("weatherHeader")
        for name, object_name in (
            ("location", "weatherLocation"),
            ("temperature", "weatherTemperature"),
            ("description", "weatherDescription"),
            ("weather_icon", "weatherIcon"), ("baco_icon", "bacoIcon"),
            ("yesterday", "yesterdayBadge"), ("baco_heading", "bacoHeading"),
            ("baco_message", "bacoMessage"),
            ("atmosphere_title", "atmosphereTitle"),
            ("atmosphere_subtitle", "atmosphereSubtitle"),
        ):
            label = getattr(header, name, None)
            if label is not None:
                label.setObjectName(object_name)
        for name in ("baco_card", "atmosphere", "tabs"):
            frame = getattr(header, name, None)
            if frame is not None:
                frame.setStyleSheet("")

    for name, object_name in (
        ("aqi_title", "aqiTitle"), ("aqi_value", "aqiValue"),
        ("aqi_description", "aqiDescription"),
    ):
        label = getattr(main_window, name, None)
        if label is not None:
            label.setObjectName(object_name)

    for cell in main_window.findChildren(QWidget):
        if cell.property("metricCell"):
            cell.setObjectName("metricCell")
    for button in getattr(main_window, "map_layer_buttons", {}).values():
        button.setProperty("mapLayer", True)

    notice = getattr(main_window, "map_notice", None)
    if notice is not None:
        notice.setObjectName("mapNotice")

    banner = getattr(main_window, "aqi_banner", None)
    if banner is not None:
        banner.setObjectName("aqiBanner")

    set_theme(app, main_window, mode)
    app._clima_g_dialog_theme_filter = _DialogThemeFilter(app)
    app.installEventFilter(app._clima_g_dialog_theme_filter)
