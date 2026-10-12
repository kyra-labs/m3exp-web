/*
 * Copyright 2024 The Android Open Source Project
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
// JVM reference harness for the loading indicator geometry in @kyralabs/m3e-shapes
// (COMPONENT_SPEC §7: "Path d at t=0 of each segment equals TS-ported MaterialShapes output").
//
// LoadingIndicator.kt is a composable (Box, Spacer, Animatable…) and does not compile against
// tools/jvm/shims, so the private geometry it draws with is copied here VERBATIM from the vendored
// packages/m3e-codegen/vendor/androidx-material3-sources/LoadingIndicator.kt@19991f2c (marked
// "BEGIN/END VERBATIM"); packages/m3e-shapes/src/loading-indicator.test.ts fails if a copy drifts
// from the vendored file. Everything else (graphics-shapes 1.0.1, MaterialShapes.kt, ShapeUtil.kt,
// Matrix.kt) is the unmodified vendored source.
package androidx.compose.material3

import androidx.compose.material3.internal.toPath
import androidx.compose.material3.internal.transformed
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.center
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.util.fastForEach
import androidx.graphics.shapes.Morph
import androidx.graphics.shapes.RoundedPolygon
import kotlin.math.max
import kotlin.math.min

// LoadingIndicatorTokens.kt: ActiveSize 38.0.dp, ContainerWidth / ContainerHeight 48.0.dp.
private const val IndicatorSize = 38.0f
private const val ContainerWidth = 48.0f
private const val ContainerHeight = 48.0f

// LoadingIndicatorDefaults.ActiveIndicatorScale, with the Dp `.value`s spelled as Floats.
private val ActiveIndicatorScale = IndicatorSize / min(ContainerWidth, ContainerHeight)

private val IndeterminateIndicatorPolygons: List<RoundedPolygon> =
    // BEGIN VERBATIM IndeterminateIndicatorPolygons
        listOf(
            MaterialShapes.SoftBurst,
            MaterialShapes.Cookie9Sided,
            MaterialShapes.Pentagon,
            MaterialShapes.Pill,
            MaterialShapes.Sunny,
            MaterialShapes.Cookie4Sided,
            MaterialShapes.Oval,
        )
    // END VERBATIM

private val DeterminateIndicatorPolygons: List<RoundedPolygon> =
    // BEGIN VERBATIM DeterminateIndicatorPolygons
        listOf(
            // Rotating the circle gets us a smoother morphing to the soft-burst shapes, which is
            // also being rotated at the same angle.
            MaterialShapes.Circle.transformed(Matrix().apply { rotateZ(360f / 20) }),
            MaterialShapes.SoftBurst,
        )
    // END VERBATIM

// BEGIN VERBATIM morphSequence
private fun morphSequence(polygons: List<RoundedPolygon>, circularSequence: Boolean): List<Morph> {
    return buildList {
        for (i in polygons.indices) {
            if (i + 1 < polygons.size) {
                add(Morph(polygons[i].normalized(), polygons[i + 1].normalized()))
            } else if (circularSequence) {
                // Create a morph from the last shape to the first shape
                add(Morph(polygons[i].normalized(), polygons[0].normalized()))
            }
        }
    }
}
// END VERBATIM

// BEGIN VERBATIM calculateScaleFactor
private fun calculateScaleFactor(indicatorPolygons: List<RoundedPolygon>): Float {
    var scaleFactor = 1f
    // Axis-aligned max bounding box for this object, where the rectangles left, top, right, and
    // bottom values will be stored in entries 0, 1, 2, and 3, in that order.
    val bounds = FloatArray(size = 4)
    val maxBounds = FloatArray(size = 4)
    indicatorPolygons.fastForEach { polygon ->
        polygon.calculateBounds(bounds)
        polygon.calculateMaxBounds(maxBounds)
        val scaleX = bounds.width() / maxBounds.width()
        val scaleY = bounds.height() / maxBounds.height()
        // We use max(scaleX, scaleY) to handle cases like a pill-shape that can throw off the
        // entire calculation.
        scaleFactor = min(scaleFactor, max(scaleX, scaleY))
    }
    return scaleFactor
}
// END VERBATIM

// BEGIN VERBATIM FloatArray.width
private fun FloatArray.width(): Float {
    // Expecting a FloatArray of [left, top, right, bottom]
    return this[2] - this[0]
}
// END VERBATIM

// BEGIN VERBATIM FloatArray.height
private fun FloatArray.height(): Float {
    // Expecting a FloatArray of [left, top, right, bottom]
    return this[3] - this[1]
}
// END VERBATIM

// BEGIN VERBATIM processPath
private fun processPath(
    path: Path,
    size: Size,
    scaleFactor: Float,
    scaleMatrix: Matrix = Matrix(),
): Path {
    scaleMatrix.reset()

    scaleMatrix.apply { scale(x = size.width * scaleFactor, y = size.height * scaleFactor) }

    // Scale to the desired size.
    path.transform(scaleMatrix)

    // Translate the path to align its center with the available size center.
    path.translate(size.center - path.getBounds().center)
    return path
}
// END VERBATIM

/** The determinate draw step of LoadingIndicatorImpl (L313–330), returning what it draws. */
private fun determinate(progressValue: Float, morphSequence: List<Morph>): Triple<Int, Float, Float> {
    // BEGIN VERBATIM determinate draw step
                        // Adjust the active morph index according to the progress.
                        val activeMorphIndex =
                            (morphSequence.size * progressValue)
                                .toInt()
                                .coerceAtMost(morphSequence.size - 1)
                        // Prepare the progress value that will be used for the active Morph.
                        val adjustedProgressValue =
                            if (progressValue == 1f && activeMorphIndex == morphSequence.size - 1) {
                                // Prevents a zero when the progress is one and we are at the last
                                // shape morph.
                                1f
                            } else {
                                (progressValue * morphSequence.size) % 1f
                            }

                        // Rotate counterclockwise.
                        val rotation = -progressValue * 180
    // END VERBATIM
    return Triple(activeMorphIndex, adjustedProgressValue, rotation)
}

private fun pathJson(path: Path): String =
    path.commands.joinToString(",", "[", "]") { c ->
        "[\"${c.verb}\"${c.points.joinToString("") { ",$it" }}]"
    }

private const val SIZE = 100f
private val PROGRESSES = listOf(0f, 0.25f, 0.5f, 0.75f, 1f, 1.1f)

private fun sequenceJson(name: String, polygons: List<RoundedPolygon>, circular: Boolean): String {
    val morphs = morphSequence(polygons = polygons, circularSequence = circular)
    val scaleFactor = calculateScaleFactor(polygons) * ActiveIndicatorScale
    val paths =
        morphs.indices.joinToString(",\n", "[\n", "\n]") { i ->
            PROGRESSES.joinToString(",", "[", "]") { progress ->
                val path =
                    processPath(
                        path = morphs[i].toPath(progress = progress, path = Path(), startAngle = 0),
                        size = Size(SIZE, SIZE),
                        scaleFactor = scaleFactor,
                    )
                "{\"progress\":$progress,\"path\":${pathJson(path)}}"
            }
        }
    return "\"$name\":{\"morphs\":${morphs.size},\"scaleFactor\":$scaleFactor,\"paths\":$paths}"
}

fun main() {
    val determinateMorphs = morphSequence(DeterminateIndicatorPolygons, circularSequence = false)
    val frames =
        listOf(0f, 0.2f, 0.5f, 0.75f, 0.999f, 1f).joinToString(",", "[", "]") { p ->
            val (index, progress, rotation) = determinate(p, determinateMorphs)
            "{\"progress\":$p,\"morphIndex\":$index,\"morphProgress\":$progress,\"rotation\":$rotation}"
        }
    val out = StringBuilder()
    out.append("{\n\"generator\":\"packages/m3e-shapes/reference-loading-indicator/LoadingIndicatorReference.kt\",\n")
    out.append("\"kotlin\":\"${KotlinVersion.CURRENT}\",\n")
    out.append("\"size\":$SIZE,\n")
    out.append("\"activeIndicatorScale\":$ActiveIndicatorScale,\n")
    out.append(sequenceJson("indeterminate", IndeterminateIndicatorPolygons, circular = true))
    out.append(",\n")
    out.append(sequenceJson("determinate", DeterminateIndicatorPolygons, circular = false))
    out.append(",\n\"determinateFrames\":$frames\n}\n")
    print(out)
}
