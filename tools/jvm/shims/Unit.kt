// JVM reference harnesses: compile-only stand-ins for androidx.compose.ui.unit
// (layout direction, density) used only by Shape signatures.
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.ui.unit

enum class LayoutDirection { Ltr, Rtl }

interface Density {
    val density: Float
    val fontScale: Float
}
