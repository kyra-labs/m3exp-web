// JVM reference harness (carousel): compose foundation's SnapPosition, which the vendored
// KeylineSnapPosition.kt implements (gestures/snapping/SnapPosition.kt @19991f2c: the interface
// with `position`).
@file:Suppress("unused")

package androidx.compose.foundation.gestures.snapping

interface SnapPosition {
    fun position(
        layoutSize: Int,
        itemSize: Int,
        beforeContentPadding: Int,
        afterContentPadding: Int,
        itemIndex: Int,
        itemCount: Int,
    ): Int
}
