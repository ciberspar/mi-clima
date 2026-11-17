# 🌤️ Clima G - Aplicación del Tiempo en Vivo & Alertas del Imperio de Baco

[![Clima Alertas](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/clima-alerta.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Clima%20Alertas)](https://github.com/ciberspar/mi-clima/actions/workflows/clima-alerta.yml)
[![Baco Report](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/baco-report.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Baco%20Report)](https://github.com/ciberspar/mi-clima/actions/workflows/baco-report.yml)
[![Auto Responder](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/auto-responder-issues.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Auto%20Responder)](https://github.com/ciberspar/mi-clima/actions/workflows/auto-responder-issues.yml)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/codeql.yml?branch=main&style=for-the-badge&logo=github&logoColor=white&label=CodeQL)](https://github.com/ciberspar/mi-clima/actions/workflows/codeql.yml)
[![Lighthouse](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/lighthouse.yml?branch=main&style=for-the-badge&logo=lighthouse&logoColor=white&label=Lighthouse)](https://github.com/ciberspar/mi-clima/actions/workflows/lighthouse.yml)
[![RGB Validator](https://img.shields.io/github/actions/workflow/status/ciberspar/mi-clima/update_rgb.yml?branch=main&style=for-the-badge&logo=python&logoColor=white&label=RGB%20Validator)](https://github.com/ciberspar/mi-clima/actions/workflows/update_rgb.yml)

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge&logo=pwa&logoColor=white)](https://climag.duckdns.org)
[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://github.com/ciberspar/mi-clima/blob/main/LICENSE)
[![Repositorio GitHub](https://img.shields.io/badge/GitHub-mi--clima-black?style=for-the-badge&logo=github)](https://github.com/ciberspar/mi-clima)
[![Visitas GoatCounter](https://gero.goatcounter.com/counter/TOTAL.svg)](https://gero.goatcounter.com)

**Clima G** es una aplicación web progresiva (PWA) para consultar información meteorológica, explorar condiciones atmosféricas y recibir alertas. Está diseñada para funcionar desde navegadores modernos y dispositivos móviles.

🔗 **Sitio web oficial:** [https://climag.duckdns.org](https://climag.duckdns.org)  
📦 **Repositorio:** [ciberspar/mi-clima](https://github.com/ciberspar/mi-clima)  
📊 **Estadísticas de visitas:** [GoatCounter](https://gero.goatcounter.com)

---

## ✨ 1. Características principales

### 🌦️ Información meteorológica
- **Geolocalización GPS:** obtiene el clima de la ubicación del usuario cuando concede permiso.
- **Buscador de ciudades:** permite consultar diferentes ubicaciones.
- **Favoritos:** guarda ubicaciones para acceder rápidamente.
- **Pronóstico por horas:** permite consultar la evolución de las condiciones meteorológicas.
- **Temperatura:** muestra las condiciones actuales y previstas.
- **Probabilidad de lluvia:** permite consultar las posibilidades de precipitación.
- **Viento:** presenta información sobre velocidad y condiciones del viento.
- **Calidad del aire:** consulta información ambiental.
- **Astronomía:** incluye información sobre fases lunares, iluminación y horarios solares.
- **Comparativa diaria:** permite comparar la temperatura actual con la del día anterior.
- **Modo oscuro:** se adapta a las preferencias del dispositivo.

### 🗺️ Mapa meteorológico
Clima G incorpora un mapa interactivo para explorar información meteorológica y ambiental.

Características:
- Visualización geográfica mediante OpenStreetMap.
- Capas meteorológicas de temperatura, viento y precipitación.
- Información de calidad del aire.
- Capa de terremotos mediante datos de USGS.
- Exploración de diferentes ubicaciones.
- Visualización temporal y evolución de las condiciones cuando los datos disponibles lo permiten.

**Importante:** el mapa reutiliza los datos y servicios que ya utiliza Clima G. No realiza consultas meteorológicas independientes a Open-Meteo para alimentar sus capas. Open-Meteo continúa siendo una fuente de la aplicación principal.

### 🐢 Sistema de Baco
- Supervisión meteorológica de las ubicaciones configuradas para Baco.
- Generación automatizada de reportes.
- Registro del estado meteorológico.
- Publicación de informes mediante el sistema de notificaciones configurado.

### 📱 Aplicación PWA
- Instalación en dispositivos compatibles.
- Interfaz adaptable a móviles y escritorio.
- Service Worker.
- Manifest de aplicación.
- Recursos preparados para funcionamiento web progresivo.

### 📊 Estadísticas
- GoatCounter registra las visitas del sitio.
- El panel permite consultar estadísticas de navegación.
- El contador del README utiliza el mismo servicio GoatCounter.

---

## 🤖 2. Esclavos trabajadores (GitHub Actions)

Clima G utiliza seis workflows automatizados en `.github/workflows/`.

| Robot | Archivo | Función |
|---|---|---|
| 🚀 Clima Alertas | `clima-alerta.yml` | Ejecuta revisiones periódicas cada 20 minutos y prepara el proceso de alertas. |
| 🐢 Baco Report | `baco-report.yml` | Genera el informe meteorológico de Baco y publica el resumen mediante ntfy. |
| 💬 Auto Responder | `auto-responder-issues.yml` | Responde automáticamente a nuevas Issues. |
| 🔐 CodeQL | `codeql.yml` | Analiza el código JavaScript en busca de problemas de seguridad. |
| ⚡ Lighthouse | `lighthouse.yml` | Audita rendimiento, accesibilidad y SEO. |
| 🌈 RGB Validator | `update_rgb.yml` | Comprueba la sintaxis y ejecuta las pruebas del generador RGB. |

### 🐢 Baco Report
- Se ejecuta diariamente a las 08:00 UTC.
- También permite ejecución manual.
- Consulta información meteorológica para las ubicaciones configuradas.
- Genera y actualiza `baco-report.json`.
- Publica el resumen mediante ntfy.

### 🚀 Clima Alertas
- Se ejecuta cada 20 minutos.
- Puede iniciarse manualmente.
- Utiliza secretos VAPID para preparar el sistema Web Push.
- El envío efectivo de notificaciones mediante Web Push requiere completar la llamada de envío correspondiente en el script.

### 🔐 CodeQL
- Analiza el código JavaScript.
- Se ejecuta en actualizaciones y solicitudes de integración configuradas.
- Incluye análisis programado.

### ⚡ Lighthouse
- Comprueba el sitio publicado en `docs`.
- Evalúa aspectos de rendimiento, accesibilidad y SEO.
- Conserva los resultados como artefactos de GitHub Actions.

### 🌈 RGB Validator
- Utiliza Python 3.12.
- Comprueba la sintaxis del generador RGB.
- Ejecuta las pruebas automáticas del script.

---

## 🛠️ 3. Tecnologías utilizadas

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Open-Meteo](https://img.shields.io/badge/OpenMeteo-0098FF?style=flat-square&logo=cloud&logoColor=white)](https://open-meteo.com/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![GoatCounter](https://img.shields.io/badge/Analytics-GoatCounter-5A9?style=flat-square)](https://www.goatcounter.com/)
[![USGS](https://img.shields.io/badge/Earthquakes-USGS-333?style=flat-square)](https://earthquake.usgs.gov/)

---

## 📁 4. Estructura del repositorio

```text
mi-clima/
├── .github/
│   ├── scripts/
│   │   └── send-push.js
│   └── workflows/
│       ├── auto-responder-issues.yml
│       ├── baco-report.yml
│       ├── clima-alerta.yml
│       ├── codeql.yml
│       ├── lighthouse.yml
│       └── update_rgb.yml
│
├── docs/
│   ├── index.html
│   ├── mapa.js
│   ├── sw.js
│   ├── manifest.json
│   ├── clima_rgb.py
│   ├── enviar-push.js
│   └── tools/
│
├── scripts/
├── netlify/
├── clima en python/
├── baco-report.json
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── package.json
├── netlify.toml
└── README.md
```

---

## 🚀 5. Uso local y despliegue

Clima G utiliza una estructura web estática cuyo contenido principal está en `docs/`.

### Clonar el repositorio

```bash
git clone https://github.com/ciberspar/mi-clima.git
cd mi-clima
```

### Ejecutar un servidor local

Con Python:

```bash
python3 -m http.server 8000 --directory docs
```

Después, abrir:

```text
http://localhost:8000
```

Algunas funciones del navegador, como GPS y notificaciones, requieren un contexto seguro HTTPS o localhost.

### Despliegue

El sitio se publica desde la carpeta `docs/` y utiliza el dominio:

**https://climag.duckdns.org**

---

## 📊 6. Estadísticas de visitas con GoatCounter

Clima G utiliza GoatCounter para registrar las visitas del sitio.

- **Panel:** https://gero.goatcounter.com
- **Dominio público:** https://climag.duckdns.org
- **Contador del README:** obtiene el total desde GoatCounter.

Sticker utilizado:

```md
[![Visitas GoatCounter](https://gero.goatcounter.com/counter/TOTAL.svg)](https://gero.goatcounter.com)
```

El contador depende de la configuración de visibilidad pública de GoatCounter y de la disponibilidad de su servicio.

---

## 🔒 7. Seguridad y privacidad

- No publicar claves privadas ni secretos en el repositorio.
- Utilizar GitHub Secrets para las credenciales de automatización.
- Mantener las dependencias actualizadas.
- Utilizar HTTPS para las funciones que lo requieren.
- Revisar los resultados de CodeQL.
- Consultar `SECURITY.md` para informar vulnerabilidades.

---

## 📜 8. Licencia

Este proyecto se distribuye bajo la licencia **MIT**.

Consulta el archivo [LICENSE](https://github.com/ciberspar/mi-clima/blob/main/LICENSE).

---

## 🐢 El Imperio de Baco

Clima G forma parte del pequeño universo tecnológico del Imperio de Baco.

**Desarrollado con curiosidad, tecnología y una tortuga como inspiración.** 🐢

[🌤️ Abrir Clima G](https://climag.duckdns.org) · [📦 GitHub](https://github.com/ciberspar/mi-clima) · [📊 GoatCounter](https://gero.goatcounter.com)
