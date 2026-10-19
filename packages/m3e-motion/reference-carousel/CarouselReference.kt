// JVM reference harness for @kyralabs/m3e-motion's carousel port (carousel-keylines.ts,
// carousel-strategy.ts, carousel.ts). Compiled with the *unmodified* vendored Arrangement.kt,
// KeylineList.kt, Keylines.kt, Strategy.kt and KeylineSnapPosition.kt
// (packages/m3e-codegen/vendor/androidx-material3-carousel @19991f2c) and the shims beside this
// file; run by tools/jvm/kotlin.mjs (`pnpm reference:carousel`); prints JSON to stdout.
//
// For each case: the keyline list the layout's composable builds (Carousel.kt L108–303), the
// Strategy CarouselPageSize creates (L488–506), the snap offsets, the max scroll offset (L696–702)
// and, at a set of scroll offsets, every item's placement as Modifier.carouselItem computes it
// (L587–641, transcribed below because Carousel.kt needs the Compose runtime).
package androidx.compose.material3.carousel

import androidx.compose.ui.unit.Density
import kotlin.math.roundToInt

private class Case(
    val name: String,
    val layout: String,
    val availableSpace: Float,
    val itemSize: Float?,
    val itemSpacing: Float,
    val itemCount: Int,
    val beforeContentPadding: Float,
    val afterContentPadding: Float,
)

private val density = Density(1f)

private fun keylines(c: Case): KeylineList =
    when (c.layout) {
        // HorizontalMultiBrowseCarousel (L125–137)
        "multi-browse" ->
            multiBrowseKeylineList(
                density = density,
                carouselMainAxisSize = c.availableSpace,
                preferredItemSize = c.itemSize!!,
                itemCount = c.itemCount,
                itemSpacing = c.itemSpacing,
            )
        // HorizontalUncontainedCarousel (L193–202)
        "uncontained" ->
            uncontainedKeylineList(
                density = density,
                carouselMainAxisSize = c.availableSpace,
                itemSize = c.itemSize!!,
                itemSpacing = c.itemSpacing,
            )
        // HorizontalCenteredHeroCarousel (L278–292); the start-aligned hero is isCentered = false.
        else ->
            heroKeylineList(
                density = density,
                carouselMainAxisSize = c.availableSpace,
                preferredItemSize = c.itemSize,
                itemSpacing = c.itemSpacing,
                itemCount = c.itemCount,
                isCentered = c.layout == "centered-hero",
            )
    }

private fun n(f: Float): String = if (f.isFinite()) f.toString() else "null"

private fun encode(list: KeylineList): String =
    list.joinToString(", ", "[", "]") {
        "[${n(it.size)}, ${n(it.offset)}, ${n(it.unadjustedOffset)}, ${n(it.cutoff)}, " +
            "${if (it.isFocal) 1 else 0}, ${if (it.isAnchor) 1 else 0}, ${if (it.isPivot) 1 else 0}]"
    }

// Carousel.kt L713–720 (private getProgress).
private fun progress(before: Keyline, after: Keyline, unadjustedOffset: Float): Float {
    if (before == after) return 1f
    val total = after.unadjustedOffset - before.unadjustedOffset
    return (unadjustedOffset - before.unadjustedOffset) / total
}

// Carousel.kt L696–702 (calculateMaxScrollOffset, with the pager's page count).
private fun maxScrollOffset(strategy: Strategy, itemCount: Int): Float {
    val count = itemCount.toFloat()
    val maxScrollPossible = (strategy.itemMainAxisSize * count) + (strategy.itemSpacing * (count - 1))
    return (maxScrollPossible - strategy.availableSpace).coerceAtLeast(0f)
}

// Carousel.kt L587–641 (Modifier.carouselItem's placement block, horizontal): size, mask left,
// mask right, translation, clipped.
private fun item(strategy: Strategy, index: Int, scrollOffset: Float, max: Float): String {
    val keylines = strategy.getKeylineListForScrollOffset(scrollOffset, max)
    val itemSizeWithSpacing = strategy.itemMainAxisSize + strategy.itemSpacing
    val unadjustedCenter =
        (index * itemSizeWithSpacing) + (strategy.itemMainAxisSize / 2f) - scrollOffset
    val keylineBefore = keylines.getKeylineBefore(unadjustedCenter)
    val keylineAfter = keylines.getKeylineAfter(unadjustedCenter)
    val p = progress(keylineBefore, keylineAfter, unadjustedCenter)
    val interpolatedKeyline = lerp(keylineBefore, keylineAfter, p)
    val isOutOfKeylineBounds = keylineBefore == keylineAfter
    val width = strategy.itemMainAxisSize.roundToInt().toFloat()
    val centerX = strategy.itemMainAxisSize / 2f
    val halfMaskWidth = interpolatedKeyline.size / 2f
    val maskLeft = centerX - halfMaskWidth
    val maskRight = centerX + halfMaskWidth
    val shouldClip = maskLeft != 0f || maskRight != width
    var translation = interpolatedKeyline.offset - unadjustedCenter
    if (isOutOfKeylineBounds) {
        val outOfBoundsOffset =
            (unadjustedCenter - interpolatedKeyline.unadjustedOffset) / interpolatedKeyline.size
        translation += outOfBoundsOffset
    }
    return "[${n(interpolatedKeyline.size)}, ${n(maskLeft)}, ${n(maskRight)}, ${n(translation)}, " +
        "${if (shouldClip) 1 else 0}]"
}

fun main() {
    val cases =
        listOf(
            // CarouselSamples.kt: 412dp window, 186dp, 8dp spacing, 16dp horizontal padding.
            Case("multi-browse sample 412", "multi-browse", 412f, 186f, 8f, 8, 16f, 16f),
            Case("multi-browse 380 no padding", "multi-browse", 380f, 186f, 8f, 6, 0f, 0f),
            Case("multi-browse wide 1000", "multi-browse", 1000f, 186f, 8f, 10, 16f, 16f),
            Case("multi-browse 3 items", "multi-browse", 456f, 200f, 0f, 3, 0f, 0f),
            Case("multi-browse odd sizes", "multi-browse", 333f, 121.5f, 4f, 7, 12f, 20f),
            Case("multi-browse narrower than an item", "multi-browse", 100f, 200f, 0f, 5, 0f, 0f),
            Case("uncontained sample 412", "uncontained", 412f, 186f, 8f, 6, 16f, 16f),
            Case("uncontained 400 / 125", "uncontained", 400f, 125f, 0f, 6, 0f, 0f),
            Case("uncontained 1000 / 501", "uncontained", 1000f, 501f, 0f, 4, 0f, 0f),
            Case("hero 412 fill", "hero", 412f, null, 8f, 6, 16f, 16f),
            Case("hero 1000 / 300", "hero", 1000f, 300f, 8f, 7, 16f, 16f),
            Case("hero 2 items", "hero", 360f, null, 0f, 2, 0f, 0f),
            // HorizontalCenteredHeroCarouselSample: 412dp less the 24dp horizontal padding.
            Case("centered hero sample 364", "centered-hero", 364f, null, 8f, 6, 16f, 16f),
            Case("centered hero 980 / 300", "centered-hero", 980f, 300f, 12f, 7, 0f, 0f),
            Case("centered hero 2 items", "centered-hero", 180f, null, 0f, 2, 0f, 0f),
            Case("centered hero 1 item", "centered-hero", 120f, null, 0f, 1, 0f, 0f),
        )

    val out = StringBuilder()
    out.append("{\n  \"generator\": \"packages/m3e-motion/reference-carousel/CarouselReference.kt\",\n")
    out.append("  \"kotlin\": \"${KotlinVersion.CURRENT}\",\n")
    out.append("  \"cases\": [\n")
    cases.forEachIndexed { ci, c ->
        val strategy =
            Strategy(
                keylines(c),
                c.availableSpace,
                c.itemSpacing,
                c.beforeContentPadding,
                c.afterContentPadding,
            )
        out.append("    {\"name\": \"${c.name}\", \"layout\": \"${c.layout}\", ")
        out.append("\"availableSpace\": ${n(c.availableSpace)}, ")
        out.append("\"itemSize\": ${c.itemSize?.let { n(it) } ?: "null"}, ")
        out.append("\"itemSpacing\": ${n(c.itemSpacing)}, \"itemCount\": ${c.itemCount}, ")
        out.append("\"beforeContentPadding\": ${n(c.beforeContentPadding)}, ")
        out.append("\"afterContentPadding\": ${n(c.afterContentPadding)}, ")
        out.append("\"valid\": ${strategy.isValid},\n")
        out.append("      \"defaultKeylines\": ${encode(strategy.defaultKeylines)},\n")
        out.append(
            "      \"startSteps\": [${strategy.startKeylineSteps.joinToString(", ") { encode(it) }}],\n"
        )
        out.append(
            "      \"endSteps\": [${strategy.endKeylineSteps.joinToString(", ") { encode(it) }}]"
        )
        if (strategy.isValid) {
            val pageSize = CarouselPageSize(strategy)
            val snap = KeylineSnapPosition(pageSize)
            val snaps = (0 until c.itemCount).map { snap.position(0, 0, 0, 0, it, c.itemCount) }
            val max = maxScrollOffset(strategy, c.itemCount)
            val sws = strategy.itemMainAxisSize + strategy.itemSpacing
            // Rest positions (index * size - snap, as the pager scrolls), midpoints and the ends.
            val rests = snaps.mapIndexed { i, s -> ((i * sws) - s).coerceIn(0f, max) }
            val offsets = mutableListOf(0f, max)
            rests.forEachIndexed { i, r ->
                offsets += r
                if (i > 0) offsets += (rests[i - 1] + r) / 2f
            }
            offsets += max / 3f
            val frames =
                offsets.distinct().sorted().joinToString(",\n") { scroll ->
                    val items = (0 until c.itemCount).joinToString(", ") { item(strategy, it, scroll, max) }
                    "        {\"scrollOffset\": ${n(scroll)}, \"items\": [$items]}"
                }
            out.append(",\n      \"itemMainAxisSize\": ${n(strategy.itemMainAxisSize)},\n")
            out.append("      \"snapOffsets\": [${snaps.joinToString(", ")}],\n")
            out.append("      \"maxScrollOffset\": ${n(max)},\n")
            out.append("      \"frames\": [\n$frames\n      ]")
        } else {
            out.append(",\n      \"snapOffsets\": [], \"maxScrollOffset\": 0.0, \"frames\": []")
        }
        out.append("}")
        out.append(if (ci < cases.size - 1) ",\n" else "\n")
    }
    out.append("  ]\n}\n")
    print(out)
}
