/*
 * Copyright 2022 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// JVM reference harness for @kyralabs/m3e-motion's time picker port (time-picker.ts, COMPONENT_SPEC
// §28). Run by tools/jvm/kotlin.mjs (`pnpm reference:time-picker`); prints JSON to stdout.
//
// TimePicker.kt is a composable file and does not compile without the Compose runtime, so the code
// the port follows is copied here VERBATIM from the vendored
// packages/m3e-codegen/vendor/androidx-material3-sources/TimePicker.kt@19991f2c (and ScrollField.kt)
// (marked "BEGIN/END VERBATIM"; packages/m3e-codegen/src/time-picker-sources.test.ts fails if a
// copy drifts from the vendored file), over the minimal shims in TimePickerShims.kt: the state and
// its validity, the dial's AnalogTimePickerState (angles, animation targets, taps, the selector
// position), CircularLayout's placement, the time input's InputTransformation and focus switch,
// and the scroll picker's wheel indices.
@file:Suppress("UNUSED_VARIABLE", "UNUSED_PARAMETER", "NOTHING_TO_INLINE", "unused")

package androidx.compose.material3

import androidx.annotation.IntRange
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.round
import kotlin.math.roundToInt
import kotlin.math.sin

// BEGIN VERBATIM MaxHourValue, MaxMinuteValue
private const val MaxHourValue = 23
private const val MaxMinuteValue = 59
// END VERBATIM

// BEGIN VERBATIM TimePickerState
public interface TimePickerState {

    /**
     * The currently selected minute (0-59).
     *
     * This value is always valid. [minuteInput] was added later to allow tracking invalid input
     * (e.g. mid-typing in [TimeInput]) without changing the behavior of this property, which always
     * guarantees a valid value.
     */
    @get:IntRange(from = 0, to = 59) @setparam:IntRange(from = 0, to = 59) public var minute: Int

    /**
     * The currently selected hour (0-23).
     *
     * This value is always valid. [hourInput] was added later to allow tracking invalid input (e.g.
     * mid-typing in [TimeInput]) without changing the behavior of this property, which always
     * guarantees a valid value.
     */
    @get:IntRange(from = 0, to = 23) @setparam:IntRange(from = 0, to = 23) public var hour: Int

    /**
     * The input for the hour.
     *
     * UI should be bound to this value. This value can be invalid (e.g. during typing). If valid,
     * it updates [hour]. This property was added to allow tracking mid-typing state in [TimeInput]
     * without polluting [hour] with invalid values.
     */
    @get:IntRange(from = 0)
    public var hourInput: Int
        get() = hour
        set(value) {
            if (isValidHour(value)) {
                hour = value
            }
        }

    /**
     * The input for the minute.
     *
     * UI should be bound to this value. This value can be invalid (e.g. during typing). If valid,
     * it updates [minute]. This property was added to allow tracking mid-typing state in
     * [TimeInput] without polluting [minute] with invalid values.
     */
    @get:IntRange(from = 0)
    public var minuteInput: Int
        get() = minute
        set(value) {
            if (value in 0..MaxMinuteValue) {
                minute = value
            }
        }

    /**
     * Indicates whether the time picker uses 24-hour format (`true`) or 12-hour format with AM/PM
     * (`false`).
     */
    public var is24hour: Boolean

    /** Specifies whether the hour or minute component is being actively selected by the user. */
    public var selection: TimePickerSelectionMode
}

/**
 * Indicates whether the selected time falls within the period from 12 PM inclusive to 12 AM non
 * inclusive.
 */
public val TimePickerState.isPm: Boolean
    get() = hour >= 12

/**
 * `true` if the current `hourInput` represents a valid hour (0-23 for 24h, 0-11 for 12h AM, 12-23
 * for 12h PM).
 */
public val TimePickerState.isHourInputValid: Boolean
    get() = isValidHour(hourInput)

private fun TimePickerState.isValidHour(hour: Int): Boolean {
    return if (is24hour) {
        hour in 0..MaxHourValue
    } else if (isPm) {
        hour in 12..MaxHourValue
    } else {
        hour in 0..11
    }
}

/** `true` if the current `minuteInput` represents a valid minute (0-59). */
public val TimePickerState.isMinuteInputValid: Boolean
    get() = minuteInput in 0..MaxMinuteValue

/** `true` if the time input values are valid. */
public val TimePickerState.isInputValid: Boolean
    get() = isMinuteInputValid && isHourInputValid
// END VERBATIM

// BEGIN VERBATIM TimePickerState factory
public fun TimePickerState(
    initialHour: Int,
    initialMinute: Int,
    is24Hour: Boolean,
    initialSelection: TimePickerSelectionMode = TimePickerSelectionMode.Hour,
): TimePickerState = TimePickerStateImpl(initialHour, initialMinute, is24Hour, initialSelection)
// END VERBATIM

// BEGIN VERBATIM TimePickerSelectionMode
@JvmInline
public value class TimePickerSelectionMode private constructor(public val value: Int) {
    public companion object {
        /** Time picker selection mode for selecting the hour. */
        public val Hour: TimePickerSelectionMode
            get() = TimePickerSelectionMode(0)

        /** Time picker selection mode for selecting the minute. */
        public val Minute: TimePickerSelectionMode
            get() = TimePickerSelectionMode(1)
    }

    public override fun toString(): String =
        when (this) {
            Hour -> "Hour"
            Minute -> "Minute"
            else -> ""
        }
}
// END VERBATIM

// BEGIN VERBATIM TimePickerStateImpl
private class TimePickerStateImpl(
    initialHour: Int,
    initialMinute: Int,
    is24Hour: Boolean,
    initialSelection: TimePickerSelectionMode = TimePickerSelectionMode.Hour,
) : TimePickerState {
    init {
        require(initialHour in 0..MaxHourValue) { "initialHour should in [0..23] range" }
        require(initialMinute in 0..MaxMinuteValue) { "initialMinute should be in [0..59] range" }
    }

    override var is24hour: Boolean = is24Hour

    override var selection by mutableStateOf(initialSelection)

    val hourState = mutableIntStateOf(initialHour)

    val minuteState = mutableIntStateOf(initialMinute)

    val hourInputState = mutableIntStateOf(initialHour)

    val minuteInputState = mutableIntStateOf(initialMinute)

    override var minute: Int
        get() = minuteState.intValue
        set(value) {
            minuteState.intValue = value
            minuteInputState.intValue = value
        }

    override var hour: Int
        get() = hourState.intValue
        set(value) {
            hourState.intValue = value
            hourInputState.intValue = value
        }

    override var hourInput: Int
        get() = hourInputState.intValue
        set(value) {
            super.hourInput = value
            hourInputState.intValue = value
        }

    override var minuteInput: Int
        get() = minuteInputState.intValue
        set(value) {
            super.minuteInput = value
            minuteInputState.intValue = value
        }
// END VERBATIM
}

// BEGIN VERBATIM AnalogTimePickerState
internal class AnalogTimePickerState(
    val state: TimePickerState,
    val userOverride: Ref<Boolean> = Ref<Boolean>(),
) : TimePickerState by state, RememberObserver {

    var currentDiameter by mutableStateOf(0.dp)
    var isDialFocusable by mutableStateOf(false)
    val dialFocusRequester = FocusRequester()
    val hourNodeFocusRequester = FocusRequester()
    val minuteNodeFocusRequester = FocusRequester()
    val amPmNodeFocusRequester = FocusRequester()

    val currentAngle: Float
        get() = anim.value

    private var hourAngle = RadiansPerHour * (state.hour % 12) - FullCircle / 4
    private var minuteAngle = RadiansPerMinute * state.minute - FullCircle / 4

    suspend fun animateToCurrent(animationSpec: AnimationSpec<Float>) {
        if (!isUpdated()) {
            return
        }

        val end =
            if (selection == TimePickerSelectionMode.Hour) {
                endValueForAnimation(hourAngle)
            } else {
                endValueForAnimation(minuteAngle)
            }
        mutex.mutate(priority = PreventUserInput) { anim.animateTo(end, animationSpec) }
    }

    private fun isUpdated(): Boolean {
        if (
            selection == TimePickerSelectionMode.Hour &&
                anim.targetValue.normalize() == hourAngle.normalize()
        ) {
            return false
        }

        if (
            selection == TimePickerSelectionMode.Minute &&
                anim.targetValue.normalize() == minuteAngle.normalize()
        ) {
            return false
        }

        return true
    }

    val clockFaceValues: IntList
        get() = if (selection == TimePickerSelectionMode.Minute) Minutes else Hours

    private fun endValueForAnimation(new: Float): Float {
        // Calculate the absolute angular difference
        var diff = anim.value - new
        // Normalize the angular difference to be between -π and π
        while (diff > HalfCircle) {
            diff -= FullCircle
        }
        while (diff <= -HalfCircle) {
            diff += FullCircle
        }

        return anim.value - diff
    }

    private var anim = Animatable(hourAngle)

    suspend fun onGestureEnd(animationSpec: AnimationSpec<Float>) {
        val end =
            endValueForAnimation(
                if (selection == TimePickerSelectionMode.Hour) {
                    hourAngle
                } else {
                    minuteAngle
                }
            )

        mutex.mutate(priority = PreventUserInput) { anim.animateTo(end, animationSpec) }
    }

    suspend fun rotateTo(
        angle: Float,
        animationSpec: AnimationSpec<Float>,
        animate: Boolean = false,
    ) {
        userOverride.value = false
        mutex.mutate(MutatePriority.UserInput) {
            if (selection == TimePickerSelectionMode.Hour) {
                hourAngle = angle.toHour() % 12 * RadiansPerHour
                state.hourInput = hourAngle.toHour() % 12 + if (isPm) 12 else 0
            } else {
                minuteAngle = angle.toMinute() * RadiansPerMinute
                state.minuteInput = minuteAngle.toMinute()
            }

            if (!animate) {
                anim.snapTo(offsetAngle(angle))
            } else {
                val endAngle = endValueForAnimation(offsetAngle(angle))
                anim.animateTo(endAngle, animationSpec)
            }
        }
    }

    override var minuteInput: Int
        get() = state.minute
        set(value) {
            minuteAngle = RadiansPerMinute * value - FullCircle / 4
            state.minute = value
            if (selection == TimePickerSelectionMode.Minute) {
                anim = Animatable(minuteAngle)
            }
        }

    override var hourInput: Int
        get() = state.hour
        set(value) {
            hourAngle = RadiansPerHour * (value % 12) - FullCircle / 4
            state.hour = value
            if (selection == TimePickerSelectionMode.Hour) {
                anim = Animatable(hourAngle)
            }
        }

    private fun Float.normalize(): Float {
        var normalizedAngle = this % (2 * PI)

        if (normalizedAngle < 0) {
            normalizedAngle += 2 * PI
        }

        return normalizedAngle.toFloat()
    }

    private val mutex = MutatorMutex()

    private fun Float.toHour(): Int {
        val hourOffset: Float = RadiansPerHour / 2
        val totalOffset = hourOffset + QuarterCircle
        return ((this + totalOffset) / RadiansPerHour).toInt() % 12
    }

    private fun Float.toMinute(): Int {
        val minuteOffset: Float = RadiansPerMinute / 2
        val totalOffset = minuteOffset + QuarterCircle
        return ((this + totalOffset) / RadiansPerMinute).toInt() % 60
    }

    private fun offsetAngle(angle: Float): Float {
        val ret = angle + QuarterCircle.toFloat()
        return if (ret < 0) ret + FullCircle else ret
    }

    override fun onRemembered() {
        hourAngle = RadiansPerHour * (state.hour % 12) - FullCircle / 4
        minuteAngle = RadiansPerMinute * state.minute - FullCircle / 4
        anim =
            Animatable(
                if (state.selection == TimePickerSelectionMode.Hour) hourAngle else minuteAngle
            )
    }

    override fun onForgotten() {}

    override fun onAbandoned() {}
}
// END VERBATIM

// BEGIN VERBATIM hourForDisplay, moveSelector, onTap, selectorPos
internal val TimePickerState.hourForDisplay: Int
    get() =
        when {
            is24hour -> hour % 24
            hour % 12 == 0 -> 12
            isPm -> hour - 12
            else -> hour
        }

private fun TimePickerState.moveSelector(x: Float, y: Float, maxDist: Float, center: IntOffset) {
    if (selection == TimePickerSelectionMode.Hour && is24hour) {
        val currentDist = dist(x, y, center.x, center.y)
        if (isPm) {
            hour -= if (currentDist >= maxDist) 12 else 0
        } else {
            hour += if (currentDist < maxDist) 12 else 0
        }
    }
}

private suspend fun AnalogTimePickerState.onTap(
    x: Float,
    y: Float,
    maxDist: Float,
    autoSwitchToMinute: Boolean,
    center: IntOffset,
    animationSpec: AnimationSpec<Float>,
) {
    var angle = atan(y - center.y, x - center.x)
    if (selection == TimePickerSelectionMode.Minute) {
        angle = round(angle / RadiansPerMinute / 5f) * 5f * RadiansPerMinute
    } else {
        angle = round(angle / RadiansPerHour) * RadiansPerHour
    }

    moveSelector(x, y, maxDist, center)
    rotateTo(angle, animationSpec = animationSpec, animate = true)

    if (selection == TimePickerSelectionMode.Hour && autoSwitchToMinute) {
        delay(100)
    }

    if (autoSwitchToMinute) {
        selection = TimePickerSelectionMode.Minute
    }
}

internal val AnalogTimePickerState.selectorPos: DpOffset
    get() {
        val scale: Float = currentDiameter / ClockDialContainerSize
        val handleRadiusDp = (ClockDialSelectorHandleContainerSize / 2f) * scale
        val selectorLength =
            if (is24hour && this.isPm && selection == TimePickerSelectionMode.Hour) {
                    currentDiameter * InnerCircleToSizeRatio
                } else {
                    currentDiameter * OuterCircleToSizeRatio
                }
                .minus(handleRadiusDp)
                .coerceAtLeast(0.dp)

        val length = selectorLength + handleRadiusDp
        val offsetX = length * cos(currentAngle) + currentDiameter / 2
        val offsetY = length * sin(currentAngle) + currentDiameter / 2

        return DpOffset(offsetX, offsetY)
    }
// END VERBATIM

// BEGIN VERBATIM shouldSwitchFocusToMinute
private fun shouldSwitchFocusToMinute(
    event: KeyEvent,
    hourState: TextFieldState,
    timePickerState: TimePickerState,
): Boolean {
    // Zero == 48, Nine == 57
    val isDigit = event.utf16CodePoint in 48..57
    val isCursorAtEnd = hourState.selection.start == 2 && hourState.text.length == 2
    val hourInt = hourState.text.toString().toIntOrNull()
    val isValidHour =
        hourInt?.let {
            (timePickerState.is24hour && it in 0..23) || (!timePickerState.is24hour && it in 1..12)
        } ?: false

    return isDigit && isCursorAtEnd && isValidHour
}
// END VERBATIM

// BEGIN VERBATIM TimeInputTransformation
private class TimeInputTransformation(
    private val timePickerSelection: TimePickerSelectionMode,
    private val timePickerState: TimePickerState,
    private val userOverride: Ref<Boolean>,
    private val a11yServicesEnabled: Boolean,
    private val errorHandler: TimeInputErrorHandler,
) : InputTransformation {

    override fun TextFieldBuffer.transformInput() {
        if (length == 0) {
            if (timePickerSelection == TimePickerSelectionMode.Hour) {
                val target = if (timePickerState.isPm && !timePickerState.is24hour) 12 else 0
                if (timePickerState.hour != target) {
                    userOverride.value = false
                }
                timePickerState.hourInput = target
            } else {
                if (timePickerState.minute != 0) {
                    userOverride.value = false
                }
                timePickerState.minuteInput = 0
            }
            return
        }

        if (!asCharSequence().all { it.isDigit() }) {
            revertAllChanges()
            return
        }

        val hasInsertedText = (length - (originalText.length - originalSelection.length)) > 0
        val isReplacingTwoDigits =
            originalSelection.collapsed && originalText.length == 2 && length == 3
        if (isReplacingTwoDigits) {
            if (selection.start == 1) {
                delete(1, 3)
            } else if (selection.start == 3) {
                delete(0, 2)
            } else if (selection.start == 2) {
                delete(2, 3)
                delete(0, 1)
            }
        }
        if (length > 2) {
            revertAllChanges()
            errorHandler.onError()
            return
        }

        val text = asCharSequence().toString()
        val newValue = text.toIntOrNull()
        if (newValue == null || newValue > MaxValueForTextField) {
            revertAllChanges()
            errorHandler.onError()
            return
        }

        if (timePickerSelection == TimePickerSelectionMode.Hour) {
            val target =
                when {
                    timePickerState.is24hour -> newValue
                    newValue == 12 -> if (timePickerState.isPm) 12 else 0
                    timePickerState.isPm -> newValue + 12
                    else -> newValue
                }
            if (timePickerState.isValidHour(target) && timePickerState.hour != target) {
                userOverride.value = false
            }
            timePickerState.hourInput = target
            val isTypedTwoDigits = length == 2
            val isTypingNewDigit = hasInsertedText
            val is12HourAutoAdvanceDigit = !timePickerState.is24hour && newValue in 2..9

            val shouldAutoAdvance =
                (isTypedTwoDigits || (isTypingNewDigit && is12HourAutoAdvanceDigit)) &&
                    !a11yServicesEnabled &&
                    timePickerState.isHourInputValid

            if (shouldAutoAdvance) {
                timePickerState.selection = TimePickerSelectionMode.Minute
            }
        } else {
            if (newValue in 0..MaxMinuteValue && timePickerState.minute != newValue) {
                userOverride.value = false
            }
            timePickerState.minuteInput = newValue
        }
    }
}
// END VERBATIM

// BEGIN VERBATIM dist, atan
private fun dist(x1: Float, y1: Float, x2: Int, y2: Int): Float {
    val x = x2 - x1
    val y = y2 - y1
    return hypot(x.toDouble(), y.toDouble()).toFloat()
}

private fun atan(y: Float, x: Float): Float {
    val ret = atan2(y, x) - QuarterCircle.toFloat()
    return if (ret < 0) ret + FullCircle else ret
}
// END VERBATIM

// BEGIN VERBATIM angle and text field constants
private const val FullCircle: Float = (PI * 2).toFloat()
private const val HalfCircle: Float = FullCircle / 2f
private const val QuarterCircle = PI / 2
private const val RadiansPerMinute: Float = FullCircle / 60
private const val RadiansPerHour: Float = FullCircle / 12f
private const val SeparatorZIndex = 2f
private const val MaxValueForTextField = 99
// END VERBATIM

// BEGIN VERBATIM circle ratios
private val OuterCircleToSizeRatio: Float
    get() = 101.dp / ClockDialContainerSize
private val InnerCircleToSizeRatio: Float
    get() = 69.dp / ClockDialContainerSize
// END VERBATIM

// BEGIN VERBATIM MaxDistance
private val MaxDistance
    get() = 74.dp
// END VERBATIM

// BEGIN VERBATIM clock face values
private val Minutes = intListOf(0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
private val Hours = intListOf(12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
private val ExtraHours: IntList =
    MutableIntList(Hours.size).apply { Hours.forEach { add((it % 12 + 12)) } }
// END VERBATIM

// BEGIN VERBATIM TimeInputErrorHandler
internal interface TimeInputErrorHandler {
    fun onError()
}
// END VERBATIM

/** ClockText's isTheSelectedValue (L3507–3519) for `value`. */
private fun isTheSelectedValue(state: TimePickerState, value: Int): Boolean {
// BEGIN VERBATIM isTheSelectedValue
    val isTheSelectedValue =
        remember(state.selection, state.hour, state.minute, state.is24hour, value) {
            if (state.selection == TimePickerSelectionMode.Hour) {
                if (state.is24hour) {
                    value == state.hour
                } else {
                    value == state.hourForDisplay
                }
            } else {
                val closestMinute = (kotlin.math.round(state.minute / 5f) * 5).toInt() % 60
                value == closestMinute
            }
        }
// END VERBATIM
    return isTheSelectedValue
}

/** CircularLayout's placement (L3941, L3951, L3959–3963) of `count` items in a `size` layout. */
private fun circularLayout(count: Int, size: Int, radiusToSizeRatio: Float, item: Int): List<Placeable> {
    val constraints = Constraints(size, size)
    val placeables = List(count) { Placeable(item, item) }
// BEGIN VERBATIM CircularLayout radius
        val radiusPx = constraints.maxHeight * radiusToSizeRatio
// END VERBATIM
// BEGIN VERBATIM CircularLayout theta
        val theta = FullCircle / (placeables.count())
// END VERBATIM
    placeables.forEachIndexed { i, it ->
// BEGIN VERBATIM CircularLayout placement
                val centerOffsetX = constraints.maxWidth / 2 - it.width / 2
                val centerOffsetY = constraints.maxHeight / 2 - it.height / 2
                val offsetX = radiusPx * cos(theta * i - QuarterCircle) + centerOffsetX
                val offsetY = radiusPx * sin(theta * i - QuarterCircle) + centerOffsetY
                it.place(x = offsetX.roundToInt(), y = offsetY.roundToInt())
// END VERBATIM
    }
    return placeables
}

private fun pick(index: Int) = index

/** TimeScrollImpl's hour wheel index for the state's hour (L2240–2242). */
private fun scrollIndex(state: TimePickerState): Int {
    return pick(
// BEGIN VERBATIM TimeScroll hour index
            index =
                if (state.is24hour) state.hour
                else (state.hour % 12).let { if (it == 0) 11 else it - 1 },
// END VERBATIM
    )
}

/** TimeScrollImpl's hour for the hour wheel's selected option (L2248–2256). */
private fun scrollHour(state: TimePickerState, selectedOption: Int): Int {
// BEGIN VERBATIM TimeScroll hour from index
        val newHour =
            if (state.is24hour) {
                selectedOption
            } else {
                val base = (selectedOption + 1) % 12
                val amPmOffset = if (state.isPm) 12 else 0

                base + amPmOffset
            }
// END VERBATIM
    return newHour
}

/** rememberScrollFieldState's first page (ScrollField.kt). */
private fun initialPage(itemCount: Int, index: Int): Int {
    val InfinitePageCount = 100_000
// BEGIN VERBATIM ScrollField initialPage
    val initialPage =
        remember(itemCount, index) {
            val coercedIndex = if (itemCount > 0) index.coerceIn(0, itemCount - 1) else 0
            (InfinitePageCount / 2) - (InfinitePageCount / 2 % itemCount) + coercedIndex
        }
// END VERBATIM
    return initialPage
}

/** ScrollFieldState.calculateTargetPage (ScrollField.kt) from `currentPage`. */
private class Pager(val currentPage: Int)

private class ScrollField(currentPage: Int, val itemCount: Int) {
    val pagerState = Pager(currentPage)

    fun target(option: Int) = calculateTargetPage(option)

// BEGIN VERBATIM ScrollField calculateTargetPage
    private fun calculateTargetPage(option: Int): Int {
        val currentContextPage = pagerState.currentPage
        val currentOption = currentContextPage % itemCount
        val diff = option - currentOption
        return currentContextPage + diff
    }
// END VERBATIM
}

// ---- The cases. Every Float is printed with Kotlin's Float.toString (shortest round trip).

private val json = StringBuilder()

private fun run(block: suspend () -> Unit) {
    var error: Throwable? = null
    block.startCoroutine(Continuation(EmptyCoroutineContext) { error = it.exceptionOrNull() })
    error?.let { throw it }
}

private fun f(v: Float) = if (v.isNaN()) "null" else v.toString()

private fun anim(state: AnalogTimePickerState): Animatable {
    val field = AnalogTimePickerState::class.java.getDeclaredField("anim")
    field.isAccessible = true
    return field.get(state) as Animatable
}

private fun settle(state: AnalogTimePickerState) {
    val a = anim(state)
    a.value = a.targetValue
}

private fun sel(mode: TimePickerSelectionMode) = if (mode == TimePickerSelectionMode.Hour) "hour" else "minute"

private fun dial(state: AnalogTimePickerState): String {
    val a = anim(state)
    return "\"hour\":${state.hour},\"minute\":${state.minute},\"hourInput\":${state.state.hourInput}," +
        "\"minuteInput\":${state.state.minuteInput},\"selection\":\"${sel(state.selection)}\"," +
        "\"value\":${f(a.value)},\"target\":${f(a.targetValue)}"
}

private fun pos(state: AnalogTimePickerState, diameter: Float): String {
    state.currentDiameter = Dp(diameter)
    val p = state.selectorPos
    return "{\"x\":${f(p.x.value)},\"y\":${f(p.y.value)}}"
}

private fun newDial(hour: Int, minute: Int, is24: Boolean, mode: TimePickerSelectionMode): AnalogTimePickerState {
    val state = AnalogTimePickerState(TimePickerState(hour, minute, is24, mode))
    state.onRemembered()
    return state
}

private val modes = listOf(TimePickerSelectionMode.Hour, TimePickerSelectionMode.Minute)

fun main() {
    json.append("{\"constants\":{\"fullCircle\":${f(FullCircle)},\"halfCircle\":${f(HalfCircle)},")
    json.append("\"radiansPerMinute\":${f(RadiansPerMinute)},\"radiansPerHour\":${f(RadiansPerHour)},")
    json.append("\"outerRatio\":${f(OuterCircleToSizeRatio)},\"innerRatio\":${f(InnerCircleToSizeRatio)},")
    json.append("\"maxDistance\":${f(MaxDistance.value)}},")

    // atan / dist from the dial's center (128, 128).
    val offsets = listOf(-120f, -77.5f, -48f, -24.25f, -1f, 0f, 1f, 24.25f, 48f, 77.5f, 120f)
    json.append("\"geometry\":[")
    var first = true
    for (dx in offsets) for (dy in offsets) {
        if (!first) json.append(',')
        first = false
        val x = 128f + dx
        val y = 128f + dy
        json.append("{\"x\":${f(x)},\"y\":${f(y)},\"atan\":${f(atan(y - 128, x - 128))},\"dist\":${f(dist(x, y, 128, 128))}}")
    }
    json.append("],")

    // Taps on the dial: every 15°, on the outer and inner circles and near the middle.
    json.append("\"taps\":[")
    first = true
    val maxDist = MaxDistance.value
    for (is24 in listOf(false, true)) for (hour in listOf(7, 19)) for (mode in modes) {
        for (radius in listOf(101f, 69f, 30.5f)) for (step in 0 until 24) {
            val angle = step * 15.0 * PI / 180
            val x = (128 + radius * kotlin.math.cos(angle)).toFloat()
            val y = (128 + radius * kotlin.math.sin(angle)).toFloat()
            val state = newDial(hour, 23, is24, mode)
            run { state.onTap(x, y, maxDist, false, IntOffset(128, 128), TestSpec) }
            if (!first) json.append(',')
            first = false
            json.append("{\"is24\":$is24,\"hour\":$hour,\"mode\":\"${sel(mode)}\",\"x\":${f(x)},\"y\":${f(y)},")
            json.append("\"after\":{${dial(state)}},")
            settle(state)
            json.append("\"settled\":${pos(state, 256f)}}")
        }
    }
    json.append("],")

    // Drags (ClockDialNode L3218–3229) then the gesture end (L3210–3216, without the auto switch),
    // then a selection switch (animateToCurrent).
    json.append("\"drags\":[")
    first = true
    for (is24 in listOf(false, true)) for (mode in modes) for (start in listOf(Pair(128f, 27f), Pair(200f, 140f))) {
        val state = newDial(10, 41, is24, mode)
        var offsetX = start.first
        var offsetY = start.second
        if (!first) json.append(',')
        first = false
        json.append("{\"is24\":$is24,\"mode\":\"${sel(mode)}\",\"start\":[${f(offsetX)},${f(offsetY)}],\"steps\":[")
        val moves = listOf(Pair(13.5f, 4f), Pair(21f, 19.25f), Pair(-3f, 30f), Pair(-40f, 12f), Pair(-55.5f, -20f), Pair(-10f, -31f), Pair(30f, -60f))
        moves.forEachIndexed { i, (dx, dy) ->
            run {
                offsetX += dx
                offsetY += dy
                state.rotateTo(atan(offsetY - 128, offsetX - 128), TestSpec)
                state.moveSelector(x = offsetX, y = offsetY, maxDist = maxDist, center = IntOffset(128, 128))
            }
            if (i > 0) json.append(',')
            json.append("{\"dx\":${f(dx)},\"dy\":${f(dy)},${dial(state)},\"pos\":${pos(state, 256f)}}")
        }
        run { state.onGestureEnd(TestSpec) }
        json.append("],\"end\":{${dial(state)}},")
        state.selection = if (mode == TimePickerSelectionMode.Hour) TimePickerSelectionMode.Minute else TimePickerSelectionMode.Hour
        var switched = "null"
        run { state.animateToCurrent(TestSpec) }
        switched = "{${dial(state)}}"
        json.append("\"switched\":$switched}")
    }
    json.append("],")

    // Setting the hour / minute from outside the dial, then the selector position at three sizes.
    json.append("\"inputs\":[")
    first = true
    for (is24 in listOf(false, true)) for (mode in modes) for (h in listOf(0, 5, 12, 13, 23)) for (m in listOf(0, 7, 30, 59)) {
        val state = newDial(3, 15, is24, mode)
        state.hourInput = h
        state.minuteInput = m
        if (!first) json.append(',')
        first = false
        json.append("{\"is24\":$is24,\"mode\":\"${sel(mode)}\",\"h\":$h,\"m\":$m,${dial(state)},")
        json.append("\"pos\":[${pos(state, 256f)},${pos(state, 238f)},${pos(state, 200f)}]}")
    }
    json.append("],")

    // CircularLayout (48dp items).
    json.append("\"layout\":[")
    first = true
    for (size in listOf(256, 238, 200)) for (ratio in listOf(OuterCircleToSizeRatio, InnerCircleToSizeRatio)) {
        val placed = circularLayout(12, size, ratio, 48)
        if (!first) json.append(',')
        first = false
        json.append("{\"size\":$size,\"ratio\":${f(ratio)},\"offsets\":[")
        json.append(placed.joinToString(",") { "[${it.x},${it.y}]" })
        json.append("]}")
    }
    json.append("],")

    // isTheSelectedValue: every minute against the minute labels; every hour against the hours.
    json.append("\"selectedValues\":[")
    first = true
    for (is24 in listOf(false, true)) for (mode in modes) for (v in 0..59) {
        if (mode == TimePickerSelectionMode.Hour && v > 23) continue
        val state = TimePickerState(if (mode == TimePickerSelectionMode.Hour) v else 9, if (mode == TimePickerSelectionMode.Minute) v else 0, is24, mode)
        val labels = if (mode == TimePickerSelectionMode.Minute) listOf(0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
            else (0..23).toList()
        if (!first) json.append(',')
        first = false
        json.append("{\"is24\":$is24,\"mode\":\"${sel(mode)}\",\"v\":$v,\"selected\":[")
        json.append(labels.filter { isTheSelectedValue(state, it) }.joinToString(","))
        json.append("]}")
    }
    json.append("],")

    // TimeInputTransformation.
    json.append("\"inputTransforms\":[")
    first = true
    val edits = listOf(
        listOf("09", 0, 0, "109", 1), listOf("09", 2, 2, "093", 3), listOf("09", 1, 1, "059", 2),
        listOf("09", 0, 2, "5", 1), listOf("09", 0, 2, "", 0), listOf("0", 1, 1, "07", 2),
        listOf("", 0, 0, "1", 1), listOf("", 0, 0, "2", 1), listOf("1", 1, 1, "12", 2),
        listOf("1", 1, 1, "13", 2), listOf("2", 1, 1, "24", 2), listOf("09", 2, 2, "09a", 3),
        listOf("12", 2, 2, "123", 3), listOf("99", 0, 2, "100", 3), listOf("05", 1, 1, "0", 0),
        listOf("٠٩", 2, 2, "٠٩٥", 3), listOf("", 0, 0, "77", 2),
        listOf("", 0, 0, "777", 3), listOf("11", 0, 0, "011", 1), listOf("23", 2, 2, "230", 3),
        listOf("00", 1, 1, "060", 2),
    )
    val states = listOf(Triple(false, 9, 30), Triple(false, 21, 5), Triple(true, 9, 30), Triple(true, 21, 5), Triple(false, 0, 0), Triple(false, 12, 59))
    for ((is24, h0, m0) in states) for (mode in modes) for (a11y in listOf(false, true)) for (e in edits) {
        if (a11y && (h0 != 9 || is24)) continue
        val state = TimePickerState(h0, m0, is24, TimePickerSelectionMode.Hour)
        val override = Ref<Boolean>().apply { value = true }
        var errors = 0
        val handler = object : TimeInputErrorHandler { override fun onError() { errors++ } }
        val transformation = TimeInputTransformation(mode, state, override, a11y, handler)
        val buffer = TextFieldBuffer(e[0] as String, TextRange(e[1] as Int, e[2] as Int), e[3] as String, TextRange(e[4] as Int, e[4] as Int))
        with(transformation) { buffer.transformInput() }
        if (!first) json.append(',')
        first = false
        fun q(s: CharSequence) = "\"" + s.toString().map { if (it.code > 127) "\\u%04x".format(it.code) else it.toString() }.joinToString("") + "\""
        json.append("{\"is24\":$is24,\"h0\":$h0,\"m0\":$m0,\"mode\":\"${sel(mode)}\",\"a11y\":$a11y,")
        json.append("\"original\":${q(e[0] as String)},\"oStart\":${e[1]},\"oEnd\":${e[2]},\"edited\":${q(e[3] as String)},\"cursor\":${e[4]},")
        json.append("\"text\":${q(buffer.asCharSequence())},\"start\":${buffer.selection.start},\"end\":${buffer.selection.end},")
        json.append("\"reverted\":${buffer.reverted},\"error\":${errors > 0},\"hour\":${state.hour},\"minute\":${state.minute},")
        json.append("\"hourInput\":${state.hourInput},\"minuteInput\":${state.minuteInput},\"selection\":\"${sel(state.selection)}\",")
        json.append("\"userOverride\":${override.value}}")
    }
    json.append("],")

    // shouldSwitchFocusToMinute.
    json.append("\"focusSwitch\":[")
    first = true
    for (is24 in listOf(false, true)) for (text in listOf("", "1", "09", "12", "13", "23", "24", "00", "+1")) for (cursor in listOf(0, 2)) for (code in listOf(48, 55, 57, 97)) {
        if (cursor > text.length) continue
        val state = TimePickerState(0, 0, is24, TimePickerSelectionMode.Hour)
        val result = shouldSwitchFocusToMinute(KeyEvent(code), TextFieldState(text, TextRange(cursor, cursor)), state)
        if (!first) json.append(',')
        first = false
        json.append("{\"is24\":$is24,\"text\":\"$text\",\"cursor\":$cursor,\"code\":$code,\"result\":$result}")
    }
    json.append("],")

    // TimeScroll wheel indices and ScrollField pages.
    json.append("\"scroll\":{\"index\":[")
    json.append((0..23).flatMap { h -> listOf(false, true).map { is24 -> "[$h,$is24,${scrollIndex(TimePickerState(h, 0, is24, TimePickerSelectionMode.Hour))}]" } }.joinToString(","))
    json.append("],\"hour\":[")
    json.append((0..23).flatMap { i -> listOf(false, true).flatMap { is24 -> listOf(3, 15).map { h -> "[$i,$is24,$h,${scrollHour(TimePickerState(h, 0, is24, TimePickerSelectionMode.Hour), i)}]" } } }.joinToString(","))
    json.append("],\"initialPage\":[")
    json.append(listOf(12, 24, 60, 7).flatMap { n -> listOf(-3, 0, 5, 11, 23, 59, 70).map { i -> "[$n,$i,${initialPage(n, i)}]" } }.joinToString(","))
    json.append("],\"targetPage\":[")
    json.append(listOf(50004, 49992, 50015, 49999).flatMap { page -> listOf(12, 60).flatMap { n -> listOf(0, 3, n - 1).map { o -> "[$page,$n,$o,${ScrollField(page, n).target(o)}]" } } }.joinToString(","))
    json.append("]}}")
    println(json)
}
