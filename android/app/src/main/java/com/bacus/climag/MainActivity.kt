
package com.bacus.climag

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ClimaGTheme {
                ClimaGApp()
            }
        }
    }
}

private val Azul = Color(0xFF087DB5)
private val Fondo = Color(0xFFF0F4F9)
private val Texto = Color(0xFF17243B)

@Composable
fun ClimaGTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Azul,
            background = Fondo,
            surface = Color.White,
            onSurface = Texto
        ),
        content = content
    )
}

@Composable
fun ClimaGApp() {
    var selectedTab by remember { mutableStateOf("Hoy") }
    var search by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("Mi ubicación") }
    var unit by remember { mutableStateOf("°C") }

    val tabs = listOf(
        "Hoy", "Por horas", "Semana", "Mapa",
        "Aire", "Astronomía", "Ciudades"
    )

    Scaffold(
        containerColor = Fondo,
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                listOf("Hoy", "Mapa", "Ciudades", "Ajustes").forEach { item ->
                    NavigationBarItem(
                        selected = selectedTab == item,
                        onClick = { selectedTab = item },
                        icon = {
                            Text(
                                when (item) {
                                    "Hoy" -> "☀"
                                    "Mapa" -> "🌎"
                                    "Ciudades" -> "📍"
                                    else -> "⚙"
                                }
                            )
                        },
                        label = { Text(item) }
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Header()

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                tabs.forEach { tab ->
                    FilterChip(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        label = { Text(tab) }
                    )
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Spacer(Modifier.height(4.dp))

                when (selectedTab) {
                    "Hoy" -> {
                        WeatherHero(city, unit)

                        Text(
                            "Tu clima",
                            fontSize = 21.sp,
                            fontWeight = FontWeight.Bold
                        )

                        SectionCard("Condiciones actuales") {
                            MetricGrid()
                        }

                        SectionCard("Pronóstico por horas") {
                            HourForecast()
                        }

                        SectionCard("Alertas meteorológicas") {
                            Text("Esperando datos meteorológicos.")
                        }

                        SectionCard("Calidad del aire") {
                            Text("Índice AQI: --")
                            Text("PM2.5: --     PM10: --")
                        }

                        SectionCard("Astronomía") {
                            Text("☀ Amanecer: --")
                            Text("🌇 Atardecer: --")
                            Text("🌙 Fase lunar: --")
                        }
                    }

                    "Por horas" -> {
                        PageTitle("Pronóstico por horas")

                        SectionCard("Próximas horas") {
                            HourForecast()
                        }
                    }

                    "Semana" -> {
                        PageTitle("Pronóstico semanal")

                        repeat(7) { index ->
                            SectionCard(
                                listOf(
                                    "Hoy",
                                    "Mañana",
                                    "Miércoles",
                                    "Jueves",
                                    "Viernes",
                                    "Sábado",
                                    "Domingo"
                                )[index]
                            ) {
                                Text("☀️  --° / --°     Precipitación: --")
                            }
                        }
                    }

                    "Mapa" -> {
                        PageTitle("Mapa meteorológico")

                        SectionCard("Mapa de Clima G") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(260.dp)
                                    .background(
                                        Color(0xFFDCEAF1),
                                        RoundedCornerShape(18.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "🌎\nMapa interactivo pendiente",
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }

                            Text(
                                "Capas: temperatura · lluvia · viento · aire · sismos"
                            )
                        }
                    }

                    "Aire" -> {
                        PageTitle("Calidad del aire")

                        SectionCard("Índice de calidad del aire") {
                            Text(
                                "AQI: --",
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text("PM2.5: -- µg/m³")
                            Text("PM10: -- µg/m³")
                            Text("Monóxido de carbono: --")
                        }
                    }

                    "Astronomía" -> {
                        PageTitle("Astronomía")

                        SectionCard("Sol") {
                            Text("🌅 Amanecer: --")
                            Text("🌇 Atardecer: --")
                        }

                        SectionCard("Luna") {
                            Text("🌕 Fase lunar: --")
                            Text("Iluminación: --")
                            Text("Salida y puesta: --")
                        }
                    }

                    "Ciudades" -> {
                        PageTitle("Mis ciudades")

                        SectionCard("Buscar ubicación") {
                            BasicTextField(
                                value = search,
                                onValueChange = { search = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        Fondo,
                                        RoundedCornerShape(12.dp)
                                    )
                                    .padding(14.dp),
                                singleLine = true,
                                decorationBox = { inner ->
                                    if (search.isEmpty()) {
                                        Text("Escribí una ciudad...")
                                    }
                                    inner()
                                }
                            )

                            Button(
                                onClick = {
                                    if (search.isNotBlank()) {
                                        city = search.trim()
                                        selectedTab = "Hoy"
                                        search = ""
                                    }
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Seleccionar ciudad")
                            }

                            Text(
                                "La búsqueda meteorológica se conectará en la siguiente etapa."
                            )
                        }
                    }

                    "Ajustes" -> {
                        PageTitle("Configuración")

                        SectionCard("Unidad de temperatura") {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Celsius")

                                Spacer(Modifier.width(8.dp))

                                Switch(
                                    checked = unit == "°F",
                                    onCheckedChange = {
                                        unit = if (it) "°F" else "°C"
                                    }
                                )

                                Text("Fahrenheit")
                            }
                        }

                        SectionCard("Clima G") {
                            Text("Clima G · Bacus")
                            Text("Versión 0.2.0 en desarrollo")
                        }

                        SectionCard("Integraciones") {
                            Text("Android Auto: próximamente")
                            Text("Notificaciones: próximamente")
                        }
                    }

                    else -> {
                        PageTitle(selectedTab)
                    }
                }

                Spacer(Modifier.height(12.dp))

                Text(
                    "Clima G · Bacus",
                    modifier = Modifier.fillMaxWidth(),
                    color = Color.Gray,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
fun Header() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                "Clima G",
                color = Azul,
                fontSize = 27.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                "BACUS WEATHER",
                fontSize = 10.sp,
                color = Color.Gray
            )
        }

        Text("🐢", fontSize = 27.sp)
    }
}

@Composable
fun WeatherHero(city: String, unit: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.Transparent
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        listOf(
                            Color(0xFF087DB5),
                            Color(0xFF38BDF8)
                        )
                    )
                )
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("📍 $city", color = Color.White, fontSize = 16.sp)

            Spacer(Modifier.height(12.dp))

            Text("☀️", fontSize = 55.sp)

            Text(
                "--$unit",
                color = Color.White,
                fontSize = 62.sp,
                fontWeight = FontWeight.Light
            )

            Text(
                "Esperando datos meteorológicos",
                color = Color.White
            )

            Text(
                "Sensación térmica: --",
                color = Color.White.copy(alpha = 0.85f)
            )
        }
    }
}

@Composable
fun MetricGrid() {
    val metrics = listOf(
        "Humedad" to "-- %",
        "Viento" to "-- km/h",
        "Presión" to "-- hPa",
        "UV" to "--",
        "Nubosidad" to "-- %",
        "Lluvia" to "-- mm"
    )

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        metrics.chunked(2).forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                row.forEach { metric ->
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                Fondo,
                                RoundedCornerShape(14.dp)
                            )
                            .padding(14.dp)
                    ) {
                        Text(
                            metric.first,
                            color = Color.Gray,
                            fontSize = 12.sp
                        )

                        Text(
                            metric.second,
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun HourForecast() {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        listOf(
            "Ahora",
            "09:00",
            "12:00",
            "15:00",
            "18:00",
            "21:00"
        ).forEach { hour ->
            Column(
                modifier = Modifier
                    .background(
                        Fondo,
                        RoundedCornerShape(14.dp)
                    )
                    .padding(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(hour, fontSize = 12.sp)
                Text("☀️", fontSize = 22.sp)
                Text("--°", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun SectionCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp
        )
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                title,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )

            content()
        }
    }
}

@Composable
fun PageTitle(title: String) {
    Text(
        title,
        fontSize = 23.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}
