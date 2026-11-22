from clima_g.services.baco import generar_decreto


def test_baco_con_lluvia():
    resultado = generar_decreto(25, 61, 3)
    assert resultado["emoji"] == "🌧️🐢"


def test_baco_dia_optimo():
    resultado = generar_decreto(25, 0, 5)
    assert resultado["titulo"] == "Día óptimo"


def test_baco_frio():
    resultado = generar_decreto(10, 0, 3)
    assert resultado["titulo"] == "Ahorro de energía"


def test_baco_uv_elevado():
    resultado = generar_decreto(20, 0, 9)
    assert resultado["titulo"] == "Protección solar"
