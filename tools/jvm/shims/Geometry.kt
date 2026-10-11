// JVM reference harnesses: androidx.compose.ui.geometry stand-ins. Offset mirrors upstream
// (compose/ui/ui-geometry/.../Offset.kt @19991f2c: packed floats; getDistance L130–134, minus
// L169, plus L185, times L201 — all Float arithmetic).
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.ui.geometry

import androidx.compose.ui.util.packFloats
import androidx.compose.ui.util.unpackFloat1
import androidx.compose.ui.util.unpackFloat2
import kotlin.math.sqrt

@JvmInline
value class Offset(val packedValue: Long) {
    val x: Float
        get() = unpackFloat1(packedValue)

    val y: Float
        get() = unpackFloat2(packedValue)

    operator fun component1(): Float = x

    operator fun component2(): Float = y

    fun getDistance(): Float = sqrt(x * x + y * y)

    operator fun minus(other: Offset): Offset = Offset(x - other.x, y - other.y)

    operator fun plus(other: Offset): Offset = Offset(x + other.x, y + other.y)

    operator fun times(operand: Float): Offset = Offset(x * operand, y * operand)

    companion object {
        val Zero: Offset
            get() = Offset(0x0L)
    }
}

fun Offset(x: Float, y: Float): Offset = Offset(packFloats(x, y))

data class Size(val width: Float, val height: Float) {
    companion object {
        val Unspecified = Size(Float.NaN, Float.NaN)
    }
}

/** Size.kt: `Offset(width / 2f, height / 2f)` */
val Size.center: Offset
    get() = Offset(width / 2f, height / 2f)

data class Rect(val left: Float, val top: Float, val right: Float, val bottom: Float) {
    val width: Float
        get() = right - left

    val height: Float
        get() = bottom - top

    /** Rect.kt: `Offset(left + width / 2f, top + height / 2f)` */
    val center: Offset
        get() = Offset(left + width / 2f, top + height / 2f)
}

class MutableRect(var left: Float, var top: Float, var right: Float, var bottom: Float)
