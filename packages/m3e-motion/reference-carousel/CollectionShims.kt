// JVM reference harness (carousel): `mutableFloatListOf`, which the vendored Strategy.kt uses,
// over tools/jvm/shims/Collection.kt's MutableFloatList (androidx.collection FloatList.kt).
@file:Suppress("unused")

package androidx.collection

fun mutableFloatListOf(vararg elements: Float): MutableFloatList {
    val list = MutableFloatList(elements.size)
    for (e in elements) list.add(e)
    return list
}
