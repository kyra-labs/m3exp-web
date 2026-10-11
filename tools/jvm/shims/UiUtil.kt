// JVM reference harnesses: stand-ins for androidx.compose.ui.util helpers imported by vendored,
// unmodified androidx sources. Each mirrors its upstream definition at the androidx pin (cited).
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.ui.util

// compose/ui/ui-util/.../InlineClassHelper.kt L52–71
fun packFloats(val1: Float, val2: Float): Long {
    val v1 = val1.toRawBits().toLong()
    val v2 = val2.toRawBits().toLong()
    return (v1 shl 32) or (v2 and 0xFFFFFFFF)
}

fun unpackFloat1(value: Long): Float = Float.fromBits((value shr 32).toInt())

fun unpackFloat2(value: Long): Float = Float.fromBits((value and 0xFFFFFFFF).toInt())

// compose/ui/ui-util MathHelpers: bit tests equivalent to isFinite().
fun Double.fastIsFinite(): Boolean = isFinite()

fun Float.fastIsFinite(): Boolean = isFinite()

// compose/ui/ui-util MathHelpers: min/max of four values.
fun fastMinOf(a: Float, b: Float, c: Float, d: Float): Float = minOf(a, minOf(b, minOf(c, d)))

fun fastMaxOf(a: Float, b: Float, c: Float, d: Float): Float = maxOf(a, maxOf(b, maxOf(c, d)))

// compose/ui/ui-util ListUtils: index-based iteration over a List.
inline fun <T> List<T>.fastForEach(action: (T) -> Unit) {
    for (index in indices) action(get(index))
}

inline fun <T, R> List<T>.fastMap(transform: (T) -> R): List<R> {
    val target = ArrayList<R>(size)
    fastForEach { target.add(transform(it)) }
    return target
}
