"""Selector de ciudades de Clima G Desktop."""

from PyQt6.QtCore import Qt, QThread, QTimer, pyqtSignal
from PyQt6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QPushButton,
    QMessageBox,
    QFrame,
)

from clima_g.services.environment import EnvironmentService


class CitySearchWorker(QThread):
    results_ready = pyqtSignal(str, list)
    error = pyqtSignal(str, str)

    def __init__(self, query, parent=None):
        super().__init__(parent)
        self.query = query

    def run(self):
        try:
            results = EnvironmentService().search_cities(self.query)
            self.results_ready.emit(self.query, results)
        except Exception as exc:
            self.error.emit(self.query, str(exc))


class CitySearchDialog(QDialog):
    city_selected = pyqtSignal(dict)

    def __init__(self, parent=None):
        super().__init__(parent)

        self.worker = None
        self.pending_query = None
        self.editing = False
        self.settings_store = getattr(parent, "settings_store", None)

        self.setWindowTitle("Clima G · Mis ciudades")
        self.setMinimumSize(360, 540)
        self.resize(480, 760)

        self.setStyleSheet("""
            QDialog {
                background: #0f1730;
                color: #f8fafc;
            }

            QLabel {
                color: #f8fafc;
                background: transparent;
            }

            QLabel#title {
                font-size: 27px;
                font-weight: 800;
            }

            QLabel#subtitle {
                color: #cbd5e1;
                font-size: 12px;
            }

            QLineEdit {
                background: rgba(255,255,255,0.13);
                color: white;
                border: 1px solid rgba(255,255,255,0.30);
                border-radius: 20px;
                padding: 12px 15px;
                font-size: 14px;
                selection-background-color: #38bdf8;
            }

            QLineEdit:focus {
                border: 1px solid #7dd3fc;
            }

            QListWidget {
                background: transparent;
                border: none;
                outline: none;
                color: #12203a;
                padding: 4px;
            }

            QListWidget::item {
                background: qlineargradient(
                    x1:0, y1:0, x2:1, y2:1,
                    stop:0 #1e3a8a, stop:1 #3b82f6
                );
                color: white;
                border-radius: 13px;
                padding: 14px;
                margin: 4px 0;
                font-size: 14px;
            }

            QListWidget::item:hover {
                background: #2563eb;
            }

            QListWidget::item:selected {
                background: #0284c7;
            }

            QPushButton {
                background: #1e3a8a;
                color: white;
                border: none;
                border-radius: 17px;
                padding: 10px 15px;
                font-weight: 600;
            }

            QPushButton:hover {
                background: #2563eb;
            }

            QPushButton#closeButton {
                background: rgba(255,255,255,0.14);
                border: 1px solid rgba(255,255,255,0.2);
            }

            QPushButton#editButton {
                background: #334155;
            }

            QFrame#separator {
                background: rgba(255,255,255,0.16);
                max-height: 1px;
            }
        """)

        self.build_ui()
        self.load_favorites()

    def build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 18)
        layout.setSpacing(12)

        header = QHBoxLayout()

        title = QLabel("Clima")
        title.setObjectName("title")
        header.addWidget(title)

        header.addStretch()

        close_button = QPushButton("✕")
        close_button.setObjectName("closeButton")
        close_button.setFixedSize(42, 42)
        close_button.clicked.connect(self.reject)
        header.addWidget(close_button)

        layout.addLayout(header)

        subtitle = QLabel("Tus ciudades y ubicaciones guardadas")
        subtitle.setObjectName("subtitle")
        layout.addWidget(subtitle)

        self.favorites_list = QListWidget()
        self.favorites_list.itemClicked.connect(self.select_favorite)
        layout.addWidget(self.favorites_list, 1)

        self.edit_button = QPushButton("✏️  Editar lista")
        self.edit_button.setObjectName("editButton")
        self.edit_button.clicked.connect(self.toggle_editing)
        layout.addWidget(self.edit_button)

        separator = QFrame()
        separator.setObjectName("separator")
        layout.addWidget(separator)

        self.status_label = QLabel(
            "Buscá una ciudad o un aeropuerto."
        )
        self.status_label.setObjectName("subtitle")
        self.status_label.setWordWrap(True)
        layout.addWidget(self.status_label)

        self.suggestions_list = QListWidget()
        self.suggestions_list.setMaximumHeight(210)
        self.suggestions_list.itemClicked.connect(
            self.select_suggestion
        )
        layout.addWidget(self.suggestions_list)

        search_row = QHBoxLayout()

        search_icon = QLabel("🔍")
        search_row.addWidget(search_icon)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText(
            "Buscar ciudad o aeropuerto"
        )
        self.search_input.textChanged.connect(
            self.schedule_search
        )
        self.search_input.returnPressed.connect(
            self.search_now
        )
        search_row.addWidget(self.search_input, 1)

        layout.addLayout(search_row)

        self.search_timer = QTimer(self)
        self.search_timer.setSingleShot(True)
        self.search_timer.setInterval(300)
        self.search_timer.timeout.connect(self.start_search)

    def load_favorites(self):
        self.favorites_list.clear()

        if self.settings_store is None:
            return

        try:
            favorites = self.settings_store.get_favorites()
        except Exception as exc:
            self.status_label.setText(
                f"No se pudieron cargar las ciudades: {exc}"
            )
            return

        for city in favorites:
            name = city.get("name", "Ciudad guardada")
            item = QListWidgetItem(f"📍  {name}")
            item.setData(Qt.ItemDataRole.UserRole, city)
            self.favorites_list.addItem(item)

        if not favorites:
            item = QListWidgetItem(
                "Todavía no guardaste ciudades. Buscá una para comenzar."
            )
            item.setFlags(Qt.ItemFlag.NoItemFlags)
            self.favorites_list.addItem(item)

    def toggle_editing(self):
        self.editing = not self.editing

        self.edit_button.setText(
            "✓  Terminar edición"
            if self.editing else "✏️  Editar lista"
        )

        self.status_label.setText(
            "Seleccioná una ciudad para quitarla de favoritos."
            if self.editing
            else "Buscá una ciudad o un aeropuerto."
        )

    def select_favorite(self, item):
        city = item.data(Qt.ItemDataRole.UserRole)

        if not isinstance(city, dict):
            return

        if self.editing:
            answer = QMessageBox.question(
                self,
                "Eliminar ciudad",
                f"¿Querés quitar {city['name']} de tus ciudades?",
                QMessageBox.StandardButton.Yes
                | QMessageBox.StandardButton.No,
            )

            if answer == QMessageBox.StandardButton.Yes:
                try:
                    self.settings_store.remove_favorite(
                        city["latitude"],
                        city["longitude"],
                    )
                    self.load_favorites()
                except Exception as exc:
                    QMessageBox.warning(
                        self,
                        "Favoritos",
                        f"No se pudo eliminar la ciudad: {exc}",
                    )
            return

        self.city_selected.emit(dict(city))
        self.accept()

    def schedule_search(self, text):
        self.search_timer.stop()
        self.suggestions_list.clear()

        query = text.strip()

        if len(query) < 2:
            self.status_label.setText(
                "Ingresá al menos dos caracteres para buscar."
            )
            return

        self.status_label.setText("Preparando búsqueda...")
        self.search_timer.start()

    def search_now(self):
        self.search_timer.stop()
        self.start_search()

    def start_search(self):
        query = self.search_input.text().strip()

        if len(query) < 2:
            return

        if self.worker is not None and self.worker.isRunning():
            self.pending_query = query
            return

        self.pending_query = None
        self.suggestions_list.clear()
        self.status_label.setText("Buscando lugares...")

        self.worker = CitySearchWorker(query, self)
        self.worker.results_ready.connect(self.show_results)
        self.worker.error.connect(self.show_error)
        self.worker.finished.connect(self.search_finished)
        self.worker.start()

    def show_results(self, query, results):
        if query != self.search_input.text().strip():
            return

        self.suggestions_list.clear()

        for city in results:
            name = city.get("name") or "Ciudad"
            admin = city.get("admin1") or city.get("admin2") or ""
            country = city.get("country") or ""

            full_name = ", ".join(
                part for part in (name, admin, country) if part
            )

            item = QListWidgetItem(f"📍  {full_name}")
            item.setData(Qt.ItemDataRole.UserRole, {
                "latitude": float(city["latitude"]),
                "longitude": float(city["longitude"]),
                "name": full_name,
            })
            self.suggestions_list.addItem(item)

        count = len(results)

        self.status_label.setText(
            f"Se encontraron {count} lugares."
            if count
            else f"No se encontraron lugares para «{query}»."
        )

    def show_error(self, query, message):
        if query != self.search_input.text().strip():
            return

        self.suggestions_list.clear()
        self.status_label.setText(
            "No se pudo completar la búsqueda. Intentá nuevamente."
        )

    def search_finished(self):
        self.worker = None

        query = self.search_input.text().strip()

        if self.pending_query is not None:
            pending = self.pending_query
            self.pending_query = None

            if len(pending) >= 2 and pending == query:
                self.start_search()

    def select_suggestion(self, item):
        city = item.data(Qt.ItemDataRole.UserRole)

        if not isinstance(city, dict):
            return

        try:
            if self.settings_store is not None:
                self.settings_store.add_favorite(
                    city["latitude"],
                    city["longitude"],
                    city["name"],
                )
        except Exception as exc:
            QMessageBox.warning(
                self,
                "Favoritos",
                f"No se pudo guardar la ciudad: {exc}",
            )
            return

        self.city_selected.emit(dict(city))
        self.accept()

    def closeEvent(self, event):
        self.search_timer.stop()

        if self.worker is not None and self.worker.isRunning():
            self.worker.wait(16000)

        event.accept()
