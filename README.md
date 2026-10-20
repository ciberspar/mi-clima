# 🌤️ Clima G - Aplicación del Tiempo en Vivo & Alertas del Imperio de Baco

[![GitHub Actions Status](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/clima-alerta.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Robots%20Cloud)](https://github.com/ciberspar/mi-clima/actions)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge&logo=pwa&logoColor=white)](https://climag.duckdns.org)
[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://github.com/ciberspar/mi-clima)
[![Visitas](https://img.shields.io/badge/Visitas-En%20Vivo-blue?style=for-the-badge&logo=goatcounter&logoColor=white)](https://climag.duckdns.org)

**Clima G** es una aplicación web progresiva (PWA) de alto rendimiento, serverless y minimalista para consultar el pronóstico del tiempo en tiempo real y gestionar alertas meteorológicas nativas automatizadas por la nube.

🔗 **Sitio web oficial:** [Accede a Clima G en línea](https://climag.duckdns.org)  
📦 **Repositorio en GitHub:** [ciberspar/mi-clima](https://github.com/ciberspar/mi-clima)

---

## ✨ Características Principales

* **Geolocalización GPS:** Obtiene automáticamente el clima de tu posición actual al otorgar permisos en el navegador, adaptándose al lugar exacto donde estés.
* **Buscador y Favoritos:** Permite buscar cualquier ciudad o aeropuerto del mundo y guardar ubicaciones localmente.
* **Pronóstico por Horas Dinámico:** Visualiza un desglose hora a hora intercambiando entre **Temperatura**, **Probabilidad de Lluvia** y **Velocidad del Viento**.
* **Simulación Atmosférica y Baco:** Fondos dinámicos según las condiciones meteorológicas y el estado de supervisión del balcón de Baco 🐢.
* **Alertas Web Push Nativas (VAPID):** Monitoreo automatizado en segundo plano desde la nube (vía GitHub Actions) para avisos de lluvias extremas y un resumen diario imperdible a las 10:00 AM, sin depender de apps externas.
* **Astronomía y Fases Lunares:** Información detallada sobre fases de la luna, iluminación y salidas/puestas de sol.
* **Comparativa con el Día Anterior:** Indicador en vivo que muestra si la temperatura actual es más cálida o fresca respecto al día previo.
* **Modo Oscuro Automático:** Se adapta de forma nativa a las preferencias de sistema de tu dispositivo.

---

## 🤖 Automatización y Robots (GitHub Actions)

El repositorio cuenta con flujos de trabajo inteligentes en la carpeta `.github/` para mantener el sistema vigilado 24/7:
* **`clima-alerta.yml`**: Ejecuta revisiones periódicas cada 20 minutos y dispara el reporte matutino a las 10:00 AM mediante Web Push cifrado.
* **`baco-report.yml`**: Control central de reportes del imperio.
* **`lighthouse.yml`**: Auditoría automática de rendimiento, accesibilidad y SEO en cada actualización.

---

## 🛠️ Tecnologías Utilizadas

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Open-Meteo](https://img.shields.io/badge/OpenMeteo-0098FF?style=flat-square&logo=cloud&logoColor=white)](https://open-meteo.com/)

---

## 🚀 Uso Local y Despliegue

Al tratarse de una aplicación web estática pura, no requiere procesos complejos de compilación:

1. Clona el repositorio:
   ```bash
   git clone [https://github.com/ciberspar/mi-clima.git](https://github.com/ciberspar/mi-clima.git)
