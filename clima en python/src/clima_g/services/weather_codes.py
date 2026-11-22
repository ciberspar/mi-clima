"""Códigos meteorológicos compartidos por Clima G."""

WEATHER_CODES = {
    0: ("Cielo despejado", "☀️"),
    1: ("Mayormente despejado", "🌤️"),
    2: ("Parcialmente nublado", "⛅"),
    3: ("Nublado", "☁️"),
    45: ("Neblina", "🌫️"),
    48: ("Neblina con escarcha", "🌫️"),
    51: ("Llovizna ligera", "🌦️"),
    53: ("Llovizna", "🌦️"),
    55: ("Llovizna intensa", "🌧️"),
    61: ("Lluvia ligera", "🌧️"),
    63: ("Lluvia", "🌧️"),
    65: ("Lluvia intensa", "🌧️"),
    71: ("Nevada ligera", "🌨️"),
    73: ("Nevada", "🌨️"),
    75: ("Nevada intensa", "❄️"),
    80: ("Chubascos", "🌦️"),
    81: ("Chubascos", "🌧️"),
    82: ("Chubascos intensos", "⛈️"),
    95: ("Tormenta", "⛈️"),
    96: ("Tormenta con granizo", "⛈️"),
    99: ("Tormenta con granizo", "⛈️"),
}


def describe_weather(code):
    """Devuelve descripción y emoji de un código meteorológico."""
    return WEATHER_CODES.get(code, ("Condiciones variables", "🌡️"))
