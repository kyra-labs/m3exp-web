// compose ui-unit Dp and IntOffset for the date picker's VERBATIM blocks (tools/jvm/shims/Unit.kt
// has LayoutDirection and Density).
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.ui.unit

@JvmInline
value class Dp(val value: Float) : Comparable<Dp> {
    override fun compareTo(other: Dp): Int = value.compareTo(other.value)

    operator fun times(other: Int): Dp = Dp(value * other)

    operator fun minus(other: Dp): Dp = Dp(value - other.value)
}

inline val Int.dp: Dp
    get() = Dp(this.toFloat())

inline val Double.dp: Dp
    get() = Dp(this.toFloat())

data class IntOffset(val x: Int, val y: Int)
