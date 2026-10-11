// JVM reference harnesses: androidx.compose.ui.graphics stand-ins. `Path` *records* the commands
// it receives so harnesses can export exactly what Compose draws; `transform`/`translate` map
// recorded points with the vendored Matrix, and `getBounds` covers every point including control
// points (as Skia's computeBounds does).
@file:Suppress("unused")

package androidx.compose.ui.graphics

import androidx.compose.ui.unit.Density
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.LayoutDirection

class PathCommand(val verb: Char, val points: FloatArray)

class Path {
    val commands = mutableListOf<PathCommand>()

    fun rewind() = commands.clear()

    fun moveTo(x: Float, y: Float) {
        commands += PathCommand('M', floatArrayOf(x, y))
    }

    fun lineTo(x: Float, y: Float) {
        commands += PathCommand('L', floatArrayOf(x, y))
    }

    fun cubicTo(x1: Float, y1: Float, x2: Float, y2: Float, x3: Float, y3: Float) {
        commands += PathCommand('C', floatArrayOf(x1, y1, x2, y2, x3, y3))
    }

    fun close() {
        commands += PathCommand('Z', floatArrayOf())
    }

    fun addPath(path: Path, offset: Offset = Offset.Zero) {
        for (c in path.commands) {
            commands +=
                PathCommand(
                    c.verb,
                    FloatArray(c.points.size) { i ->
                        c.points[i] + if (i % 2 == 0) offset.x else offset.y
                    },
                )
        }
    }

    fun transform(matrix: Matrix) {
        for (c in commands) {
            for (i in c.points.indices step 2) {
                val p = matrix.map(Offset(c.points[i], c.points[i + 1]))
                c.points[i] = p.x
                c.points[i + 1] = p.y
            }
        }
    }

    fun translate(offset: Offset) {
        for (c in commands) {
            for (i in c.points.indices step 2) {
                c.points[i] += offset.x
                c.points[i + 1] += offset.y
            }
        }
    }

    fun getBounds(): Rect {
        var left = Float.POSITIVE_INFINITY
        var top = Float.POSITIVE_INFINITY
        var right = Float.NEGATIVE_INFINITY
        var bottom = Float.NEGATIVE_INFINITY
        for (c in commands) {
            for (i in c.points.indices step 2) {
                left = minOf(left, c.points[i])
                right = maxOf(right, c.points[i])
                top = minOf(top, c.points[i + 1])
                bottom = maxOf(bottom, c.points[i + 1])
            }
        }
        return if (left > right) Rect(0f, 0f, 0f, 0f) else Rect(left, top, right, bottom)
    }
}

sealed class Outline {
    class Generic(val path: Path) : Outline()
}

interface Shape {
    fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline
}
