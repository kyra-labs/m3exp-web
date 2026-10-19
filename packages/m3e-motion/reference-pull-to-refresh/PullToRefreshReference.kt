/*
 * Copyright 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// JVM reference harness for @kyralabs/m3e-motion's pull-to-refresh port (pull-to-refresh.ts,
// COMPONENT_SPEC §38). Run by tools/jvm/kotlin.mjs (`pnpm reference:pull-to-refresh`); prints
// JSON to stdout.
//
// PullToRefresh.kt is a composable file (nested scroll nodes, Animatable, Canvas…) and does not
// compile without the Compose runtime, so the code the port follows is copied here VERBATIM from
// the vendored packages/m3e-codegen/vendor/androidx-material3-sources/PullToRefresh.kt@19991f2c
// (marked "BEGIN/END VERBATIM"; packages/m3e-codegen/src/pull-to-refresh-sources.test.ts fails if
// a copy drifts from the vendored file), over the minimal shims in PullToRefreshShims.kt: the
// modifier node's drag bookkeeping and release, the arrow's values and its drawing (the shim
// DrawScope records what is drawn and the rotations around it).
package androidx.compose.material3.pulltorefresh

import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** PullToRefreshModifierNode's fields and the members the verbatim code below uses. */
private class Node(var isRefreshing: Boolean, var threshold: Dp, density: Float) {
    private val density = Density(density)
    val state = PullToRefreshState()
    val isAttached = true
    var refreshes = 0
    var onRefresh: () -> Unit = { refreshes++ }

    fun requireDensity() = density

    var verticalOffset = 0f
    var distancePulled = 0f

    // BEGIN VERBATIM adjustedDistancePulled, thresholdPx, progress
    private val adjustedDistancePulled: Float
        get() = distancePulled * DragMultiplier

    private val thresholdPx
        get() = with(requireDensity()) { threshold.roundToPx() }

    private val progress
        get() = adjustedDistancePulled / thresholdPx
    // END VERBATIM

    val thresholdPxValue
        get() = thresholdPx

    val fraction
        get() = verticalOffset / thresholdPx

    fun consume(y: Float): Float = consumeAvailableOffset(Offset(0f, y)).y

    fun release(): Float {
        var consumed = 0f
        suspend { consumed = onRelease(0f) }.startCoroutine(Continuation(EmptyCoroutineContext) {})
        return consumed
    }

    fun refreshingChanged() {
        suspend { if (!isRefreshing) animateToHidden() else animateToThreshold() }
            .startCoroutine(Continuation(EmptyCoroutineContext) {})
    }

    // BEGIN VERBATIM consumeAvailableOffset
    /** Helper method for nested scroll connection */
    private fun consumeAvailableOffset(available: Offset): Offset {
        val y =
            if (isRefreshing) 0f
            else {
                val newOffset = (distancePulled + available.y).coerceAtLeast(0f)
                val dragConsumed = newOffset - distancePulled
                distancePulled = newOffset
                verticalOffset = calculateVerticalOffset()
                dragConsumed
            }
        return Offset(0f, y)
    }
    // END VERBATIM

    // BEGIN VERBATIM onRelease
    /** Helper method for nested scroll connection. Calls onRefresh callback when triggered */
    private suspend fun onRelease(velocity: Float): Float {
        if (isRefreshing) return 0f // Already refreshing, do nothing
        // Trigger refresh
        if (adjustedDistancePulled > thresholdPx) {
            onRefresh()
        }

        val consumed =
            when {
                // We are flinging without having dragged the pull refresh (for example a fling
                // inside a list) - don't consume
                distancePulled == 0f -> 0f
                // If the velocity is negative, the fling is upwards, and we don't want to prevent
                // the list from scrolling
                velocity < 0f -> 0f
                // We are showing the indicator, and the fling is downwards - consume everything
                else -> velocity
            }

        animateToHidden()

        distancePulled = 0f

        return consumed
    }
    // END VERBATIM

    // BEGIN VERBATIM calculateVerticalOffset
    private fun calculateVerticalOffset(): Float =
        when {
            // If drag hasn't gone past the threshold, the position is the adjustedDistancePulled.
            adjustedDistancePulled <= thresholdPx -> adjustedDistancePulled
            else -> {
                // How far beyond the threshold pull has gone, as a percentage of the threshold.
                val overshootPercent = abs(progress) - 1.0f
                // Limit the overshoot to 200%. Linear between 0 and 200.
                val linearTension = overshootPercent.coerceIn(0f, 2f)
                // Non-linear tension. Increases with linearTension, but at a decreasing rate.
                val tensionPercent = linearTension - linearTension.pow(2) / 4
                // The additional offset beyond the threshold.
                val extraOffset = thresholdPx * tensionPercent
                thresholdPx + extraOffset
            }
        }
    // END VERBATIM

    // BEGIN VERBATIM animateToThreshold, animateToHidden
    private suspend fun animateToThreshold() {
        try {
            state.animateToThreshold()
        } finally {
            if (isAttached) {
                // Don't read density if the node is not attached. This will get updated next
                // time the node is attached
                distancePulled = thresholdPx.toFloat()
                verticalOffset = thresholdPx.toFloat()
            }
        }
    }

    private suspend fun animateToHidden() {
        try {
            state.animateToHidden()
        } finally {
            distancePulled = 0f
            verticalOffset = 0f
        }
    }
    // END VERBATIM
}

/** CircularArrowProgressIndicator's Canvas content (L808–815) on a SpinnerSize canvas. */
private fun DrawScope.arrowIndicator(progress: () -> Float, path: Path, color: Color) {
    val alphaState = State(1f)
    // BEGIN VERBATIM CircularArrowProgressIndicator canvas
        val values = ArrowValues(progress())
        val alpha = alphaState.value
        rotate(degrees = values.rotation) {
            val arcRadius = ArcRadius.toPx() + StrokeWidth.toPx() / 2f
            val arcBounds = Rect(center = size.center, radius = arcRadius)
            drawCircularIndicator(color, alpha, values, arcBounds, StrokeWidth)
            drawArrow(path, arcBounds, color, alpha, values, StrokeWidth)
        }
    // END VERBATIM
}

// BEGIN VERBATIM drawCircularIndicator
private fun DrawScope.drawCircularIndicator(
    color: Color,
    alpha: Float,
    values: ArrowValues,
    arcBounds: Rect,
    strokeWidth: Dp,
) {
    drawArc(
        color = color,
        alpha = alpha,
        startAngle = values.startAngle,
        sweepAngle = values.endAngle - values.startAngle,
        useCenter = false,
        topLeft = arcBounds.topLeft,
        size = arcBounds.size,
        style = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Butt),
    )
}
// END VERBATIM

// BEGIN VERBATIM ArrowValues
@Immutable
private class ArrowValues(
    val rotation: Float,
    val startAngle: Float,
    val endAngle: Float,
    val scale: Float,
)

private fun ArrowValues(progress: Float): ArrowValues {
    // Discard first 40% of progress. Scale remaining progress to full range between 0 and 100%.
    val adjustedPercent = max(min(1f, progress) - 0.4f, 0f) * 5 / 3
    // How far beyond the threshold pull has gone, as a percentage of the threshold.
    val overshootPercent = abs(progress) - 1.0f
    // Limit the overshoot to 200%. Linear between 0 and 200.
    val linearTension = overshootPercent.coerceIn(0f, 2f)
    // Non-linear tension. Increases with linearTension, but at a decreasing rate.
    val tensionPercent = linearTension - linearTension.pow(2) / 4

    // Calculations based on SwipeRefreshLayout specification.
    val endTrim = adjustedPercent * MaxProgressArc
    val rotation = (-0.25f + 0.4f * adjustedPercent + tensionPercent) * 0.5f
    val startAngle = rotation * 360
    val endAngle = (rotation + endTrim) * 360
    val scale = min(1f, adjustedPercent)

    return ArrowValues(rotation, startAngle, endAngle, scale)
}
// END VERBATIM

// BEGIN VERBATIM drawArrow
private fun DrawScope.drawArrow(
    arrow: Path,
    bounds: Rect,
    color: Color,
    alpha: Float,
    values: ArrowValues,
    strokeWidth: Dp,
) {
    arrow.reset()
    arrow.moveTo(0f, 0f) // Move to left corner
    // Line to tip of arrow
    arrow.lineTo(x = ArrowWidth.toPx() * values.scale / 2, y = ArrowHeight.toPx() * values.scale)
    arrow.lineTo(x = ArrowWidth.toPx() * values.scale, y = 0f) // Line to right corner

    val radius = min(bounds.width, bounds.height) / 2f
    val inset = ArrowWidth.toPx() * values.scale / 2f
    arrow.translate(
        Offset(x = radius + bounds.center.x - inset, y = bounds.center.y - strokeWidth.toPx())
    )
    rotate(degrees = values.endAngle - strokeWidth.toPx()) {
        drawPath(path = arrow, color = color, alpha = alpha, style = Stroke(strokeWidth.toPx()))
    }
}
// END VERBATIM

// BEGIN VERBATIM arrow constants
private const val MaxProgressArc = 0.8f

/** The default stroke width for [Indicator] */
private val StrokeWidth
    get() = 2.5.dp
private val ArcRadius
    get() = 5.5.dp
internal val SpinnerSize = 16.dp // (ArcRadius + PullRefreshIndicatorDefaults.StrokeWidth).times(2)
internal val SpinnerContainerSize
    get() = 40.dp
private val ArrowWidth
    get() = 10.dp
private val ArrowHeight
    get() = 5.dp
// END VERBATIM

// BEGIN VERBATIM alpha and drag constants
// Values taken from SwipeRefreshLayout
private const val MinAlpha = 0.3f
private const val MaxAlpha = 1f

/**
 * The distance pulled is multiplied by this value to give us the adjusted distance pulled, which is
 * used in calculating the indicator position (when the adjusted distance pulled is less than the
 * refresh threshold, it is the indicator position, otherwise the indicator position is derived from
 * the progress).
 */
private const val DragMultiplier = 0.5f
// END VERBATIM

private fun n(v: Float): String = v.toString()

private fun arrowJson(progress: Float, density: Float): String {
    val scope = DrawScope(density, with(Density(density)) { SpinnerSize.roundToPx() }.toFloat())
    val path = Path()
    scope.arrowIndicator({ progress }, path, Color)
    val v = ArrowValues(progress)
    val arc = scope.arcs.single()
    val arrow = scope.paths.single()
    return "{\"progress\":${n(progress)},\"density\":${n(density)},\"size\":${n(scope.size.width)}," +
        "\"rotation\":${n(v.rotation)},\"startAngle\":${n(v.startAngle)},\"endAngle\":${n(v.endAngle)}," +
        "\"scale\":${n(v.scale)},\"arcRotations\":[${arc.rotations.joinToString(",") { n(it) }}]," +
        "\"arc\":[${n(arc.left)},${n(arc.top)},${n(arc.width)},${n(arc.height)},${n(arc.startAngle)},${n(arc.sweepAngle)},${n(arc.strokeWidth)}]," +
        "\"points\":[${arrow.points.joinToString(",") { n(it) }}]," +
        "\"arrowRotations\":[${arrow.rotations.joinToString(",") { n(it) }}],\"arrowStroke\":${n(arrow.strokeWidth)}}"
}

private class Drag(
    val name: String,
    val density: Float,
    val thresholdDp: Float,
    val moves: List<Float>,
    val refreshing: Boolean = false,
)

private fun dragJson(d: Drag): String {
    val node = Node(d.refreshing, Dp(d.thresholdDp), d.density)
    val steps =
        d.moves.joinToString(",", "[", "]") { y ->
            val consumed = node.consume(y)
            "{\"available\":${n(y)},\"consumed\":${n(consumed)},\"distancePulled\":${n(node.distancePulled)},\"verticalOffset\":${n(node.verticalOffset)},\"fraction\":${n(node.fraction)}}"
        }
    node.release()
    val refreshed = node.refreshes > 0
    val after = "{\"distancePulled\":${n(node.distancePulled)},\"verticalOffset\":${n(node.verticalOffset)}}"
    // The app's isRefreshing = true (if it refreshed): the node animates to the threshold.
    node.isRefreshing = refreshed
    node.refreshingChanged()
    val refreshing = "{\"distancePulled\":${n(node.distancePulled)},\"verticalOffset\":${n(node.verticalOffset)}}"
    return "{\"name\":\"${d.name}\",\"density\":${n(d.density)},\"threshold\":${n(d.thresholdDp)},\"thresholdPx\":${node.thresholdPxValue},\"refreshing\":${d.refreshing},\"steps\":$steps,\"refreshed\":$refreshed,\"afterRelease\":$after,\"afterRefreshing\":$refreshing}"
}

private val PROGRESSES =
    listOf(0f, 0.1f, 0.3f, 0.4f, 0.41f, 0.5f, 0.6f, 0.75f, 0.9f, 0.99f, 1f, 1.01f, 1.25f, 1.5f,
        1.75f, 1.9f, 2f, 2.5f, 3f, 1f / 3f, 2f / 3f, 0.123456f)

private fun ramp(step: Float, count: Int): List<Float> = List(count) { step }

private val DRAGS =
    listOf(
        Drag("short", 1f, 80f, listOf(10f, 20f, 30f)),
        Drag("to the threshold", 1f, 80f, ramp(16f, 10)),
        Drag("past the threshold", 1f, 80f, ramp(16f, 11)),
        Drag("far", 1f, 80f, ramp(23.7f, 30)),
        Drag("very far", 1f, 80f, listOf(300f, 300f, 300f)),
        Drag("down then up", 1f, 80f, listOf(60f, 60f, 60f, -50f, -50f, -100f, -40f)),
        Drag("up first", 1f, 80f, listOf(-30f, 12.5f, 7.25f)),
        Drag("fractional", 1f, 80f, listOf(0.3f, 1.7f, 33.33f, 66.67f, 99.99f, 0.01f, -0.5f)),
        Drag("custom threshold", 1f, 120f, ramp(17f, 20)),
        Drag("dense", 2.625f, 80f, ramp(37f, 14)),
        Drag("while refreshing", 1f, 80f, listOf(40f, 80f), refreshing = true),
    )

fun main() {
    val out = StringBuilder()
    out.append("{\n\"generator\":\"packages/m3e-motion/reference-pull-to-refresh/PullToRefreshReference.kt\",\n")
    out.append("\"kotlin\":\"${KotlinVersion.CURRENT}\",\n")
    out.append("\"minAlpha\":${n(MinAlpha)},\"maxAlpha\":${n(MaxAlpha)},\"dragMultiplier\":${n(DragMultiplier)},\n")
    out.append("\"spinnerContainerSize\":${n(SpinnerContainerSize.value)},\n")
    out.append("\"arrows\":[\n")
    out.append(
        listOf(1f, 2.625f).flatMap { d -> PROGRESSES.map { p -> arrowJson(p, d) } }.joinToString(",\n")
    )
    out.append("\n],\n\"drags\":[\n")
    out.append(DRAGS.joinToString(",\n") { dragJson(it) })
    out.append("\n]\n}\n")
    print(out)
}
