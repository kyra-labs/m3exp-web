// JVM reference harness: minimal stand-ins for the few symbols the vendored, unmodified
// animation-core sources (SpringSimulation.kt, SpringEstimation.kt @19991f2c) import from other
// androidx modules. Each mirrors its upstream definition at the same commit (cited).
@file:Suppress("unused")

package androidx.compose.ui.util

// compose/ui/ui-util/.../InlineClassHelper.kt L52–71
fun packFloats(val1: Float, val2: Float): Long {
    val v1 = val1.toRawBits().toLong()
    val v2 = val2.toRawBits().toLong()
    return (v1 shl 32) or (v2 and 0xFFFFFFFF)
}

fun unpackFloat1(value: Long): Float = Float.fromBits((value shr 32).toInt())

fun unpackFloat2(value: Long): Float = Float.fromBits((value and 0xFFFFFFFF).toInt())

// compose/ui/ui-util MathHelpers: bit test equivalent to Double.isFinite().
fun Double.fastIsFinite(): Boolean = isFinite()
