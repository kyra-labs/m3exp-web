// JVM reference harness (carousel): the androidx.compose.ui.util helpers the vendored carousel
// sources import beyond tools/jvm/shims/UiUtil.kt. Each mirrors its upstream definition at the
// androidx pin (compose/ui/ui-util/src/commonMain/kotlin/androidx/compose/ui/util @19991f2c).
@file:Suppress("unused")

package androidx.compose.ui.util

// MathHelpers.kt L25–27.
fun lerp(start: Float, stop: Float, fraction: Float): Float {
    return (1 - fraction) * start + fraction * stop
}

// ListUtils.kt L69–75.
inline fun <T> List<T>.fastForEachIndexed(action: (Int, T) -> Unit) {
    for (index in indices) {
        val item = get(index)
        action(index, item)
    }
}

// ListUtils.kt L116–120.
inline fun <T> List<T>.fastFirstOrNull(predicate: (T) -> Boolean): T? {
    fastForEach { if (predicate(it)) return it }
    return null
}

// ListUtils.kt L229–234.
inline fun <T> List<T>.fastFilter(predicate: (T) -> Boolean): List<T> {
    val target = ArrayList<T>(size)
    fastForEach { if (predicate(it)) target += (it) }
    return target
}

// ListUtils.kt L288–293.
inline fun <T, R> List<T>.fastMapIndexed(transform: (index: Int, T) -> R): List<R> {
    val target = ArrayList<R>(size)
    fastForEachIndexed { index, e -> target += transform(index, e) }
    return target
}
