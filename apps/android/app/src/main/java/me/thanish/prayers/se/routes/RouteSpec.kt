package me.thanish.prayers.se.routes

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.painter.Painter
import androidx.navigation.NavController
import me.thanish.prayers.se.routes.compass.CompassRouteSpec
import me.thanish.prayers.se.routes.home.MainRouteSpec
import me.thanish.prayers.se.routes.journal.JournalRouteSpec
import me.thanish.prayers.se.routes.settings.SettingsRouteSpec

/**
 * Describes the type of route.
 */
enum class RouteType {
    PRIMARY,  // Route is included in main navigation
    SECONDARY // Route is not included in main navigation
}

/**
 * Describes the structure of a route.
 */
data class RouteSpec(
    val name: String,
    val text: Int,
    val type: RouteType = RouteType.PRIMARY,
    val icon: @Composable () -> Pair<Painter, Painter>,
    val content: @Composable (NavController, Modifier) -> Unit
) {
    /**
     * getLabel returns the label for the route.
     */
    fun getLabel(context: Context): String {
        return context.getString(text)
    }
}

/**
 * A list of all the routes in the app.
 */
val routes = listOf(MainRouteSpec, JournalRouteSpec, CompassRouteSpec, SettingsRouteSpec)

/**
 * The default route to use when navigating.
 */
val defaultRoute = MainRouteSpec
