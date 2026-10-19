// Minimal stand-ins for the androidx.compose.runtime APIs the date picker's VERBATIM blocks use
// (the state holders' mutableStateOf delegates and annotations); tools/jvm/shims/Runtime.kt has
// the rest of the package.
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.runtime

import kotlin.reflect.KProperty

annotation class Stable

annotation class Immutable

class MutableState<T>(var value: T)

fun <T> mutableStateOf(value: T): MutableState<T> = MutableState(value)

inline operator fun <T> MutableState<T>.getValue(thisObj: Any?, property: KProperty<*>): T = value

inline operator fun <T> MutableState<T>.setValue(thisObj: Any?, property: KProperty<*>, value: T) {
    this.value = value
}
