// JVM reference harnesses: no-op stand-ins for androidx.annotation annotations.
package androidx.annotation

annotation class RestrictTo(vararg val value: Scope) {
    enum class Scope { LIBRARY, LIBRARY_GROUP, LIBRARY_GROUP_PREFIX, TESTS, SUBCLASSES }
}

annotation class FloatRange(
    val from: Double = Double.NEGATIVE_INFINITY,
    val to: Double = Double.POSITIVE_INFINITY,
    val fromInclusive: Boolean = true,
    val toInclusive: Boolean = true,
)

annotation class IntRange(val from: Long = Long.MIN_VALUE, val to: Long = Long.MAX_VALUE)
