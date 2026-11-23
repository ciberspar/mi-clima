"""Native Qt styling for the Clima G Web visual identity."""

from PyQt6.QtCore import QEvent, QObject
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import QApplication, QDialog, QFrame, QWidget


CLIMAG_WEB_STYLESHEET = """
QWidget {
    color: #12203a;
    font-family: "Segoe UI", "Noto Sans", sans-serif;
    font-size: 13px;
}
QWidget#climaGMainWindow, QWidget#climaGPage { background-color: #eef2f8; }
QWidget#weatherHeader { color: #ffffff; background-color: transparent; }
QLabel { background-color: transparent; color: #12203a; }
QLabel[muted="true"] { color: #334155; font-size: 12px; }
QLabel[sectionTitle="true"] { color: #12203a; font-size: 15px; font-weight: 700; }
QLabel[metricValue="true"] { color: #12203a; font-size: 17px; font-weight: 700; }
QLabel#weatherLocation { color: #ffffff; font-size: 17px; font-weight: 600; }
QLabel#weatherTemperature { color: #ffffff; font-size: 56px; font-weight: 700; }
QLabel#weatherDescription { color: #ffffff; font-size: 14px; }
QLabel#weatherIcon, QLabel#bacoIcon { background: transparent; }
QLabel#weatherIcon { font-size: 35px; }
QLabel#bacoIcon { font-size: 35px; }
QLabel#yesterdayBadge {
    color: #ffffff; background-color: rgba(255,255,255,70);
    border-radius: 10px; padding: 5px 12px; font-size: 12px;
}
QLabel#bacoHeading { color: #fef08a; font-size: 11px; font-weight: 700; }
QLabel#bacoMessage, QLabel#atmosphereTitle, QLabel#atmosphereSubtitle,
QLabel#aqiTitle, QLabel#aqiValue, QLabel#aqiDescription {
    color: #ffffff; background-color: transparent;
}
QLabel#atmosphereTitle { font-size: 14px; font-weight: 600; }
QLabel#atmosphereSubtitle { color: #f8fafc; font-size: 11px; }
QFrame[card="true"] {
    background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px;
}
QFrame#bacoOracle {
    background-color: rgba(255,255,255,35); border: 1px solid rgba(255,255,255,75);
    border-radius: 16px;
}
QFrame#weatherWindow {
    background-color: rgba(15,23,48,55); border: 1px solid rgba(255,255,255,75);
    border-radius: 18px;
}
QFrame#weatherTabs {
    background-color: rgba(15,23,48,35); border: 1px solid rgba(255,255,255,45);
    border-radius: 13px;
}
QPushButton {
    color: #ffffff; background-color: #1c2a4f; border: none;
    border-radius: 12px; padding: 10px 14px; font-weight: 600;
}
QPushButton:hover { background-color: #33507f; }
QPushButton:pressed { background-color: #0f1730; }
QPushButton:disabled { background-color: #94a3b8; color: #f8fafc; }
QPushButton[roundAction="true"] {
    background-color: rgba(255,255,255,55); color: #ffffff;
    border-radius: 18px; padding: 0;
}
QPushButton[roundAction="true"]:hover { background-color: rgba(255,255,255,95); }
QPushButton#weatherTab {
    color: rgba(255,255,255,185); background-color: transparent;
    border-radius: 10px; padding: 9px 5px; font-size: 12px; font-weight: 600;
}
QPushButton#weatherTab:checked {
    color: #ffffff; background-color: rgba(255,255,255,70);
    border-bottom: 2px solid #fbbf24;
}
QPushButton[mapLayer="true"] {
    color: #12203a; background-color: #eef2f8;
    border: 1px solid #cbd5e1; border-radius: 12px;
}
QPushButton[mapLayer="true"]:checked {
    color: #ffffff; background-color: #1c2a4f; border-color: #1c2a4f;
}
QLineEdit {
    color: #12203a; background-color: #ffffff; border: 1px solid #cbd5e1;
    border-radius: 15px; padding: 10px 13px; selection-background-color: #38bdf8;
}
QLineEdit:focus { border: 1px solid #7095c4; }
QScrollArea, QScrollArea > QWidget > QWidget, QStackedWidget {
    background-color: transparent; border: none;
}
QScrollBar:vertical { width: 9px; background-color: transparent; margin: 3px; }
QScrollBar::handle:vertical { background-color: #cbd5e1; border-radius: 4px; min-height: 24px; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; border: none; }
QListWidget {
    color: #12203a; background-color: #ffffff; border: 1px solid #cbd5e1;
    border-radius: 14px; padding: 4px; outline: none;
}
QListWidget::item {
    color: #12203a; background-color: #eef2f8; border-radius: 12px;
    padding: 12px; margin: 3px 1px;
}
QListWidget::item:hover { background-color: #dce8f5; }
QListWidget::item:selected { color: #ffffff; background-color: #33507f; }
QFrame#dialogSeparator { background-color: #cbd5e1; max-height: 1px; border: none; }
QFrame#metricCell, QFrame#hourlyTile, QFrame#dailyRow, QFrame#mapNotice {
    color: #12203a; background-color: #eef2f8; border: none; border-radius: 12px;
}
QFrame#aqiBanner { background-color: #15803d; border: none; border-radius: 16px; }
QDialog#climaGDialog { color: #ffffff; background-color: #0f1730; }
QDialog#climaGDialog QLabel { color: #f8fafc; background-color: transparent; }
QDialog#climaGDialog QLabel#title { font-size: 27px; font-weight: 800; }
QDialog#climaGDialog QLabel#subtitle { color: #cbd5e1; font-size: 12px; }
QDialog#climaGDialog QLineEdit {
    color: #ffffff; background-color: rgba(255,255,255,33);
    border: 1px solid rgba(255,255,255,77); border-radius: 15px;
}
QDialog#climaGDialog QListWidget { color: #12203a; background-color: transparent; border: none; }
QDialog#climaGDialog QListWidget::item {
    color: #ffffff; background-color: #1e3a8a; border-radius: 13px;
    padding: 12px; margin: 4px 1px;
}
QDialog#climaGDialog QListWidget::item:hover { background-color: #2563eb; }
QDialog#climaGDialog QListWidget::item:selected { background-color: #0284c7; }
QDialog#climaGDialog QPushButton {
    color: #ffffff; background-color: #1e3a8a; border-radius: 12px;
}
QDialog#climaGDialog QPushButton:hover { background-color: #2563eb; }
QDialog#climaGDialog QPushButton#editButton { background-color: #334155; }
QDialog#climaGDialog QPushButton#closeButton {
    background-color: rgba(255,255,255,36); border: 1px solid rgba(255,255,255,50);
}
QMessageBox, QMessageBox QLabel { color: #12203a; background-color: #ffffff; }
"""


class _DialogThemeFilter(QObject):
    """Apply the shared theme to dialogs after removing legacy local QSS."""

    def eventFilter(self, watched, event):
        if isinstance(watched, QDialog) and event.type() == QEvent.Type.Show:
            if not watched.property("climaGThemeApplied"):
                _clear_local_styles(watched)
                watched.setObjectName("climaGDialog")
                watched.setProperty("climaGThemeApplied", True)
        return False


def _clear_local_styles(widget):
    """Clear descendant styles so the application stylesheet controls them."""
    widget.setStyleSheet("")
    for child in widget.findChildren(QWidget):
        child.setStyleSheet("")


def install_theme(app: QApplication, main_window: QWidget) -> None:
    """Apply Web palette, shared component styling, and native widget roles."""
    _clear_local_styles(main_window)
    app.setFont(QFont("Segoe UI", 10))
    app.setStyleSheet(CLIMAG_WEB_STYLESHEET)

    main_window.setObjectName("climaGMainWindow")
    for page in getattr(main_window, "page_widgets", {}).values():
        page.setObjectName("climaGPage")

    header = getattr(main_window, "header", None)
    if header is not None:
        header.setStyleSheet("")
        for action in (getattr(header, "cities_button", None),
                       getattr(header, "settings_button", None)):
            if action is not None:
                action.setProperty("roundAction", True)
        for name, object_name in (
            ("weather_icon", "weatherIcon"),
            ("baco_icon", "bacoIcon"),
            ("yesterday", "yesterdayBadge"),
            ("baco_heading", "bacoHeading"),
            ("atmosphere_title", "atmosphereTitle"),
            ("atmosphere_subtitle", "atmosphereSubtitle"),
        ):
            label = getattr(header, name, None)
            if label is not None:
                label.setStyleSheet("")
                label.setObjectName(object_name)
        for name in ("baco_card", "atmosphere", "tabs"):
            frame = getattr(header, name, None)
            if frame is not None:
                frame.setStyleSheet("")

    for name in ("aqi_title", "aqi_value", "aqi_description"):
        label = getattr(main_window, name, None)
        if label is not None:
            label.setObjectName({
                "aqi_title": "aqiTitle",
                "aqi_value": "aqiValue",
                "aqi_description": "aqiDescription",
            }[name])

    for cell in main_window.findChildren(QFrame):
        if cell.property("card"):
            continue
        if cell is getattr(main_window, "aqi_banner", None):
            cell.setObjectName("aqiBanner")
        else:
            cell.setStyleSheet("")

    for label in getattr(main_window, "metric_labels", {}).values():
        parent = label.parentWidget()
        if parent is not None:
            parent.setObjectName("metricCell")

    for button in getattr(main_window, "map_layer_buttons", {}).values():
        button.setProperty("mapLayer", True)

    map_notice = next(
        (label for label in main_window.findChildren(QWidget)
         if getattr(label, "text", lambda: "")().startswith("El mapa nativo")),
        None,
    )
    if map_notice is not None:
        map_notice.setObjectName("mapNotice")

    app._clima_g_dialog_theme_filter = _DialogThemeFilter(app)
    app.installEventFilter(app._clima_g_dialog_theme_filter)
