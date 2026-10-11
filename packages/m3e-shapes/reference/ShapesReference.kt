// JVM reference harness for @kyralabs/m3e-shapes (ROADMAP M3 DoD: "shape cubics match Kotlin
// reference dump within 1e-4; morph midpoints match"). Compiled with the *unmodified* vendored
// graphics-shapes 1.0.1 sources, MaterialShapes.kt + internal/ShapeUtil.kt and Compose's
// Matrix.kt (packages/m3e-codegen/vendor/*) plus tools/jvm/shims; run by tools/jvm/kotlin.mjs.
package androidx.compose.material3

import androidx.compose.material3.internal.toPath
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.Cubic
import androidx.graphics.shapes.Morph
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.circle
import androidx.graphics.shapes.pill
import androidx.graphics.shapes.pillStar
import androidx.graphics.shapes.rectangle
import androidx.graphics.shapes.star

private val density =
    object : Density {
        override val density = 1f
        override val fontScale = 1f
    }

private fun cubicsJson(cubics: List<Cubic>): String =
    cubics.joinToString(",", "[", "]") { c -> c.points.joinToString(",", "[", "]") { it.toString() } }

private fun floatsJson(values: FloatArray): String = values.joinToString(",", "[", "]") { it.toString() }

private fun pathJson(path: Path): String =
    path.commands.joinToString(",", "[", "]") { c ->
        "[\"${c.verb}\"${c.points.joinToString("") { ",$it" }}]"
    }

private fun polygonJson(name: String, p: RoundedPolygon): String =
    "{\"name\":\"$name\",\"centerX\":${p.centerX},\"centerY\":${p.centerY}," +
        "\"bounds\":${floatsJson(p.calculateBounds())}," +
        "\"maxBounds\":${floatsJson(p.calculateMaxBounds())}," +
        "\"cubics\":${cubicsJson(p.cubics)}}"

private val presets: List<Pair<String, () -> RoundedPolygon>> =
    listOf(
        "Circle" to { MaterialShapes.Circle },
        "Square" to { MaterialShapes.Square },
        "Slanted" to { MaterialShapes.Slanted },
        "Arch" to { MaterialShapes.Arch },
        "Fan" to { MaterialShapes.Fan },
        "Arrow" to { MaterialShapes.Arrow },
        "SemiCircle" to { MaterialShapes.SemiCircle },
        "Oval" to { MaterialShapes.Oval },
        "Pill" to { MaterialShapes.Pill },
        "Triangle" to { MaterialShapes.Triangle },
        "Diamond" to { MaterialShapes.Diamond },
        "ClamShell" to { MaterialShapes.ClamShell },
        "Pentagon" to { MaterialShapes.Pentagon },
        "Gem" to { MaterialShapes.Gem },
        "Sunny" to { MaterialShapes.Sunny },
        "VerySunny" to { MaterialShapes.VerySunny },
        "Cookie4Sided" to { MaterialShapes.Cookie4Sided },
        "Cookie6Sided" to { MaterialShapes.Cookie6Sided },
        "Cookie7Sided" to { MaterialShapes.Cookie7Sided },
        "Cookie9Sided" to { MaterialShapes.Cookie9Sided },
        "Cookie12Sided" to { MaterialShapes.Cookie12Sided },
        "Ghostish" to { MaterialShapes.Ghostish },
        "Clover4Leaf" to { MaterialShapes.Clover4Leaf },
        "Clover8Leaf" to { MaterialShapes.Clover8Leaf },
        "Burst" to { MaterialShapes.Burst },
        "SoftBurst" to { MaterialShapes.SoftBurst },
        "Boom" to { MaterialShapes.Boom },
        "SoftBoom" to { MaterialShapes.SoftBoom },
        "Flower" to { MaterialShapes.Flower },
        "Puffy" to { MaterialShapes.Puffy },
        "PuffyDiamond" to { MaterialShapes.PuffyDiamond },
        "PixelCircle" to { MaterialShapes.PixelCircle },
        "PixelTriangle" to { MaterialShapes.PixelTriangle },
        "Bun" to { MaterialShapes.Bun },
        "Heart" to { MaterialShapes.Heart },
    )

fun main() {
    val out = StringBuilder()
    out.append("{\n\"generator\":\"packages/m3e-shapes/reference/ShapesReference.kt\",\n")
    out.append("\"kotlin\":\"${KotlinVersion.CURRENT}\",\n")

    // 1. The 35 MaterialShapes presets, plus what Compose's toShape() outlines in a 100x100 box.
    out.append("\"presets\":[\n")
    out.append(
        presets.joinToString(",\n") { (name, get) ->
            val polygon = get()
            val outline =
                polygon.toShape().createOutline(Size(100f, 100f), LayoutDirection.Ltr, density)
                    as Outline.Generic
            polygonJson(name, polygon).dropLast(1) + ",\"outline100\":${pathJson(outline.path)}}"
        }
    )
    out.append("\n],\n")

    // 2. graphics-shapes factories and constructors directly.
    val polygons =
        listOf(
            "pentagon.rounded" to
                RoundedPolygon(5, radius = 1f, rounding = CornerRounding(0.2f, 0.5f)),
            "circle.12" to RoundedPolygon.circle(numVertices = 12, radius = 2f, centerX = 1f, centerY = -1f),
            "rectangle.rounded" to
                RoundedPolygon.rectangle(width = 2f, height = 1f, rounding = CornerRounding(0.3f, 0.7f)),
            "rectangle.perVertex" to
                RoundedPolygon.rectangle(
                    perVertexRounding =
                        listOf(
                            CornerRounding(0.1f),
                            CornerRounding(0.4f, 1f),
                            CornerRounding.Unrounded,
                            CornerRounding(0.25f, 0.25f),
                        )
                ),
            "star.8" to
                RoundedPolygon.star(
                    8,
                    innerRadius = 0.6f,
                    rounding = CornerRounding(0.15f, 0.3f),
                    innerRounding = CornerRounding(0.05f),
                ),
            "pill.smooth" to RoundedPolygon.pill(width = 3f, height = 1f, smoothing = 0.6f),
            "pillStar" to
                RoundedPolygon.pillStar(
                    width = 2f,
                    height = 1f,
                    numVerticesPerRadius = 10,
                    innerRadiusRatio = 0.7f,
                    rounding = CornerRounding(0.1f),
                ),
            "custom.concave" to
                RoundedPolygon(
                    floatArrayOf(0f, 0f, 1f, 0f, 1f, 1f, 0.5f, 0.4f, 0f, 1f),
                    rounding = CornerRounding(0.1f, 0.5f),
                ),
            "custom.negativeOnly" to
                RoundedPolygon(floatArrayOf(-3f, -3f, -1f, -3f, -2f, -1f)),
        )
    out.append("\"polygons\":[\n")
    out.append(polygons.joinToString(",\n") { (name, p) -> polygonJson(name, p) })
    out.append("\n],\n")

    // 3. Morphs: cubics at fixed progresses, bounds, and Compose's Morph.toPath at 0.5.
    val pairs =
        listOf(
            "Circle" to "Square",
            "Square" to "Cookie9Sided",
            "Triangle" to "Heart",
            "Sunny" to "Flower",
            "Arrow" to "Pill",
            "Clover4Leaf" to "Burst",
            "PixelCircle" to "SoftBoom",
        )
    val byName = presets.toMap()
    out.append("\"morphs\":[\n")
    out.append(
        pairs.joinToString(",\n") { (a, b) ->
            val morph = Morph(byName.getValue(a)(), byName.getValue(b)())
            val steps =
                listOf(0f, 0.25f, 0.5f, 0.75f, 1f).joinToString(",") { t ->
                    "{\"progress\":$t,\"cubics\":${cubicsJson(morph.asCubics(t))}}"
                }
            val path = morph.toPath(progress = 0.5f, startAngle = 0, rotationPivotX = 0.5f, rotationPivotY = 0.5f)
            "{\"start\":\"$a\",\"end\":\"$b\",\"bounds\":${floatsJson(morph.calculateBounds())}," +
                "\"maxBounds\":${floatsJson(morph.calculateMaxBounds())},\"steps\":[$steps]," +
                "\"path50\":${pathJson(path)}}"
        }
    )
    out.append("\n],\n")

    // 4. Every ordered pair of presets: cubic count and checksum of Morph.asCubics(0.5f). Symmetric
    // shapes make near-ties in the corner matching; this pins how Compose resolves all of them.
    out.append("\"morphPairs\":[\n")
    out.append(
        presets
            .flatMap { a -> presets.filter { it.first != a.first }.map { b -> a to b } }
            .joinToString(",\n") { (a, b) ->
                val cubics = Morph(a.second(), b.second()).asCubics(0.5f)
                var sum = 0.0
                for (c in cubics) for (v in c.points) sum += v
                "[\"${a.first}\",\"${b.first}\",${cubics.size},$sum]"
            }
    )
    out.append("\n],\n")

    // 5. ShapeUtil's toPath with its defaults (startAngle = 270: rotated to start at 12 o'clock).
    val paths =
        listOf(
            "Heart.toPath" to MaterialShapes.Heart.toPath(),
            "Slanted.toPath" to MaterialShapes.Slanted.toPath(),
            "Triangle.toPath.repeat.open" to
                MaterialShapes.Triangle.toPath(repeatPath = true, closePath = false),
            "Triangle-Heart.toPath.30" to
                Morph(MaterialShapes.Triangle, MaterialShapes.Heart)
                    .toPath(progress = 0.3f, rotationPivotX = 0.5f, rotationPivotY = 0.5f),
        )
    out.append("\"paths\":[\n")
    out.append(
        paths.joinToString(",\n") { (name, path) -> "{\"name\":\"$name\",\"path\":${pathJson(path)}}" }
    )
    out.append("\n]\n}\n")
    print(out)
}
