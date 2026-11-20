
package com.bacus.climag

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ClimaGApp()
        }
    }
}

// COLORES DE LA WEB CLIMA G
private val AzulOscuro = Color(0xFF0F1730)
private val AzulPrincipal = Color(0xFF1C2A4F)
private val AzulSecundario = Color(0xFF33507F)
private val AzulClaro = Color(0xFF7095C4)
private val AzulCielo = Color(0xFF0284C7)
private val AzulCieloClaro = Color(0xFF38BDF8)

private val FondoClaro = Color(0xFFEEF2F8)
private val FondoOscuro = Color(0xFF0B1120)
private val TarjetaOscura = Color(0xFF151F38)

private val TextoClaro = Color(0xFF12203A)
private val TextoOscuro = Color(0xFFF8FAFC)
private val TextoSecundarioClaro = Color(0xFF334155)
private val TextoSecundarioOscuro = Color(0xFFCBD5E1)

private val VerdeAlerta = Color(0xFF15803D)
private val AmarilloAlerta = Color(0xFFCA8A04)
private val NaranjaAlerta = Color(0xFFC2410C)
private val RojoAlerta = Color(0xFFB91C1C)

private enum class ClimaTab {
    HOY, SEMANA, AIRE, MAPA
}

@Composable
fun ClimaGApp() {
    var tab by remember { mutableStateOf(ClimaTab.HOY) }
    var pantallaCiudades by remember { mutableStateOf(false) }
    var pantallaAjustes by remember { mutableStateOf(false) }
    var temaOscuro by remember { mutableStateOf(false) }
    var unidadFahrenheit by remember { mutableStateOf(false) }

    var ciudad by remember { mutableStateOf("Detectando ubicación...") }
    var busqueda by remember { mutableStateOf("") }

    val fondo = if (temaOscuro) FondoOscuro else FondoClaro
    val tarjeta = if (temaOscuro) TarjetaOscura else Color.White
    val texto = if (temaOscuro) TextoOscuro else TextoClaro
    val secundario = if (temaOscuro) TextoSecundarioOscuro else TextoSecundarioClaro

    MaterialTheme(
        colorScheme = if (temaOscuro) {
            darkColorScheme(
                primary = AzulClaro,
                background = FondoOscuro,
                surface = TarjetaOscura,
                onSurface = TextoOscuro
            )
        } else {
            lightColorScheme(
                primary = AzulPrincipal,
                background = FondoClaro,
                surface = Color.White,
                onSurface = TextoClaro
            )
        }
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(fondo)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp, vertical = 12.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(tarjeta)
            ) {
                if (pantallaCiudades) {
                    CiudadesScreen(
                        ciudad = ciudad,
                        busqueda = busqueda,
                        onBusqueda = { busqueda = it },
                        onCerrar = { pantallaCiudades = false },
                        onSeleccionar = {
                            ciudad = it
                            pantallaCiudades = false
                            tab = ClimaTab.HOY
                        },
                        fondo = fondo,
                        texto = texto,
                        secundario = secundario
                    )
                } else if (pantallaAjustes) {
                    AjustesScreen(
                        temaOscuro = temaOscuro,
                        unidadFahrenheit = unidadFahrenheit,
                        onTema = { temaOscuro = it },
                        onUnidad = { unidadFahrenheit = it },
                        onCerrar = { pantallaAjustes = false },
                        tarjeta = tarjeta,
                        texto = texto,
                        secundario = secundario
                    )
                } else {
                    ClimaGHeader(
                        ciudad = ciudad,
                        tab = tab,
                        onTab = { tab = it },
                        onCiudades = { pantallaCiudades = true },
                        onAjustes = { pantallaAjustes = true },
                        unidad = if (unidadFahrenheit) "°F" else "°C"
                    )

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        when (tab) {
                            ClimaTab.HOY -> HoyScreen(
                                fondo = fondo,
                                tarjeta = tarjeta,
                                texto = texto,
                                secundario = secundario,
                                unidad = if (unidadFahrenheit) "°F" else "°C"
                            )

                            ClimaTab.SEMANA -> SemanaScreen(
                                fondo = fondo,
                                tarjeta = tarjeta,
                                texto = texto,
                                secundario = secundario,
                                unidad = if (unidadFahrenheit) "°F" else "°C"
                            )

                            ClimaTab.AIRE -> AireScreen(
                                fondo = fondo,
                                tarjeta = tarjeta,
                                texto = texto,
                                secundario = secundario
                            )

                            ClimaTab.MAPA -> MapaScreen(
                                fondo = fondo,
                                tarjeta = tarjeta,
                                texto = texto,
                                secundario = secundario
                            )
                        }

                        Text(
                            "Clima G • GitHub Pages • Bacus",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(18.dp),
                            color = secundario,
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ClimaGHeader(
    ciudad: String,
    tab: ClimaTab,
    onTab: (ClimaTab) -> Unit,
    onCiudades: () -> Unit,
    onAjustes: () -> Unit,
    unidad: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(
                    colors = listOf(AzulCielo, AzulCieloClaro)
                )
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            HeaderIcon("📋", onCiudades)
            Text(
                "Clima G",
                color = Color.White,
                fontSize = 23.sp,
                fontWeight = FontWeight.Bold
            )
            HeaderIcon("•••", onAjustes)
        }

        Text(
            ciudad,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            color = Color.White,
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center
        )

        Text(
            "BACUS WEATHER",
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 3.dp),
            color = Color.White.copy(alpha = 0.8f),
            fontSize = 10.sp,
            letterSpacing = 2.sp,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(12.dp))

        Text(
            "🌤️",
            modifier = Modifier.fillMaxWidth(),
            fontSize = 48.sp,
            textAlign = TextAlign.Center
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.Top
        ) {
            Text(
                "--",
                color = Color.White,
                fontSize = 66.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                unidad,
                color = Color.White,
                fontSize = 25.sp,
                modifier = Modifier.padding(top = 9.dp)
            )
        }

        Text(
            "Cargando datos del clima",
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )

        BacoCard()

        WeatherWindow()

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            HeaderTab("Hoy", ClimaTab.HOY, tab, onTab)
            HeaderTab("Semana", ClimaTab.SEMANA, tab, onTab)
            HeaderTab("Aire", ClimaTab.AIRE, tab, onTab)
            HeaderTab("Mapa", ClimaTab.MAPA, tab, onTab)
        }
    }
}

@Composable
private fun HeaderIcon(
    symbol: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.23f))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            symbol,
            color = Color.White,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun HeaderTab(
    title: String,
    value: ClimaTab,
    selected: ClimaTab,
    onClick: (ClimaTab) -> Unit
) {
    Column(
        modifier = Modifier
            .clickable { onClick(value) }
            .padding(horizontal = 18.dp, vertical = 11.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            title,
            color = if (selected == value) Color.White
            else Color.White.copy(alpha = 0.7f),
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp
        )

        Spacer(Modifier.height(7.dp))

        Box(
            modifier = Modifier
                .width(28.dp)
                .height(2.dp)
                .background(
                    if (selected == value) Color(0xFFFBBF24)
                    else Color.Transparent
                )
        )
    }
}

@Composable
private fun BacoCard() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.16f))
            .padding(13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("🐢", fontSize = 34.sp)

        Spacer(Modifier.width(12.dp))

        Column {
            Text(
                "DECRETO IMPERIAL DE BACO",
                color = Color(0xFFFEF08A),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Text(
                "Analizando condiciones meteorológicas...",
                color = Color.White,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun WeatherWindow() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0x40000000))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("☁️", fontSize = 27.sp)
        Text(
            "Cargando entorno...",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp
        )
        Text(
            "Simulación atmosférica",
            color = Color.White.copy(alpha = 0.85f),
            fontSize = 11.sp
        )
    }
}

@Composable
private fun HoyScreen(
    fondo: Color,
    tarjeta: Color,
    texto: Color,
    secundario: Color,
    unidad: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        SectionTitle("Estado del clima", texto)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(fondo)
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        "Estado del clima",
                        color = secundario,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Temperatura por hora",
                        color = secundario,
                        fontSize = 10.sp
                    )
                }
                Text("☁️  💧  🌬️", fontSize = 17.sp)
            }

            Spacer(Modifier.height(15.dp))

            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(19.dp)
            ) {
                listOf("Ahora", "09:00", "12:00", "15:00", "18:00", "21:00")
                    .forEach { hour ->
                        HourItem(hour, unidad, secundario, texto)
                    }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(fondo)
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "ASTRONOMÍA",
                    color = secundario,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Text("Fase lunar: --", color = secundario, fontSize = 11.sp)
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("🌑", fontSize = 38.sp)
                Spacer(Modifier.width(15.dp))
                Column {
                    Text("Iluminación aprox.", color = secundario, fontSize = 11.sp)
                    Text("-- %", color = texto, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MiniStat("🌙 Salida Luna", "--:--", fondo, tarjeta, texto, secundario)
                MiniStat("🌘 Puesta Luna", "--:--", fondo, tarjeta, texto, secundario)
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MiniStat("☀️ Salida Sol", "--:--", fondo, tarjeta, texto, secundario)
                MiniStat("🌅 Puesta Sol", "--:--", fondo, tarjeta, texto, secundario)
            }
        }

        SectionTitle("Condiciones actuales", texto)

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniStat("Sensación", "--$unidad", fondo, tarjeta, texto, secundario)
                MiniStat("Humedad", "-- %", fondo, tarjeta, texto, secundario)
                MiniStat("Viento", "-- km/h", fondo, tarjeta, texto, secundario)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniStat("Máx / Mín", "--° / --°", fondo, tarjeta, texto, secundario)
                MiniStat("Precipitación", "-- mm", fondo, tarjeta, texto, secundario)
                MiniStat("Presión", "-- hPa", fondo, tarjeta, texto, secundario)
            }

            MiniStat("Índice UV", "--", fondo, tarjeta, texto, secundario)
        }

        AlertCard(texto)

        Button(
            onClick = {},
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = AzulPrincipal
            )
        ) {
            Text("Actualizar clima", color = Color.White)
        }
    }
}

@Composable
private fun HourItem(
    hour: String,
    unidad: String,
    secundario: Color,
    texto: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(hour, color = secundario, fontSize = 11.sp)
        Spacer(Modifier.height(7.dp))
        Text("☀️", fontSize = 20.sp)
        Text(
            "--$unidad",
            color = texto,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun MiniStat(
    label: String,
    value: String,
    fondo: Color,
    tarjeta: Color,
    texto: Color,
    secundario: Color
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .clip(RoundedCornerShape(12.dp))
            .background(tarjeta)
            .padding(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            label,
            color = secundario,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(5.dp))
        Text(
            value,
            color = texto,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun AlertCard(texto: Color) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(VerdeAlerta)
            .padding(15.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "ALERTA METEOROLÓGICA",
            color = Color.White.copy(alpha = 0.9f),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            "🟢 Verde: No te preocupes",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun SemanaScreen(
    fondo: Color,
    tarjeta: Color,
    texto: Color,
    secundario: Color,
    unidad: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SectionTitle("Pronóstico semanal", texto)

        val dias = listOf(
            "Hoy", "Mañana", "Miércoles", "Jueves",
            "Viernes", "Sábado", "Domingo"
        )

        dias.forEachIndexed { index, dia ->
            var expandido by remember { mutableStateOf(false) }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(13.dp))
                    .background(fondo)
                    .clickable { expandido = !expandido }
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        dia,
                        modifier = Modifier.weight(1f),
                        color = texto,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Text("☀️", fontSize = 21.sp)
                    Spacer(Modifier.width(12.dp))
                    Text("-- mm", color = secundario, fontSize = 11.sp)
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "--° / --°",
                        color = texto,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (expandido) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Pronóstico por horas",
                        color = secundario,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(18.dp)
                    ) {
                        listOf("06:00", "09:00", "12:00", "15:00", "18:00", "21:00")
                            .forEach { HourItem(it, unidad, secundario, texto) }
                    }
                }
            }
        }
    }
}

@Composable
private fun AireScreen(
    fondo: Color,
    tarjeta: Color,
    texto: Color,
    secundario: Color
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        SectionTitle("Calidad del aire", texto)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(VerdeAlerta)
                .padding(22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "ÍNDICE DE CALIDAD DEL AIRE",
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "--",
                color = Color.White,
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Esperando datos de calidad del aire",
                color = Color.White,
                fontSize = 12.sp
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MiniStat("PM2.5", "-- µg/m³", fondo, tarjeta, texto, secundario)
            MiniStat("PM10", "-- µg/m³", fondo, tarjeta, texto, secundario)
            MiniStat("CO", "-- µg/m³", fondo, tarjeta, texto, secundario)
        }

        MiniStat(
            "Polen / Alérgenos",
            "Bajo / Moderado",
            fondo,
            tarjeta,
            texto,
            secundario
        )
    }
}

@Composable
private fun MapaScreen(
    fondo: Color,
    tarjeta: Color,
    texto: Color,
    secundario: Color
) {
    var capa by remember { mutableStateOf("Precipitación") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        Text(
            "🌍 Mapa meteorológico",
            color = texto,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )

        Text(
            "Explorá el mundo, compará las condiciones y consultá el pronóstico.",
            color = secundario,
            fontSize = 12.sp
        )

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            listOf(
                "🌧️ Precipitación",
                "🌡️ Temperatura",
                "🌬️ Viento",
                "🌫️ Calidad del aire",
                "🌎 Sismos"
            ).forEach { item ->
                FilterChip(
                    selected = capa == item.substringAfter(" "),
                    onClick = { capa = item.substringAfter(" ") },
                    label = { Text(item, fontSize = 11.sp) }
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(390.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(fondo),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🌍", fontSize = 54.sp)
                Spacer(Modifier.height(10.dp))
                Text(
                    "Mapa de Clima G",
                    color = texto,
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp
                )
                Text(
                    "Integración del mapa pendiente",
                    color = secundario,
                    fontSize = 12.sp
                )
            }
        }

        Text(
            "Capa seleccionada: $capa",
            color = secundario,
            fontSize = 11.sp
        )

        Text(
            "El mapa Android todavía debe conectarse al sistema de mapas de Clima G. No se incorpora un proveedor meteorológico nuevo.",
            color = secundario,
            fontSize = 11.sp
        )
    }
}

@Composable
private fun CiudadesScreen(
    ciudad: String,
    busqueda: String,
    onBusqueda: (String) -> Unit,
    onCerrar: () -> Unit,
    onSeleccionar: (String) -> Unit,
    fondo: Color,
    texto: Color,
    secundario: Color
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AzulOscuro)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Clima",
                color = Color.White,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold
            )
            TextButton(onClick = onCerrar) {
                Text("✕", color = Color.White, fontSize = 22.sp)
            }
        }

        Text(
            "Ubicaciones",
            color = Color.White.copy(alpha = 0.7f),
            fontSize = 12.sp
        )

        Spacer(Modifier.height(16.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(15.dp))
                .background(
                    Brush.linearGradient(
                        listOf(AzulCielo, AzulPrincipal)
                    )
                )
                .clickable { onSeleccionar(ciudad) }
                .padding(16.dp)
        ) {
            Text("📍 Mi ubicación", color = Color.White, fontWeight = FontWeight.Bold)
            Text(ciudad, color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp)
            Text("--°", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
        }

        Spacer(Modifier.height(14.dp))

        OutlinedTextField(
            value = busqueda,
            onValueChange = onBusqueda,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Buscar ciudad o aeropuerto") },
            singleLine = true,
            shape = RoundedCornerShape(15.dp)
        )

        Spacer(Modifier.height(8.dp))

        Button(
            onClick = {
                if (busqueda.isNotBlank()) {
                    onSeleccionar(busqueda.trim())
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = AzulCielo
            )
        ) {
            Text("Seleccionar ciudad")
        }

        Spacer(Modifier.height(12.dp))

        Text(
            "La búsqueda meteorológica y los favoritos se conectarán en la siguiente etapa.",
            color = Color.White.copy(alpha = 0.7f),
            fontSize = 11.sp
        )
    }
}

@Composable
private fun AjustesScreen(
    temaOscuro: Boolean,
    unidadFahrenheit: Boolean,
    onTema: (Boolean) -> Unit,
    onUnidad: (Boolean) -> Unit,
    onCerrar: () -> Unit,
    tarjeta: Color,
    texto: Color,
    secundario: Color
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(if (temaOscuro) FondoOscuro else FondoClaro)
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Configuración",
                color = texto,
                fontSize = 23.sp,
                fontWeight = FontWeight.Bold
            )
            TextButton(onClick = onCerrar) {
                Text("Cerrar")
            }
        }

        SettingsCard(tarjeta, texto, secundario) {
            Text(
                "Unidad de temperatura",
                color = texto,
                fontWeight = FontWeight.Bold
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Celsius (°C)", color = secundario)
                Switch(
                    checked = unidadFahrenheit,
                    onCheckedChange = onUnidad
                )
                Text("Fahrenheit (°F)", color = secundario)
            }
        }

        SettingsCard(tarjeta, texto, secundario) {
            Text(
                "Apariencia",
                color = texto,
                fontWeight = FontWeight.Bold
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Tema oscuro", color = secundario)
                Switch(
                    checked = temaOscuro,
                    onCheckedChange = onTema
                )
            }
        }

        SettingsCard(tarjeta, texto, secundario) {
            Text("Clima G", color = texto, fontWeight = FontWeight.Bold)
            Text("Clima G · Bacus", color = secundario, fontSize = 13.sp)
            Text("Versión 0.2.0", color = secundario, fontSize = 12.sp)
        }

        SettingsCard(tarjeta, texto, secundario) {
            Text("Integraciones", color = texto, fontWeight = FontWeight.Bold)
            Text("Mapa: pendiente de integración", color = secundario, fontSize = 12.sp)
            Text("Notificaciones: próximamente", color = secundario, fontSize = 12.sp)
            Text("Datos meteorológicos: pendiente", color = secundario, fontSize = 12.sp)
        }

        SettingsCard(tarjeta, texto, secundario) {
            Text("Información", color = texto, fontWeight = FontWeight.Bold)
            Text("Clima G · Bacus Weather", color = secundario, fontSize = 12.sp)
            Text("Aplicación Android nativa", color = secundario, fontSize = 12.sp)
        }
    }
}

@Composable
private fun SettingsCard(
    tarjeta: Color,
    texto: Color,
    secundario: Color,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = tarjeta),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            content = content
        )
    }
}

@Composable
private fun SectionTitle(
    title: String,
    color: Color
) {
    Text(
        title,
        color = color,
        fontSize = 17.sp,
        fontWeight = FontWeight.Bold
    )
}
