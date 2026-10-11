// JVM reference harnesses: compile-only stand-ins for androidx.compose.runtime.
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.runtime

@Target(AnnotationTarget.FUNCTION, AnnotationTarget.PROPERTY_GETTER, AnnotationTarget.TYPE)
annotation class Composable

inline fun <T> remember(calculation: () -> T): T = calculation()

inline fun <T> remember(key1: Any?, calculation: () -> T): T = calculation()

inline fun <T> remember(key1: Any?, key2: Any?, calculation: () -> T): T = calculation()
