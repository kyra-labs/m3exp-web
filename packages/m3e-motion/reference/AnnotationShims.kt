// JVM reference harness: no-op stand-in for androidx.annotation.RestrictTo.
package androidx.annotation

annotation class RestrictTo(vararg val value: Scope) {
    enum class Scope { LIBRARY, LIBRARY_GROUP, LIBRARY_GROUP_PREFIX, TESTS, SUBCLASSES }
}
