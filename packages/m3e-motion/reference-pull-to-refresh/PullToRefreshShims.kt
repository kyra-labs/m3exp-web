// Minimal stand-ins for the Compose APIs the VERBATIM blocks of PullToRefreshReference.kt call
// (compose ui-unit Dp / Density, ui-geometry Offset / Size / Rect, ui-graphics Path and the
// DrawScope draw calls, the PullToRefreshState animations). Float math is Kotlin's own; DrawScope
// records what is drawn and the rotations active around it instead of rasterizing.
package androidx.compose.material3.pulltorefresh

import kotlin.math.roundToInt

annotation class Immutable

@JvmInline value class Dp(val value: Float)

val Int.dp: Dp
    get() = Dp(this.toFloat())

val Double.dp: Dp
    get() = Dp(this.toFloat())

open class Density(val density: Float) {
    fun Dp.toPx(): Float = value * density

    // Compose: `toPx().fastRoundToInt()` (Math.round of the Float).
    fun Dp.roundToPx(): Int = toPx().roundToInt()
}

class Offset(val x: Float, val y: Float)

class Size(val width: Float, val height: Float)

// ui-geometry `Size.center`: Offset(width / 2f, height / 2f).
val Size.center: Offset
    get() = Offset(width / 2f, height / 2f)

class Rect(val left: Float, val top: Float, val right: Float, val bottom: Float) {
    // ui-geometry `Rect(center, radius)`.
    constructor(
        center: Offset,
        radius: Float,
    ) : this(center.x - radius, center.y - radius, center.x + radius, center.y + radius)

    val width: Float
        get() = right - left

    val height: Float
        get() = bottom - top

    val topLeft: Offset
        get() = Offset(left, top)

    val size: Size
        get() = Size(width, height)

    val center: Offset
        get() = Offset(left + width / 2f, top + height / 2f)
}

class Path {
    val points = mutableListOf<Float>()

    fun reset() = points.clear()

    fun moveTo(x: Float, y: Float) {
        points += x
        points += y
    }

    fun lineTo(x: Float, y: Float) {
        points += x
        points += y
    }

    // ui-graphics `Path.translate`: every point moves by the offset.
    fun translate(offset: Offset) {
        for (i in points.indices) points[i] = points[i] + if (i % 2 == 0) offset.x else offset.y
    }
}

object Color

enum class StrokeCap {
    Butt
}

class Stroke(val width: Float, val cap: StrokeCap = StrokeCap.Butt)

class State<T>(val value: T)

/** The PullToRefreshState calls the node makes; the animations themselves are not modelled. */
class PullToRefreshState {
    suspend fun animateToThreshold() {}

    suspend fun animateToHidden() {}
}

class DrawnArc(
    val rotations: List<Float>,
    val left: Float,
    val top: Float,
    val width: Float,
    val height: Float,
    val startAngle: Float,
    val sweepAngle: Float,
    val strokeWidth: Float,
)

class DrawnPath(val rotations: List<Float>, val points: List<Float>, val strokeWidth: Float)

/** A canvas of `side` px at `density`: records draws and the rotations (about its center). */
class DrawScope(density: Float, side: Float) : Density(density) {
    val size = Size(side, side)
    private val rotations = mutableListOf<Float>()
    val arcs = mutableListOf<DrawnArc>()
    val paths = mutableListOf<DrawnPath>()

    fun rotate(degrees: Float, block: DrawScope.() -> Unit) {
        rotations += degrees
        block()
        rotations.removeAt(rotations.size - 1)
    }

    @Suppress("UNUSED_PARAMETER")
    fun drawArc(
        color: Color,
        alpha: Float,
        startAngle: Float,
        sweepAngle: Float,
        useCenter: Boolean,
        topLeft: Offset,
        size: Size,
        style: Stroke,
    ) {
        arcs +=
            DrawnArc(
                rotations.toList(),
                topLeft.x,
                topLeft.y,
                size.width,
                size.height,
                startAngle,
                sweepAngle,
                style.width,
            )
    }

    @Suppress("UNUSED_PARAMETER")
    fun drawPath(path: Path, color: Color, alpha: Float, style: Stroke) {
        paths += DrawnPath(rotations.toList(), path.points.toList(), style.width)
    }
}
