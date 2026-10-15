# 🌤️ Clima G - Aplicación del Tiempo en Vivo

**Clima G** es una aplicación web progresiva (PWA) moderna, ligera y minimalista para consultar el pronóstico del tiempo en tiempo real. Está diseñada para ofrecer una experiencia rápida, fluida y con un diseño adaptable tanto en dispositivos móviles como de escritorio.

🔗 **Sitio web oficial:** [Accede a Clima G en línea](https://climag.duckdns.org)  
📦 **Repositorio en GitHub:** [ciberspar/mi-clima](https://github.com/ciberspar/mi-clima)

---

## ✨ Características Principales

* **Geolocalización GPS:** Obtiene automáticamente el clima de tu posición actual al otorgar permisos en el navegador, adaptándose al lugar exacto donde estés.
* **Buscador y Favoritos:** Permite buscar cualquier ciudad o aeropuerto del mundo mediante la API de geocodificación y guardar ubicaciones favoritas localmente.
* **Pronóstico por Horas Dinámico:** Visualiza un desglose hora a hora intercambiando dinámicamente entre **Temperatura**, **Probabilidad de Lluvia** y **Velocidad del Viento**.
* **Simulación Atmosférica Realista:** Fondos y animaciones dinámicas según las condiciones meteorológicas (sol, lluvia, nieve, nubes, neblina o cielo nocturno estrellado).
* **Alertas Meteorológicas y Consejos:** Avisos de alertas (verde, amarilla, naranja, roja) y recomendaciones personalizadas de indumentaria según la temperatura actual.
* **Astronomía y Fases Lunares:** Información detallada sobre fases de la luna, porcentaje de iluminación, salidas/puestas de sol y luna.
* **Comparativa con el Día Anterior:** Indicador en vivo que muestra si la temperatura actual es más cálida o más fresca respecto a la misma hora del día anterior.
* **Modo Oscuro Automático:** Se adapta de forma nativa a las preferencias de sistema de tu dispositivo (Dark Mode / Light Mode).
* **Contador de Visitas en Vivo:** Integración con GoatCounter para llevar la métrica de visitas únicas de la plataforma.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 / CSS3:** Estructura limpia y diseño moderno basado en variables CSS (`:root`) optimizado para rendimiento.
* **JavaScript (Vanilla):** Lógica del cliente sin dependencias pesadas ni frameworks externos.
* **Open-Meteo API:** Proveedor de datos meteorológicos y geocodificación en tiempo real de alta precisión.
* **OpenStreetMap (Nominatim):** Geocodificación inversa para la autodetección del nombre de la localidad.
* **GitHub Pages & DuckDNS:** Alojamiento estático y redirección de dominio personalizado.

---

## 🚀 Uso Local y Despliegue

Al tratarse de una aplicación web estática pura, no requiere procesos complejos de compilación (`build`):

1. Clona el repositorio:
   ```bash
   git clone [https://github.com/ciberspar/mi-clima.git](https://github.com/ciberspar/mi-clima.git)
