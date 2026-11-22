"""Decreto Imperial de Baco de Clima G."""

RAIN_CODES = {
    51, 53, 55, 61, 63, 65,
    80, 81, 82, 95, 96, 99
}


def generar_decreto(temp_c, weather_code, uv_index):
    """Genera el estado de Baco según las condiciones meteorológicas."""

    if weather_code in RAIN_CODES:
        return {
            "emoji": "🌧️🐢",
            "titulo": "Repliegue táctico",
            "mensaje": (
                "Baco se resguardó en el caparazón. "
                "Repliegue táctico por lluvia."
            ),
        }

    if temp_c >= 23 and uv_index < 8:
        return {
            "emoji": "☀️🐢",
            "titulo": "Día óptimo",
            "mensaje": (
                "Baco está tomando sol en el balcón "
                "a capacidad máxima."
            ),
        }

    if temp_c < 15:
        return {
            "emoji": "❄️🐢",
            "titulo": "Ahorro de energía",
            "mensaje": (
                "Fresco en la zona. "
                "Baco declaró estado de ahorro de energía."
            ),
        }

    if uv_index >= 8:
        return {
            "emoji": "🕶️🐢",
            "titulo": "Protección solar",
            "mensaje": (
                "UV elevado. Baco exige sombra "
                "y agua fresca para todos."
            ),
        }

    return {
        "emoji": "🚶‍♂️🐢",
        "titulo": "Inspección de rutina",
        "mensaje": (
            "Clima templado. Baco realiza "
            "la inspección de rutina del balcón."
        ),
    }
