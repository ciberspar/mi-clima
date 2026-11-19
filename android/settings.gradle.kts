
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()

        // Repositorio alternativo de Maven Central
        maven {
            url = uri("https://repo1.maven.org/maven2")
        }

        mavenCentral()
    }
}

rootProject.name = "ClimaG"

include(":app")
