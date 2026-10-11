// JVM reference harnesses: minimal androidx.collection stand-ins (FloatFloatPair, FloatList,
// MutableFloatList) with the members graphics-shapes 1.0.1 uses. Pure value containers.
@file:Suppress("unused")

package androidx.collection

import androidx.compose.ui.util.packFloats
import androidx.compose.ui.util.unpackFloat1
import androidx.compose.ui.util.unpackFloat2

/** Upstream packs both floats into a Long; equality is bitwise on that Long. */
@JvmInline
value class FloatFloatPair(val packedValue: Long) {
    constructor(first: Float, second: Float) : this(packFloats(first, second))

    val first: Float
        get() = unpackFloat1(packedValue)

    val second: Float
        get() = unpackFloat2(packedValue)

    operator fun component1(): Float = first

    operator fun component2(): Float = second

    override fun toString(): String = "($first, $second)"
}

sealed class FloatList(initialCapacity: Int) {
    internal var content: FloatArray = FloatArray(initialCapacity)
    internal var _size: Int = 0

    val size: Int
        get() = _size

    val lastIndex: Int
        get() = _size - 1

    val indices: IntRange
        get() = 0 until _size

    fun isEmpty(): Boolean = _size == 0

    fun isNotEmpty(): Boolean = _size != 0

    operator fun get(index: Int): Float {
        if (index !in 0 until _size) throw IndexOutOfBoundsException("Index $index, size $_size")
        return content[index]
    }

    fun first(): Float = get(0)

    fun last(): Float = get(_size - 1)

    inline fun forEach(block: (Float) -> Unit) {
        for (i in indices) block(get(i))
    }

    inline fun <R> fold(initial: R, operation: (acc: R, element: Float) -> R): R {
        var acc = initial
        forEach { acc = operation(acc, it) }
        return acc
    }

    fun joinToString(separator: CharSequence = ", "): String =
        (0 until _size).joinToString(separator) { content[it].toString() }
}

class MutableFloatList(initialCapacity: Int = 16) : FloatList(initialCapacity) {
    fun add(element: Float): Boolean {
        if (_size == content.size) content = content.copyOf(maxOf(1, content.size * 2))
        content[_size++] = element
        return true
    }

    operator fun plusAssign(element: Float) {
        add(element)
    }

    fun clear() {
        _size = 0
    }
}
