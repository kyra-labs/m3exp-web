// JVM reference harness (carousel): compile-only stand-ins for androidx.compose.ui.unit as the
// vendored Keylines.kt uses them (`with(density) { CarouselDefaults.AnchorSize.toPx() }`).
// Density.kt / Dp.kt @19991f2c: Dp.toPx() = value * density.
@file:Suppress("unused")

package androidx.compose.ui.unit

@JvmInline value class Dp(val value: Float)

inline val Int.dp: Dp
    get() = Dp(this.toFloat())

interface Density {
    val density: Float
    val fontScale: Float

    fun Dp.toPx(): Float = value * density
}

fun Density(density: Float, fontScale: Float = 1f): Density =
    object : Density {
        override val density = density
        override val fontScale = fontScale
    }
