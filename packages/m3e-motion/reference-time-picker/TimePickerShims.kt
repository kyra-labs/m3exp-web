// Minimal stand-ins for the Compose APIs the VERBATIM blocks of TimePickerReference.kt call
// (compose ui-unit Dp / DpOffset, runtime state, the dial's Animatable and MutatorMutex, the text
// field buffer the input transformation edits). Float math is Kotlin's own. Animatable records its
// target instead of animating: the harness settles it (value = target) when a test says so.
package androidx.compose.material3

import kotlin.reflect.KProperty

annotation class Stable

annotation class Composable

@JvmInline
value class Dp(val value: Float) : Comparable<Dp> {
    override fun compareTo(other: Dp): Int = value.compareTo(other.value)

    // compose ui-unit Dp operators.
    operator fun div(other: Dp): Float = value / other.value

    operator fun div(other: Float): Dp = Dp(value / other)

    operator fun div(other: Int): Dp = Dp(value / other)

    operator fun times(other: Float): Dp = Dp(value * other)

    operator fun plus(other: Dp): Dp = Dp(value + other.value)

    operator fun minus(other: Dp): Dp = Dp(value - other.value)
}

val Int.dp: Dp
    get() = Dp(this.toFloat())

val Double.dp: Dp
    get() = Dp(this.toFloat())

class DpOffset(val x: Dp, val y: Dp)

class MutableState<T>(var value: T) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T = value

    operator fun setValue(thisRef: Any?, property: KProperty<*>, v: T) {
        value = v
    }
}

fun <T> mutableStateOf(value: T): MutableState<T> = MutableState(value)

class MutableIntState(var intValue: Int)

fun mutableIntStateOf(value: Int): MutableIntState = MutableIntState(value)

inline fun <T> remember(vararg keys: Any?, calculation: () -> T): T = calculation()

class Ref<T> {
    var value: T? = null
}

interface RememberObserver {
    fun onRemembered()

    fun onForgotten()

    fun onAbandoned()
}

class FocusRequester

interface AnimationSpec<T>

object TestSpec : AnimationSpec<Float>

class Animatable(initialValue: Float) {
    var value: Float = initialValue
    var targetValue: Float = initialValue

    suspend fun snapTo(targetValue: Float) {
        value = targetValue
        this.targetValue = targetValue
    }

    @Suppress("UNUSED_PARAMETER")
    suspend fun animateTo(targetValue: Float, animationSpec: AnimationSpec<Float>) {
        this.targetValue = targetValue
    }
}

enum class MutatePriority {
    Default,
    UserInput,
    PreventUserInput,
}

val PreventUserInput = MutatePriority.PreventUserInput

class MutatorMutex {
    @Suppress("UNUSED_PARAMETER")
    suspend fun <R> mutate(priority: MutatePriority = MutatePriority.Default, block: suspend () -> R): R =
        block()
}

@Suppress("UNUSED_PARAMETER")
suspend fun delay(timeMillis: Long) {}

class KeyEvent(val utf16CodePoint: Int)

class TextRange(val start: Int, val end: Int) {
    val min: Int
        get() = minOf(start, end)

    val max: Int
        get() = maxOf(start, end)

    // compose ui-text TextRange.length / collapsed.
    val length: Int
        get() = max - min

    val collapsed: Boolean
        get() = start == end
}

class TextFieldState(val text: CharSequence, val selection: TextRange)

/**
 * compose foundation TextFieldBuffer as an InputTransformation sees it: the edited text and
 * selection, the original ones, `delete` (the selection follows the text) and `revertAllChanges`.
 */
class TextFieldBuffer(
    val originalText: CharSequence,
    val originalSelection: TextRange,
    text: String,
    selection: TextRange,
) {
    private var buffer = StringBuilder(text)
    var selection: TextRange = selection
        private set

    var reverted = false
        private set

    val length: Int
        get() = buffer.length

    fun asCharSequence(): CharSequence = buffer.toString()

    fun delete(start: Int, end: Int) {
        buffer.delete(start, end)
        fun shift(offset: Int) =
            if (offset >= end) offset - (end - start) else if (offset > start) start else offset
        selection = TextRange(shift(selection.start), shift(selection.end))
    }

    fun revertAllChanges() {
        buffer = StringBuilder(originalText.toString())
        selection = originalSelection
        reverted = true
    }
}

interface InputTransformation {
    fun TextFieldBuffer.transformInput()
}

class Constraints(val maxWidth: Int, val maxHeight: Int)

class Placeable(val width: Int, val height: Int) {
    var x = 0
    var y = 0

    fun place(x: Int, y: Int) {
        this.x = x
        this.y = y
    }
}

/** TimePickerTokens' sizes the verbatim code imports (TimePickerTokens.kt@19991f2c). */
val ClockDialContainerSize: Dp
    get() = 256.0.dp

val ClockDialSelectorHandleContainerSize: Dp
    get() = 48.0.dp

class IntOffset(val x: Int, val y: Int)

// androidx.collection IntList / MutableIntList / intListOf.
open class IntList(val items: MutableList<Int>) {
    val size: Int
        get() = items.size

    val lastIndex: Int
        get() = items.lastIndex

    operator fun get(index: Int): Int = items[index]

    inline fun forEach(block: (Int) -> Unit) = items.forEach(block)
}

class MutableIntList(initialCapacity: Int) : IntList(ArrayList(initialCapacity)) {
    fun add(element: Int): Boolean = items.add(element)
}

fun intListOf(vararg elements: Int): IntList = IntList(elements.toMutableList())
