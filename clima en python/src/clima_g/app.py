"""Punto de entrada de Clima G Desktop."""

import sys

from PyQt6.QtWidgets import QApplication

from clima_g.config import APP_NAME, APP_VERSION
from clima_g.ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)
    app.setDesktopFileName("clima-g.desktop")

    app.setApplicationName(APP_NAME)
    app.setApplicationVersion(APP_VERSION)
    app.setOrganizationName("Clima G")

    window = MainWindow()
    window.show()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
