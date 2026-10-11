// JVM reference harness for @kyralabs/m3e-motion (ROADMAP M3 DoD: "spring positions match Compose
// reference samples within 1e-4"). Compiled together with the *unmodified* vendored
// SpringSimulation.kt and SpringEstimation.kt (packages/m3e-codegen/vendor/androidx-animation-core)
// and run by tools/jvm/kotlin.mjs; prints JSON to stdout.
package androidx.compose.animation.core

// animation-core VectorizedAnimationSpec.kt L794–842 (object Spring), values used by the sources.
object Spring {
    const val StiffnessVeryLow: Float = 50f
    const val DampingRatioNoBouncy: Float = 1f
}

// animation-core Preconditions.kt L25–27
internal fun throwIllegalArgumentException(message: String) {
    throw IllegalArgumentException(message)
}

private class Case(
    val name: String,
    val dampingRatio: Float,
    val stiffness: Float,
    val initialValue: Float,
    val finalPosition: Float,
    val initialVelocity: Float,
    val stepMillis: Long,
)

private fun json(f: Float): String = if (f.isFinite()) f.toString() else "null"

fun main() {
    // Motion scheme springs: tokens/{Standard,Expressive}MotionTokens.kt @19991f2c.
    val scheme =
        listOf(
            Triple("standard", "fastSpatial", 0.9f to 1400f),
            Triple("standard", "defaultSpatial", 0.9f to 700f),
            Triple("standard", "slowSpatial", 0.9f to 300f),
            Triple("standard", "fastEffects", 1.0f to 3800f),
            Triple("standard", "defaultEffects", 1.0f to 1600f),
            Triple("standard", "slowEffects", 1.0f to 800f),
            Triple("expressive", "fastSpatial", 0.6f to 800f),
            Triple("expressive", "defaultSpatial", 0.8f to 380f),
            Triple("expressive", "slowSpatial", 0.8f to 200f),
            Triple("expressive", "fastEffects", 1.0f to 3800f),
            Triple("expressive", "defaultEffects", 1.0f to 1600f),
            Triple("expressive", "slowEffects", 1.0f to 800f),
        )
    val cases =
        scheme.map { (s, t, p) -> Case("$s.$t", p.first, p.second, 0f, 1f, 0f, 1) } +
            listOf(
                Case("overdamped", 1.5f, 500f, 0f, 1f, 0f, 2),
                Case("criticallyDamped.velocity", 1.0f, 200f, 0f, 1f, 2f, 2),
                Case("highBouncy", 0.2f, 1500f, 0f, 1f, 0f, 2),
                Case("expressive.defaultSpatial.velocity", 0.8f, 380f, 0f, 1f, 5f, 2),
                Case("translate", 0.9f, 700f, 20f, 100f, -300f, 2),
                Case("reverse", 0.6f, 800f, 1f, 0f, 0f, 2),
            )

    val out = StringBuilder()
    out.append("{\n  \"generator\": \"packages/m3e-motion/reference/SpringReference.kt\",\n")
    out.append("  \"kotlin\": \"${KotlinVersion.CURRENT}\",\n")
    out.append("  \"simulations\": [\n")
    cases.forEachIndexed { i, c ->
        val sim = SpringSimulation(c.finalPosition)
        sim.dampingRatio = c.dampingRatio
        sim.stiffness = c.stiffness
        val threshold = 0.001f * maxOf(1f, kotlin.math.abs(c.finalPosition - c.initialValue))
        val duration =
            estimateAnimationDurationMillis(
                sim.stiffness,
                sim.dampingRatio,
                c.initialVelocity / threshold,
                (c.initialValue - c.finalPosition) / threshold,
                1f,
            )
        out.append("    {\"name\": \"${c.name}\", \"dampingRatio\": ${c.dampingRatio}, ")
        out.append("\"stiffness\": ${c.stiffness}, \"initialValue\": ${c.initialValue}, ")
        out.append("\"finalPosition\": ${c.finalPosition}, \"initialVelocity\": ${c.initialVelocity}, ")
        out.append("\"samples\": [")
        var t = 0L
        val samples = mutableListOf<String>()
        while (t <= duration + 50) {
            val m = sim.updateValues(c.initialValue, c.initialVelocity, t)
            samples += "[$t, ${json(m.value)}, ${json(m.velocity)}]"
            t += c.stepMillis
        }
        out.append(samples.joinToString(", "))
        out.append("]}")
        out.append(if (i < cases.size - 1) ",\n" else "\n")
    }
    out.append("  ],\n  \"durations\": [\n")
    val durationCases = mutableListOf<String>()
    for ((s, t, p) in scheme) {
        for (threshold in listOf(0.01f, 0.001f)) {
            for (v0 in listOf(0f, 3f)) {
                val ms = estimateAnimationDurationMillis(p.second, p.first, v0 / threshold, -1f / threshold, 1f)
                durationCases +=
                    "    {\"name\": \"$s.$t\", \"stiffness\": ${p.second}, \"dampingRatio\": ${p.first}, " +
                        "\"initialVelocity\": ${v0 / threshold}, \"initialDisplacement\": ${-1f / threshold}, " +
                        "\"delta\": 1.0, \"millis\": $ms}"
            }
        }
    }
    for ((ratio, k) in listOf(1.5f to 500f, 0.2f to 1500f, 1.0f to 200f, 0.05f to 100f)) {
        val ms = estimateAnimationDurationMillis(k, ratio, 0f, -100f, 1f)
        durationCases +=
            "    {\"name\": \"edge\", \"stiffness\": $k, \"dampingRatio\": $ratio, " +
                "\"initialVelocity\": 0.0, \"initialDisplacement\": -100.0, \"delta\": 1.0, \"millis\": $ms}"
    }
    out.append(durationCases.joinToString(",\n"))
    out.append("\n  ]\n}\n")
    print(out)
}
