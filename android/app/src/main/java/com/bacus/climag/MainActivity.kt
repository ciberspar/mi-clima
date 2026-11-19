package com.bacus.climag

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
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

private val ClimaColors = lightColorScheme(
    primary = Color(0xFF087DB5),
    secondary = Color(0xFF38BDF8),
    background = Color(0xFFEEF2F8),
    surface = Color.White,
    onSurface = Color(0xFF12203A)
)

@Composable
fun ClimaGTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ClimaColors,
        content = content
    )
}

@Composable
fun ClimaGApp() {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Header()

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
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
                                    Color(0xFF0284C7),
                                    Color(0xFF38BDF8)
                                )
                            )
                        )
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "MI UBICACIÓN",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp
                    )

                    Spacer(Modifier.height(12.dp))

                    Text(
                        text = "Ubicación pendiente",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(Modifier.height(8.dp))

                    Text(
                        text = "--°",
                        color = Color.White,
                        fontSize = 64.sp,
                        fontWeight = FontWeight.Light
                    )

                    Text(
                        text = "Esperando conexión meteorológica",
                        color = Color.White,
                        fontSize = 13.sp
                    )
                }
            }

            Text(
                text = "Tu clima",
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold
            )

            InfoCard(
                title = "Pronóstico",
                description = "Aquí aparecerá el pronóstico de tu ubicación."
            )

            InfoCard(
                title = "Alertas meteorológicas",
                description = "Aquí aparecerán las alertas disponibles."
            )

            InfoCard(
                title = "Calidad del aire",
                description = "Información de calidad del aire pendiente."
            )

            Spacer(Modifier.weight(1f))

            Text(
                text = "Clima G · Bacus · 0.1.0",
                modifier = Modifier.fillMaxWidth(),
                color = Color.Gray,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun Header() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Clima G",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF087DB5)
        )

        Spacer(Modifier.width(8.dp))

        Text(
            text = "BACUS",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color.Gray
        )
    }
}

@Composable
fun InfoCard(
    title: String,
    description: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp
        )
    ) {
        Column(
            modifier = Modifier.padding(18.dp)
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp
            )

            Spacer(Modifier.height(6.dp))

            Text(
                text = description,
                color = Color.Gray,
                fontSize = 13.sp
            )
        }
    }
}
