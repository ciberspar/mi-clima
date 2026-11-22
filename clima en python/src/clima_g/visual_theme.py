"""PyQt6 theme matching the Clima G Web visual system."""

from PyQt6.QtCore import QEvent, QObject
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import QApplication, QDialog, QWidget


CLIMAG_WEB_STYLESHEET = """
QWidget {
    color: #12203a;
    font-family: "Segoe UI", "Noto Sans", sans-serif;
    font-size: 13px;
}
QWidget#climaGMainWindow, QWidget#climaGPage {
    background-color: #eef2f8;
}
QWidget#weatherHeader {
    color: #ffffff;
    background-color: transparent;
}
QLabel {
    background-color: transparent;
    color: #12203a;
}
QLabel[muted="true"] {
    color: #334155;
    font-size: 12px;
}
QLabel[sectionTitle="true"] {
    color: #12203a;
    font-size: 15px;
    font-weight: 700;
}
QLabel[metricValue="true"] {
    color: #12203a;
    font-size: 17px;
    font-weight: 700;
}
QLabel#weatherLocation {
    color: #ffffff;
    font-size: 17px;
    font-weight: 600;
}
QLabel#weatherTemperature {
    color: #ffffff;
    font-size: 56px;
    font-weight: 700;
}
QLabel#weatherDescription {
    color: #ffffff;
    font-size: 14px;
}
QLabel#bacoHeading {
    color: #fef08a;
    font-size: 11px;
    font-weight: 700;
}
QLabel#bacoMessage, QLabel#atmosphereTitle, QLabel#atmosphereSubtitle,
QLabel#aqiTitle, QLabel#aqiValue, QLabel#aqiDescription {
    color: #ffffff;
    background-color: transparent;
}
QLabel#atmosphereTitle { font-size: 14px; font-weight: 600; }
QLabel#atmosphereSubtitle { color: #f8fafc; font-size: 11px; }
QFrame[card="true"] {
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 16px;
}
QFrame#bacoOracle {
    background-color: rgba(255, 255, 255, 35);
    border: 1px solid rgba(255, 255, 255, 75);
    border-radius: 16px;
}
QFrame#weatherWindow {
    background-color: rgba(15, 23, 48, 55);
    border: 1px solid rgba(255, 255, 255, 75);
    border-radius: 18px;
}
QFrame#weatherTabs {
    background-color: rgba(15, 23, 48, 35);
    border: 1px solid rgba(255, 255, 255, 45);
    border-radius: 13px;
}
QPushButton {
    color: #ffffff;
    background-color: #1c2a4f;
    border: none;
    border-radius: 12px;
    padding: 10px 14px;
    font-weight: 600;
}
QPushButton:hover { background-color: #33507f; }
QPushButton:pressed { background-color: #0f1730; }
QPushButton:disabled { background-color: #94a3b8; color: #f8fafc; }
QPushButton[roundAction="true"] {
    background-color: rgba(255, 255, 255, 55);
    color: #ffffff;
    border-radius: 18px;
    padding: 0;
}
QPushButton[roundAction="true"]:hover { background-color: rgba(255, 255, 255, 95); }
QPushButton#weatherTab {
    color: rgba(255, 255, 255, 185);
    background-color: transparent;
    border-radius: 10px;
    padding: 9px 5px;
    font-size: 12px;
    font-weight: 600;
}
QPushButton#weatherTab:checked {
    color: #ffffff;
    background-color: rgba(255, 255, 255, 70);
    border-bottom: 2px solid #fbbf24;
}
QPushButton[mapLayer="true"] {
    color: #12203a;
    background-color: #eef2f8;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
}
QPushButton[mapLayer="true"]:checked {
    color: #ffffff;
    background-color: #1c2a4f;
    border-color: #1c2a4f;
}
QLineEdit {
    color: #12203a;
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 15px;
    padding: 10px 13px;
    selection-background-color: #38bdf8;
}
QLineEdit:focus { border: 1px solid #7095c4; }
QScrollArea, QScrollArea > QWidget > QWidget, QStackedWidget {
    background-color: transparent;
    border: none;
}
QScrollBar:vertical {
    width: 9px;
    background-color: transparent;
    margin: 3px;
}
QScrollBar::handle:vertical {
    background-color: #cbd5e1;
    border-radius: 4px;
    min-height: 24px;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
    background: transparent;
    border: none;
}
QListWidget {
    color: #12203a;
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 14px;
    padding: 4px;
    outline: none;
}
QListWidget::item {
    color: #12203a;
    background-color: #eef2f8;
    border-radius: 12px;
    padding: 12px;
    margin: 3px 1px;
}
QListWidget::item:hover { background-color: #dce8f5; }
QListWidget::item:selected { color: #ffffff; background-color: #33507f; }
QFrame#dialogSeparator { background-color: #cbd5e1; max-height: 1px; border: none; }
QFrame#metricCell, QFrame#hourlyTile, QFrame#dailyRow, QFrame#mapNotice {
    color: #12203a;
    background-color: #eef2f8;
    border: none;
    border-radius: 12px;
}
QFrame#aqiBanner {
    background-color: #15803d;
    border: none;
    border-radius: 16px;
}
QMessageBox, QMessageBox QLabel { color: #12203a; background-color: #ffffff; }
"""


class _DialogThemeFilter(QObject):
    """Remove legacy per-widget styles from dialogs so the app theme applies."""

    def eventFilter(self, watched, event):
        if isinstance(watched, QDialog) and event.type() == QEvent.Type.Show:
            if not watched.property("climaGThemeApplied"):
                _clear_local_styles(watched)
                watched.setObjectName("climaGDialog")
                watched.setProperty("climaGThemeApplied", True)
        return False


def _clear_local_styles(widget):
    """Let the shared application stylesheet control widget presentation."""
    widget.setStyleSheet("")
    if isinstance(widget, QWidget):
        if widget.objectName() in {"weatherHeader", "weatherLocation",
                                   "weatherTemperature", "weatherDescription",
                                   "bacoOracle", "weatherWindow", "weatherTabs"}:
            pass
        for child in widget.findChildren(QWidget):
            child.setStyleSheet("")


def install_theme(app: QApplication, main_window: QWidget) -> None:
    """Apply the approved Web palette and spacing language to native widgets."""
    app.setFont(QFont("Segoe UI", 10))
    app.setStyleSheet(CLIMAG_WEB_STYLESHEET)
    main_window.setObjectName("climaGMainWindow")

    for page in getattr(main_window, "page_widgets", {}).values():
        page.setObjectName("climaGPage")

    # Existing per-widget QSS was inconsistent and caused opaque QLabel bands.
    _clear_local_styles(main_window)
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
        for name in ("baco_heading", "baco_message", "atmosphere_title",
                     "atmosphere_subtitle"):
            label = getattr(header, name, None)
            if label is not None:
                label.setStyleSheet("")
                if name == "baco_heading":
                    label.setObjectName("bacoHeading")
        for name in ("baco_card", "atmosphere", "tabs"):
            frame = getattr(header, name, None)
            if frame is not None:
                frame.setStyleSheet("")

    for cell in main_window.findChildren(QFrame):
        if cell.property("card") or cell.objectName() in {"aqiBanner", "mapNotice"}:
            continue
        # Preserve state-bearing alert colors; other inline frame styles were
        # decorative and are replaced by the common Web surface treatment.
        if cell is not getattr(main_window, "aqi_banner", None):
            cell.setStyleSheet("")

    for name in ("aqi_banner",):
        frame = getattr(main_window, name, None)
        if frame is not None:
            frame.setObjectName("aqiBanner")

    # Dialogs are styled on first show, after their local legacy QSS is removed.
    app._clima_g_dialog_theme_filter = _DialogThemeFilter(app)
    app.installEventFilter(app._clima_g_dialog_theme_filter)
