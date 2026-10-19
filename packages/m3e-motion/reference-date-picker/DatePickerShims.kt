// Minimal stand-ins for the Compose APIs the VERBATIM blocks of DatePickerReference.kt and
// CalendarModelReference.kt call: the JVM CalendarLocale (java.util.Locale, as
// CalendarLocale.jvmAndAndroid.kt), Int.toLocalString and formatString (as their JVM actuals),
// the text field buffer the date input's transformations edit, the draw scope drawRangeBackground
// draws into (it records the rectangles), and DatePickerModalTokens' DateStateLayerHeight.
@file:Suppress("unused", "NOTHING_TO_INLINE")

package androidx.compose.material3

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import java.util.Locale

typealias CalendarLocale = Locale

@RequiresOptIn annotation class ExperimentalMaterial3Api

/** CalendarLocale.jvmAndAndroid.kt's `Int.toLocalString` (NumberFormat.getIntegerInstance). */
internal fun Int.toLocalString(
    minDigits: Int = 1,
    maxDigits: Int = 40,
    isGroupingUsed: Boolean = false,
    locale: CalendarLocale? = null,
): String =
    NumberFormat.getIntegerInstance(locale ?: Locale.getDefault())
        .apply {
            this.isGroupingUsed = isGroupingUsed
            this.minimumIntegerDigits = minDigits
            this.maximumIntegerDigits = maxDigits
        }
        .format(this)

/** internal/Strings.android.kt's `formatString` (String.format with the default locale). */
internal fun formatString(template: String, vararg args: Any?): String =
    String.format(template, *args)

class Color(val name: String)

/** The text field buffer an InputTransformation / OutputTransformation edits. */
class TextFieldBuffer(private val originalText: String, text: String) {
    private var buffer = StringBuilder(text)

    var reverted = false
        private set

    val length: Int
        get() = buffer.length

    fun asCharSequence(): CharSequence = buffer.toString()

    fun insert(index: Int, text: String) {
        buffer.insert(index, text)
    }

    fun revertAllChanges() {
        buffer = StringBuilder(originalText)
        reverted = true
    }
}

interface InputTransformation {
    fun TextFieldBuffer.transformInput()
}

interface OutputTransformation {
    fun TextFieldBuffer.transformOutput()
}

/** A draw scope at density 1 (a dp is a px) that records drawRect calls. */
class ContentDrawScope(val size: Size, val layoutDirection: LayoutDirection) {
    val rects = mutableListOf<FloatArray>()

    fun Dp.toPx(): Float = value

    fun drawRect(color: Color, topLeft: Offset, size: Size) {
        rects.add(floatArrayOf(topLeft.x, topLeft.y, size.width, size.height))
    }
}

object DatePickerModalTokens {
    val DateStateLayerHeight = 40.0.dp
}
