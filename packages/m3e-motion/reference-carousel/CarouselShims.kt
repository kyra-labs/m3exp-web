// JVM reference harness for m3e-motion's carousel port: the declarations the vendored, unmodified
// carousel sources (Arrangement.kt, KeylineList.kt, Keylines.kt, Strategy.kt,
// KeylineSnapPosition.kt @19991f2c) take from Carousel.kt, which needs the Compose runtime and
// cannot be compiled here. Each mirrors its upstream definition (cited).
@file:Suppress("unused")

package androidx.compose.material3.carousel

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

// Carousel.kt L722–826 (object CarouselDefaults): the size constants the keyline math reads.
object CarouselDefaults {
    val MinSmallItemSize: Dp = 40.dp
    val MaxSmallItemSize: Dp = 56.dp
    val ItemSpacing: Dp = 0.dp
    internal val AnchorSize = 10.dp
    internal const val MediumLargeItemDiffThreshold = 0.85f
}

// Carousel.kt L509–525.
@JvmInline
internal value class CarouselAlignment private constructor(internal val value: Int) {
    companion object {
        val Start
            get() = CarouselAlignment(-1)

        val Center
            get() = CarouselAlignment(0)

        val End
            get() = CarouselAlignment(1)
    }
}

// Carousel.kt L478–507: only the strategy KeylineSnapPosition reads (the pager's PageSize is not
// needed; the harness builds the Strategy as calculateMainAxisPageSize does).
internal class CarouselPageSize(val strategy: Strategy)
