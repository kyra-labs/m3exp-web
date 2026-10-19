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
// JVM reference harness for @kyralabs/m3e-motion's date picker port (date-picker.ts, COMPONENT_SPEC
// §27). Run by tools/jvm/kotlin.mjs (`pnpm reference:date-picker`); prints JSON to stdout.
//
// DatePicker.kt, DateRangePicker.kt and DateInput.kt are composable files and do not compile
// without the Compose runtime, so the code the port follows is copied here VERBATIM from the
// vendored packages/m3e-codegen/vendor/androidx-material3-sources/*.kt@19991f2c (marked
// "BEGIN/END VERBATIM"; packages/m3e-codegen/src/date-picker-sources.test.ts fails if a copy drifts
// from the vendored file), over the shims in DatePickerShims.kt and the calendar model
// (CalendarModelReference.kt + the vendored CalendarModelImpl.android.kt, compiled unchanged): the
// states and their validation, the months' enabled bounds, the range selection and its drawn
// background, the date input's validator and transformations.
@file:Suppress("UNUSED_VARIABLE", "UNUSED_PARAMETER", "unused")

package androidx.compose.material3

import androidx.compose.material3.internal.CalendarDate
import androidx.compose.material3.internal.CalendarModel
import androidx.compose.material3.internal.CalendarMonth
import androidx.compose.material3.internal.DateInputFormat
import androidx.compose.material3.internal.DaysInWeek
import androidx.compose.material3.internal.MillisecondsIn24Hours
import androidx.compose.material3.internal.createCalendarModel
import androidx.compose.material3.internal.datePatternAsInputFormat
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import kotlin.math.max

// BEGIN VERBATIM DatePickerState
@Stable
public interface DatePickerState {

    /**
     * A timestamp that represents the selected date _start_ of the day in _UTC_ milliseconds from
     * the epoch.
     *
     * @throws IllegalArgumentException in case the value is set with a timestamp that does not fall
     *   within the [yearRange].
     */
    @get:Suppress("AutoBoxing") public var selectedDateMillis: Long?

    /**
     * A timestamp that represents the currently displayed month _start_ date in _UTC_ milliseconds
     * from the epoch.
     *
     * @throws IllegalArgumentException in case the value is set with a timestamp that does not fall
     *   within the [yearRange].
     */
    public var displayedMonthMillis: Long

    /** A [DisplayMode] that represents the current UI mode (i.e. picker or input). */
    public var displayMode: DisplayMode

    /** An [IntRange] that holds the year range that the date picker will be limited to. */
    public val yearRange: IntRange

    /**
     * A [SelectableDates] that is consulted to check if a date is allowed.
     *
     * In case a date is not allowed to be selected, it will appear disabled in the UI.
     */
    public val selectableDates: SelectableDates

    /**
     * A locale that will be used when formatting dates, determining the input format, week-days,
     * and more.
     */
    public val locale: CalendarLocale
}
// END VERBATIM

// BEGIN VERBATIM SelectableDates
@Stable
public interface SelectableDates {

    /**
     * Returns true if the date item representing the [utcTimeMillis] should be enabled for
     * selection in the UI.
     */
    public fun isSelectableDate(utcTimeMillis: Long): Boolean = true

    /**
     * Returns true if a given [year] should be enabled for selection in the UI. When a year is
     * defined as non selectable, all the dates in that year will also be non selectable.
     */
    public fun isSelectableYear(year: Int): Boolean = true
}
// END VERBATIM

// BEGIN VERBATIM DatePickerFormatter
public interface DatePickerFormatter {

    /**
     * Format a given [monthMillis] to a string representation of the month and the year (i.e.
     * January 2023).
     *
     * @param monthMillis timestamp in _UTC_ milliseconds from the epoch that represents the month
     * @param locale a [CalendarLocale] to use when formatting the month and year
     */
    public fun formatMonthYear(
        @Suppress("AutoBoxing") monthMillis: Long?,
        locale: CalendarLocale,
    ): String?

    /**
     * Format a given [dateMillis] to a string representation of the date (i.e. Mar 27, 2021).
     *
     * @param dateMillis timestamp in _UTC_ milliseconds from the epoch that represents the date
     * @param locale a [CalendarLocale] to use when formatting the date
     * @param forContentDescription indicates that the requested formatting is for content
     *   description. In these cases, the output may include a more descriptive wording that will be
     *   passed to a screen readers.
     */
    public fun formatDate(
        @Suppress("AutoBoxing") dateMillis: Long?,
        locale: CalendarLocale,
        forContentDescription: Boolean = false,
    ): String?
}
// END VERBATIM

// BEGIN VERBATIM DisplayMode
@Immutable
@JvmInline
public value class DisplayMode internal constructor(internal val value: Int) {

    public companion object {
        /** Date picker mode */
        public val Picker: DisplayMode
            get() = DisplayMode(0)

        /** Date text input mode */
        public val Input: DisplayMode
            get() = DisplayMode(1)
    }

    override fun toString(): String =
        when (this) {
            Picker -> "Picker"
            Input -> "Input"
            else -> "Unknown"
        }
}
// END VERBATIM

// BEGIN VERBATIM BaseDatePickerStateImpl
@Stable
internal abstract class BaseDatePickerStateImpl(
    @Suppress("AutoBoxing") initialDisplayedMonthMillis: Long?,
    val yearRange: IntRange,
    selectableDates: SelectableDates,
    val locale: CalendarLocale,
) {

    val calendarModel = createCalendarModel(locale)

    var selectableDates by mutableStateOf(selectableDates)

    private val _displayedMonth =
        mutableStateOf(
            if (initialDisplayedMonthMillis != null) {
                var month = calendarModel.getMonth(initialDisplayedMonthMillis)
                if (!yearRange.contains(month.year)) {
                    // The initial display month's year is out of the years range, so just set the
                    // displayed month to the current one.
                    month = calendarModel.getMonth(calendarModel.today)
                }
                month
            } else {
                // Set the displayed month to the current one.
                calendarModel.getMonth(calendarModel.today)
            }
        )

    var displayedMonthMillis: Long
        get() = _displayedMonth.value.startUtcTimeMillis
        set(monthMillis) {
            val month = calendarModel.getMonth(monthMillis)
            // Set the displayed month only if the month's year is within the years range.
            if (yearRange.contains(month.year)) {
                _displayedMonth.value = month
            }
        }
}
// END VERBATIM

// BEGIN VERBATIM DatePickerStateImpl
@Stable
private class DatePickerStateImpl(
    @Suppress("AutoBoxing") initialSelectedDateMillis: Long?,
    @Suppress("AutoBoxing") initialDisplayedMonthMillis: Long?,
    yearRange: IntRange,
    initialDisplayMode: DisplayMode,
    selectableDates: SelectableDates,
    locale: CalendarLocale,
) :
    BaseDatePickerStateImpl(initialDisplayedMonthMillis, yearRange, selectableDates, locale),
    DatePickerState {

    /**
     * A mutable state of [androidx.compose.material3.internal.CalendarDate] that represents a
     * selected date.
     */
    private var _selectedDate =
        mutableStateOf(
            if (initialSelectedDateMillis != null) {
                val date = calendarModel.getCanonicalDate(initialSelectedDateMillis)
                // If the provided initial date's year is out of the years range, return null.
                // Otherwise, return the date.
                if (yearRange.contains(date.year)) date else null
            } else {
                null
            }
        )

    override var selectedDateMillis: Long?
        @Suppress("AutoBoxing") get() = _selectedDate.value?.utcTimeMillis
        set(@Suppress("AutoBoxing") dateMillis) {
            if (dateMillis != null) {
                val date = calendarModel.getCanonicalDate(dateMillis)
                // Validate that the give date is within the valid years range. In not, set the
                // selected date to null.
                _selectedDate.value = if (yearRange.contains(date.year)) date else null
            } else {
                _selectedDate.value = null
            }
        }

    /**
     * A mutable state of [DisplayMode] that represents the current display mode of the UI (i.e.
     * picker or input).
     */
    private var _displayMode = mutableStateOf(initialDisplayMode)

    override var displayMode
        get() = _displayMode.value
        set(displayMode) {
            selectedDateMillis?.let {
                displayedMonthMillis = calendarModel.getMonth(it).startUtcTimeMillis
            }
            _displayMode.value = displayMode
        }
// END VERBATIM
}

// BEGIN VERBATIM numberOfMonthsInRange
internal fun numberOfMonthsInRange(yearRange: IntRange) =
    (yearRange.last - yearRange.first + 1) * 12
// END VERBATIM

// BEGIN VERBATIM getFirstEnabledDay, getLastEnabledDay
private fun getFirstEnabledDay(month: CalendarMonth, selectableDates: SelectableDates): Int {
    var firstCell = month.daysFromStartOfWeekToFirstOfMonth
    val lastCell = (month.daysFromStartOfWeekToFirstOfMonth + month.numberOfDays) - 1
    if (selectableDates.isSelectableYear(month.year)) {
        var day = 0
        while (
            !selectableDates.isSelectableDate(
                month.startUtcTimeMillis + (day * MillisecondsIn24Hours)
            ) && firstCell <= lastCell
        ) {
            day++
            firstCell++
        }
    }
    return firstCell
}

private fun getLastEnabledDay(month: CalendarMonth, selectableDates: SelectableDates): Int {
    val firstCell = month.daysFromStartOfWeekToFirstOfMonth
    var lastCell = (month.daysFromStartOfWeekToFirstOfMonth + month.numberOfDays) - 1
    if (selectableDates.isSelectableYear(month.year)) {
        var day = 0
        while (
            !selectableDates.isSelectableDate(
                month.endUtcTimeMillis - (day * MillisecondsIn24Hours)
            ) && lastCell >= firstCell
        ) {
            day++
            lastCell--
        }
    }
    return lastCell
}
// END VERBATIM

// BEGIN VERBATIM RecommendedSizeForAccessibility
internal val RecommendedSizeForAccessibility
    get() = 48.dp
// END VERBATIM

// BEGIN VERBATIM MaxCalendarRows, YearsInRow
private const val MaxCalendarRows = 6
private const val YearsInRow: Int = 3
// END VERBATIM

object DatePickerDefaults {
// BEGIN VERBATIM DatePickerDefaults.YearRange
    public val YearRange: IntRange = IntRange(1900, 2100)
// END VERBATIM
}

// BEGIN VERBATIM DateRangePickerState
@Stable
public interface DateRangePickerState {

    /**
     * A timestamp that represents the selected start date _start_ of the day in _UTC_ milliseconds
     * from the epoch.
     *
     * @see [setSelection] for setting this value along with the [selectedEndDateMillis].
     */
    @get:Suppress("AutoBoxing") public val selectedStartDateMillis: Long?

    /**
     * A timestamp that represents the selected end date _start_ of the day in _UTC_ milliseconds
     * from the epoch.
     *
     * @see [setSelection] for setting this value along with the [selectedStartDateMillis].
     */
    @get:Suppress("AutoBoxing") public val selectedEndDateMillis: Long?

    /**
     * A timestamp that represents the currently displayed month _start_ date in _UTC_ milliseconds
     * from the epoch.
     *
     * @throws IllegalArgumentException in case the value is set with a timestamp that does not fall
     *   within the [yearRange].
     */
    public var displayedMonthMillis: Long

    /** A [DisplayMode] that represents the current UI mode (i.e. picker or input). */
    public var displayMode: DisplayMode

    /** An [IntRange] that holds the year range that the date picker will be limited to. */
    public val yearRange: IntRange

    /**
     * A [SelectableDates] that is consulted to check if a date is allowed.
     *
     * In case a date is not allowed to be selected, it will appear disabled in the UI.
     */
    public val selectableDates: SelectableDates

    /**
     * A locale that will be used when formatting dates, determining the input format, week-days,
     * and more.
     */
    public val locale: CalendarLocale

    /**
     * Sets a start and end selection dates.
     *
     * The function expects the dates to be within the state's year-range, and for the start date to
     * appear before, or be equal, the end date. Also, if an end date is provided (e.g. not `null`),
     * a start date is also expected to be provided. In any other case, an
     * [IllegalArgumentException] is thrown.
     *
     * @param startDateMillis timestamp in _UTC_ milliseconds from the epoch that represents the
     *   start date selection. Provide a `null` to indicate no selection.
     * @param endDateMillis timestamp in _UTC_ milliseconds from the epoch that represents the end
     *   date selection. Provide a `null` to indicate no selection.
     * @throws IllegalArgumentException in case the given timestamps do not comply with the expected
     *   values specified above.
     */
    public fun setSelection(
        @Suppress("AutoBoxing") startDateMillis: Long?,
        @Suppress("AutoBoxing") endDateMillis: Long?,
    )
}
// END VERBATIM

// BEGIN VERBATIM DateRangePickerStateImpl
@Stable
private class DateRangePickerStateImpl(
    @Suppress("AutoBoxing") initialSelectedStartDateMillis: Long?,
    @Suppress("AutoBoxing") initialSelectedEndDateMillis: Long?,
    @Suppress("AutoBoxing") initialDisplayedMonthMillis: Long?,
    yearRange: IntRange,
    initialDisplayMode: DisplayMode,
    selectableDates: SelectableDates,
    locale: CalendarLocale,
) :
    BaseDatePickerStateImpl(initialDisplayedMonthMillis, yearRange, selectableDates, locale),
    DateRangePickerState {

    /** A mutable state of [CalendarDate] that represents a selected start date. */
    private var _selectedStartDate = mutableStateOf<CalendarDate?>(null)

    /** A mutable state of [CalendarDate] that represents a selected end date. */
    private var _selectedEndDate = mutableStateOf<CalendarDate?>(null)

    /** Initialize the state with the provided initial selections. */
    init {
        setSelection(
            startDateMillis = initialSelectedStartDateMillis,
            endDateMillis = initialSelectedEndDateMillis,
        )
    }

    /**
     * A timestamp that represents the _start_ of the day of the selected start date in _UTC_
     * milliseconds from the epoch.
     *
     * In case no date was selected or provided, the state will hold a `null` value.
     *
     * @throws IllegalArgumentException in case a set timestamp does not fall within the year range
     *   this state was created with.
     */
    override val selectedStartDateMillis: Long?
        @Suppress("AutoBoxing") get() = _selectedStartDate.value?.utcTimeMillis

    /**
     * A timestamp that represents the _start_ of the day of the selected end date in _UTC_
     * milliseconds from the epoch.
     *
     * In case no date was selected or provided, the state will hold a `null` value.
     *
     * @throws IllegalArgumentException in case a set timestamp does not fall within the year range
     *   this state was created with.
     */
    override val selectedEndDateMillis: Long?
        @Suppress("AutoBoxing") get() = _selectedEndDate.value?.utcTimeMillis

    /**
     * A mutable state of [DisplayMode] that represents the current display mode of the UI (i.e.
     * picker or input).
     */
    private var _displayMode = mutableStateOf(initialDisplayMode)

    override var displayMode
        get() = _displayMode.value
        set(displayMode) {
            selectedStartDateMillis?.let {
                displayedMonthMillis = calendarModel.getMonth(it).startUtcTimeMillis
            }
            _displayMode.value = displayMode
        }

    override fun setSelection(
        @Suppress("AutoBoxing") startDateMillis: Long?,
        @Suppress("AutoBoxing") endDateMillis: Long?,
    ) {
        val startDate = getDate(startDateMillis)
        val endDate = getDate(endDateMillis)

        // Validate that an end date cannot be set without a start date and that the end date
        // appears on or after the start date.
        if (
            startDate != null &&
                (endDate == null || startDate.utcTimeMillis <= endDate.utcTimeMillis)
        ) {
            _selectedStartDate.value = startDate
            _selectedEndDate.value = endDate
        } else {
            _selectedStartDate.value = null
            _selectedEndDate.value = null
        }
    }

    private fun getDate(dateMillis: Long?) =
        if (dateMillis != null) {
            val date = calendarModel.getCanonicalDate(dateMillis)
            // Validate that the date is within the valid years range.
            if (yearRange.contains(date.year)) {
                date
            } else {
                null
            }
        } else {
            null
        }
// END VERBATIM
}

// BEGIN VERBATIM updateDateSelection
private fun updateDateSelection(
    dateInMillis: Long,
    currentStartDateMillis: Long?,
    currentEndDateMillis: Long?,
    onDatesSelectionChange: (startDateMillis: Long?, endDateMillis: Long?) -> Unit,
) {
    if (
        (currentStartDateMillis == null && currentEndDateMillis == null) ||
            (currentStartDateMillis != null && currentEndDateMillis != null)
    ) {
        // Set the selection to "start" only.
        onDatesSelectionChange(dateInMillis, null)
    } else if (currentStartDateMillis != null && dateInMillis >= currentStartDateMillis) {
        // Set the end date.
        onDatesSelectionChange(currentStartDateMillis, dateInMillis)
    } else {
        // The user selected an earlier date than the start date, so reset the start.
        onDatesSelectionChange(dateInMillis, null)
    }
}
// END VERBATIM

// BEGIN VERBATIM SelectedRangeInfo
internal class SelectedRangeInfo(
    val gridStartCoordinates: IntOffset,
    val gridEndCoordinates: IntOffset,
    val firstIsSelectionStart: Boolean,
    val lastIsSelectionEnd: Boolean,
) {
    companion object {
        /**
         * Calculates the selection coordinates within the current month's grid. The returned [Pair]
         * holds the actual item x & y coordinates within the LazyVerticalGrid, and is later used to
         * calculate the exact offset for drawing the selection rectangles when in range-selection
         * mode.
         */
        @OptIn(ExperimentalMaterial3Api::class)
        fun calculateRangeInfo(
            month: CalendarMonth,
            startDate: CalendarDate,
            endDate: CalendarDate,
        ): SelectedRangeInfo? {
            if (
                startDate.utcTimeMillis > month.endUtcTimeMillis ||
                    endDate.utcTimeMillis < month.startUtcTimeMillis
            ) {
                return null
            }
            val firstIsSelectionStart = startDate.utcTimeMillis >= month.startUtcTimeMillis
            val lastIsSelectionEnd = endDate.utcTimeMillis <= month.endUtcTimeMillis
            val startGridItemOffset =
                if (firstIsSelectionStart) {
                    month.daysFromStartOfWeekToFirstOfMonth + startDate.dayOfMonth - 1
                } else {
                    month.daysFromStartOfWeekToFirstOfMonth
                }
            val endGridItemOffset =
                if (lastIsSelectionEnd) {
                    month.daysFromStartOfWeekToFirstOfMonth + endDate.dayOfMonth - 1
                } else {
                    month.daysFromStartOfWeekToFirstOfMonth + month.numberOfDays - 1
                }

            // Calculate the selected coordinates within the cells grid.
            val gridStartCoordinates =
                IntOffset(
                    x = startGridItemOffset % DaysInWeek,
                    y = startGridItemOffset / DaysInWeek,
                )
            val gridEndCoordinates =
                IntOffset(x = endGridItemOffset % DaysInWeek, y = endGridItemOffset / DaysInWeek)
            return SelectedRangeInfo(
                gridStartCoordinates,
                gridEndCoordinates,
                firstIsSelectionStart,
                lastIsSelectionEnd,
            )
        }
    }
}
// END VERBATIM

// BEGIN VERBATIM drawRangeBackground
internal fun ContentDrawScope.drawRangeBackground(
    selectedRangeInfo: SelectedRangeInfo,
    color: Color,
) {
    // The LazyVerticalGrid is defined to space the items horizontally by
    // DaysHorizontalPadding (e.g. 4.dp). However, as the grid is not limited in
    // width, the spacing can go beyond that value, so this drawing takes this into
    // account.
    // TODO: Use the date's container width and height from the tokens once b/247694457 is resolved.
    val itemContainerWidth = RecommendedSizeForAccessibility.toPx()
    val itemContainerHeight = RecommendedSizeForAccessibility.toPx()
    val itemStateLayerHeight = DatePickerModalTokens.DateStateLayerHeight.toPx()
    val stateLayerVerticalPadding = (itemContainerHeight - itemStateLayerHeight) / 2
    val horizontalSpaceBetweenItems =
        (this.size.width - DaysInWeek * itemContainerWidth) / DaysInWeek

    val (x1, y1) = selectedRangeInfo.gridStartCoordinates
    val (x2, y2) = selectedRangeInfo.gridEndCoordinates
    // The endX and startX are offset to include only half the item's width when dealing with first
    // and last items in the selection in order to keep the selection edges rounded.
    var startX =
        x1 * (itemContainerWidth + horizontalSpaceBetweenItems) +
            (if (selectedRangeInfo.firstIsSelectionStart) itemContainerWidth / 2 else 0f) +
            horizontalSpaceBetweenItems / 2
    val startY = y1 * itemContainerHeight + stateLayerVerticalPadding
    var endX =
        x2 * (itemContainerWidth + horizontalSpaceBetweenItems) +
            (if (selectedRangeInfo.lastIsSelectionEnd) itemContainerWidth / 2
            else itemContainerWidth) +
            horizontalSpaceBetweenItems / 2
    val endY = y2 * itemContainerHeight + stateLayerVerticalPadding

    val isRtl = layoutDirection == LayoutDirection.Rtl
    // Adjust the start and end in case the layout is RTL.
    if (isRtl) {
        startX = this.size.width - startX
        endX = this.size.width - endX
    }

    // Draw the first row background
    drawRect(
        color = color,
        topLeft = Offset(startX, startY),
        size =
            Size(
                width =
                    when {
                        y1 == y2 -> endX - startX
                        isRtl -> -startX
                        else -> this.size.width - startX
                    },
                height = itemStateLayerHeight,
            ),
    )

    if (y1 != y2) {
        for (y in y2 - y1 - 1 downTo 1) {
            // Draw background behind the rows in between.
            drawRect(
                color = color,
                topLeft = Offset(0f, startY + (y * itemContainerHeight)),
                size = Size(width = this.size.width, height = itemStateLayerHeight),
            )
        }
        // Draw the last row selection background
        val topLeftX = if (layoutDirection == LayoutDirection.Ltr) 0f else this.size.width
        drawRect(
            color = color,
            topLeft = Offset(topLeftX, endY),
            size =
                Size(
                    width = if (isRtl) endX - this.size.width else endX,
                    height = itemStateLayerHeight,
                ),
        )
    }
}
// END VERBATIM

// BEGIN VERBATIM DateInputValidator
@Stable
internal class DateInputValidator(
    private val yearRange: IntRange,
    private val selectableDates: SelectableDates,
    private val dateInputFormat: DateInputFormat,
    private val dateFormatter: DatePickerFormatter,
    private val errorDatePattern: String,
    private val errorDateOutOfYearRange: String,
    private val errorInvalidNotAllowed: String,
    private val errorInvalidRangeInput: String,
) {
    /**
     * the currently selected start date in milliseconds. Only checked against when the
     * [InputIdentifier] is [InputIdentifier.EndDateInput].
     */
    var currentStartDateMillis: Long? = null

    /**
     * the currently selected end date in milliseconds. Only checked against when the
     * [InputIdentifier] is [InputIdentifier.StartDateInput].
     */
    var currentEndDateMillis: Long? = null

    /**
     * Validates a [CalendarDate] input and returns an error string in case an issue with the given
     * date is detected, or an empty string in case there are no issues.
     *
     * @param dateToValidate a [CalendarDate] input to validate
     * @param inputIdentifier an [InputIdentifier] that provides information about the input field
     *   that is supposed to hold the date.
     * @param locale the current [CalendarLocale]
     */
    fun validate(
        dateToValidate: CalendarDate?,
        inputIdentifier: InputIdentifier,
        locale: CalendarLocale,
    ): String {
        if (dateToValidate == null) {
            return formatString(errorDatePattern, dateInputFormat.patternWithDelimiters.uppercase())
        }
        // Check that the date is within the valid range of years.
        if (!yearRange.contains(dateToValidate.year)) {
            return formatString(
                errorDateOutOfYearRange,
                yearRange.first.toLocalString(locale = locale),
                yearRange.last.toLocalString(locale = locale),
            )
        }
        // Check that the provided SelectableDates allows this date to be selected.
        with(selectableDates) {
            if (
                !isSelectableYear(dateToValidate.year) ||
                    !isSelectableDate(dateToValidate.utcTimeMillis)
            ) {
                return formatString(
                    errorInvalidNotAllowed,
                    dateFormatter.formatDate(
                        dateMillis = dateToValidate.utcTimeMillis,
                        locale = locale,
                    ),
                )
            }
        }

        // Additional validation when the InputIdentifier is for start of end dates in a range input
        if (
            (inputIdentifier == InputIdentifier.StartDateInput &&
                dateToValidate.utcTimeMillis > (currentEndDateMillis ?: Long.MAX_VALUE)) ||
                (inputIdentifier == InputIdentifier.EndDateInput &&
                    dateToValidate.utcTimeMillis < (currentStartDateMillis ?: Long.MIN_VALUE))
        ) {
            // The input start date is after the end date, or the end date is before the start date.
            return errorInvalidRangeInput
        }

        return ""
    }
}
// END VERBATIM

// BEGIN VERBATIM InputIdentifier
@Immutable
@JvmInline
internal value class InputIdentifier internal constructor(internal val value: Int) {

    companion object {
        /** Single date input */
        val SingleDateInput
            get() = InputIdentifier(0)

        /** A start date input */
        val StartDateInput
            get() = InputIdentifier(1)

        /** An end date input */
        val EndDateInput
            get() = InputIdentifier(2)
    }

    override fun toString() =
        when (this) {
            SingleDateInput -> "SingleDateInput"
            StartDateInput -> "StartDateInput"
            EndDateInput -> "EndDateInput"
            else -> "Unknown"
        }
}
// END VERBATIM

// BEGIN VERBATIM DateInputTransformation
private class DateInputTransformation(
    private val dateInputFormat: DateInputFormat,
    private val calendarModel: CalendarModel,
    private val dateInputValidator: DateInputValidator,
    private val inputIdentifier: InputIdentifier,
    private val locale: CalendarLocale,
    private val onDateSelectionChange: (Long?) -> Unit,
) : InputTransformation {

    override fun TextFieldBuffer.transformInput() {
        if (
            length > dateInputFormat.patternWithoutDelimiters.length ||
                !asCharSequence().all { it.isDigit() }
        ) {
            revertAllChanges()
            return
        }

        val text = asCharSequence().trim()
        if (text.length < dateInputFormat.patternWithoutDelimiters.length) {
            onDateSelectionChange(null)
        } else {
            val parsedDate =
                calendarModel.parse(
                    date = text.toString(),
                    pattern = dateInputFormat.patternWithoutDelimiters,
                    locale = locale,
                )
            val error =
                dateInputValidator.validate(
                    dateToValidate = parsedDate,
                    inputIdentifier = inputIdentifier,
                    locale = locale,
                )
            onDateSelectionChange(if (error.isEmpty()) parsedDate?.utcTimeMillis else null)
        }
    }
}
// END VERBATIM

// BEGIN VERBATIM DateOutputTransformation
private class DateOutputTransformation(private val dateInputFormat: DateInputFormat) :
    OutputTransformation {

    private val firstDelimiterOffset: Int =
        dateInputFormat.patternWithDelimiters.indexOf(dateInputFormat.delimiter)
    private val secondDelimiterOffset: Int =
        dateInputFormat.patternWithDelimiters.lastIndexOf(dateInputFormat.delimiter)
    private val delimiterString: String = dateInputFormat.delimiter.toString()

    override fun TextFieldBuffer.transformOutput() {
        if (firstDelimiterOffset in 0..length) {
            insert(firstDelimiterOffset, delimiterString)
        }
        if (secondDelimiterOffset > firstDelimiterOffset && secondDelimiterOffset in 0..length) {
            insert(secondDelimiterOffset, delimiterString)
        }
    }
}
// END VERBATIM

private fun lazyGridIndex(initialFirstVisibleItemIndex: Int) = initialFirstVisibleItemIndex

/** YearPicker's initial first visible index (rememberLazyGridState's argument) for a displayed year. */
private fun yearPickerInitialIndex(displayedYear: Int, yearRange: IntRange): Int =
    lazyGridIndex(
// BEGIN VERBATIM YearPicker initialFirstVisibleItemIndex
                initialFirstVisibleItemIndex = max(0, displayedYear - yearRange.first - YearsInRow)
// END VERBATIM
    )

// ---- The cases. Dates are UTC milliseconds; strings are JSON-escaped by q().

private val json = StringBuilder()

/** A JSON string, ASCII only (the JVM's stdout encoding may not be UTF-8). */
private fun q(s: String?): String {
    if (s == null) return "null"
    val out = StringBuilder("\"")
    for (c in s) {
        when {
            c == '"' || c == '\\' -> out.append('\\').append(c)
            c.code < 0x20 || c.code > 0x7e -> out.append("\\u").append(String.format("%04x", c.code))
            else -> out.append(c)
        }
    }
    return out.append('"').toString()
}

private fun <T> arr(items: Iterable<T>, f: (T) -> String) = items.joinToString(",", "[", "]") { f(it) }

private fun month(m: CalendarMonth) =
    "{\"year\":${m.year},\"month\":${m.month},\"numberOfDays\":${m.numberOfDays}," +
        "\"daysFromStartOfWeekToFirstOfMonth\":${m.daysFromStartOfWeekToFirstOfMonth}," +
        "\"startUtcTimeMillis\":${m.startUtcTimeMillis},\"endUtcTimeMillis\":${m.endUtcTimeMillis}}"

private fun date(d: CalendarDate?) =
    if (d == null) "null"
    else "{\"year\":${d.year},\"month\":${d.month},\"dayOfMonth\":${d.dayOfMonth},\"utcTimeMillis\":${d.utcTimeMillis}}"

/** Selectable dates by name: the harness and the TypeScript tests build the same predicates. */
private fun selectable(name: String): SelectableDates =
    when (name) {
        "all" -> object : SelectableDates {}
        // No weekends (DatePickerSamples' DatePickerWithDateSelectableDatesSample).
        "weekdays" ->
            object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                    val day = java.time.Instant.ofEpochMilli(utcTimeMillis).atZone(java.time.ZoneOffset.UTC).dayOfWeek
                    return day != java.time.DayOfWeek.SATURDAY && day != java.time.DayOfWeek.SUNDAY
                }
            }
        // Years from 2024 on.
        "from2024" ->
            object : SelectableDates {
                override fun isSelectableYear(year: Int) = year >= 2024
            }
        // Only the 10th to the 20th of each month.
        "mid" ->
            object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                    val d = java.time.Instant.ofEpochMilli(utcTimeMillis).atZone(java.time.ZoneOffset.UTC).dayOfMonth
                    return d in 10..20
                }
            }
        else -> object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = false
        }
    }

private val selectableNames = listOf("all", "weekdays", "from2024", "mid", "none")

private fun millis(y: Int, m: Int, d: Int) =
    java.time.LocalDate.of(y, m, d).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli()

private object Formatter : DatePickerFormatter {
    override fun formatMonthYear(monthMillis: Long?, locale: CalendarLocale): String? =
        monthMillis?.let { "month:$it" }

    override fun formatDate(dateMillis: Long?, locale: CalendarLocale, forContentDescription: Boolean): String? =
        dateMillis?.let { "date:$it" }
}

private fun validator(format: DateInputFormat, selectableName: String, start: Long?, end: Long?) =
    DateInputValidator(
            yearRange = IntRange(2000, 2030),
            selectableDates = selectable(selectableName),
            dateInputFormat = format,
            dateFormatter = Formatter,
            errorDatePattern = "pattern %1\$s",
            errorDateOutOfYearRange = "years %1\$s-%2\$s",
            errorInvalidNotAllowed = "notAllowed %1\$s",
            errorInvalidRangeInput = "invalidRange",
        )
        .apply {
            currentStartDateMillis = start
            currentEndDateMillis = end
        }

private val us = java.util.Locale.US

@OptIn(ExperimentalMaterial3Api::class)
fun main() {
    java.util.Locale.setDefault(us)
    val model = createCalendarModel(us)
    json.append("{\"constants\":{\"daysInWeek\":$DaysInWeek,\"millisecondsIn24Hours\":$MillisecondsIn24Hours,")
    json.append("\"maxCalendarRows\":$MaxCalendarRows,\"yearsInRow\":$YearsInRow,")
    json.append("\"yearRange\":[${DatePickerDefaults.YearRange.first},${DatePickerDefaults.YearRange.last}],")
    json.append("\"recommendedSizeForAccessibility\":${RecommendedSizeForAccessibility.value}},")

    // Months for every first day of the week (the locale decides it; one locale per value).
    val firstDayLocales =
        listOf("en-GB" to 1, "en-US" to 7, "ar-EG" to 6, "en-MV" to 5, "de-DE" to 1, "fa-IR" to 6, "pt-BR" to 7)
    json.append("\"firstDayOfWeek\":")
    json.append(arr(listOf("en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "pt-BR", "ja-JP", "zh-CN", "ko-KR", "ar-EG", "ar-SA", "fa-IR", "he-IL", "hi-IN", "ru-RU", "tr-TR", "en-AU", "en-CA", "en-IN", "en-MV", "nl-NL", "sv-SE", "pl-PL", "th-TH", "id-ID", "vi-VN", "uk-UA", "it-IT", "zh-TW", "es-MX")) {
        "[${q(it)},${createCalendarModel(java.util.Locale.forLanguageTag(it)).firstDayOfWeek}]"
    })
    json.append(",\"months\":[")
    var first = true
    for ((tag, expected) in firstDayLocales) {
        val m = createCalendarModel(java.util.Locale.forLanguageTag(tag))
        check(m.firstDayOfWeek == expected) { "$tag first day ${m.firstDayOfWeek}" }
        for (year in listOf(1900, 1970, 1999, 2000, 2023, 2024, 2100)) for (mo in 1..12) {
            if (!first) json.append(',')
            first = false
            json.append("{\"firstDayOfWeek\":$expected,\"month\":${month(m.getMonth(year, mo))}}")
        }
    }
    json.append("],")

    // getCanonicalDate / getMonth(millis) / getDayOfWeek.
    val instants =
        listOf(-2208988800000L, -2208988800001L, -1L, 0L, 1L, 86399999L, 86400000L, 951782400000L, 951868799999L,
            1709164800000L, 1709251199999L, 1718000000123L, 4133894399999L, 4102444800000L, -86400000L * 365)
    json.append("\"canonical\":")
    json.append(arr(instants) {
        val d = model.getCanonicalDate(it)
        "{\"millis\":$it,\"date\":${date(d)},\"month\":${month(model.getMonth(it))},\"dayOfWeek\":${model.getDayOfWeek(d)}}"
    })

    // plusMonths / minusMonths / indexIn / numberOfMonthsInRange.
    json.append(",\"plusMinus\":[")
    first = true
    for ((y, mo) in listOf(1900 to 1, 1999 to 12, 2024 to 2, 2100 to 12, 2023 to 7)) for (n in listOf(-3, 0, 1, 11, 12, 13, 25, 1200)) {
        val from = model.getMonth(y, mo)
        if (!first) json.append(',')
        first = false
        json.append("{\"year\":$y,\"month\":$mo,\"n\":$n,\"plus\":${month(model.plusMonths(from, n))},\"minus\":${month(model.minusMonths(from, n))}}")
    }
    json.append("],\"indexIn\":")
    json.append(arr(listOf(Triple(1900, 1, 1900..2100), Triple(2024, 5, 1900..2100), Triple(2100, 12, 1900..2100), Triple(2024, 5, 2024..2024), Triple(1999, 3, 2000..2010))) { (y, mo, r) ->
        "[$y,$mo,${r.first},${r.last},${model.getMonth(y, mo).indexIn(r)},${numberOfMonthsInRange(r)}]"
    })

    // datePatternAsInputFormat for every JDK locale's SHORT date pattern.
    json.append(",\"inputFormats\":[")
    first = true
    for (locale in java.util.Locale.getAvailableLocales().sortedBy { it.toLanguageTag() }) {
        val tag = locale.toLanguageTag()
        if (tag == "und") continue
        val pattern =
            java.time.format.DateTimeFormatterBuilder.getLocalizedDateTimePattern(
                java.time.format.FormatStyle.SHORT, null, java.time.chrono.Chronology.ofLocale(locale), locale)
        val format = try { datePatternAsInputFormat(pattern) } catch (e: Exception) { null }
        if (!first) json.append(',')
        first = false
        json.append("[${q(tag)},${q(pattern)},${q(format?.patternWithDelimiters)},${q(format?.delimiter?.toString())}]")
    }
    json.append("],")

    // parse / formatWithPattern (java.time's SMART resolver) for the three digit orders.
    val inputs = listOf("02292024", "02292023", "02302024", "02312023", "04312024", "00102024", "13012024", "12322024",
        "01010000", "12319999", "07040776", "29022024", "31042024", "20240229", "20230229", "20241301", "20240100", "00000000", "1234567")
    json.append("\"parse\":[")
    first = true
    for (pattern in listOf("MMddyyyy", "ddMMyyyy", "yyyyMMdd")) for (text in inputs) {
        if (!first) json.append(',')
        first = false
        json.append("[${q(pattern)},${q(text)},${date(model.parse(text, pattern, us))}]")
    }
    json.append("],\"formatWithPattern\":")
    json.append(arr(listOf("MMddyyyy", "ddMMyyyy", "yyyyMMdd").flatMap { p -> instants.map { p to it } }) { (p, m) ->
        "[${q(p)},$m,${q(model.formatWithPattern(m, p, us))}]"
    })

    // DateInputValidator.
    val usFormat = model.getDateInputFormat(us)
    json.append(",\"usInputFormat\":[${q(usFormat.patternWithDelimiters)},${q(usFormat.delimiter.toString())}]")
    json.append(",\"validate\":[")
    first = true
    val vDates = listOf<CalendarDate?>(null, model.getCanonicalDate(millis(1999, 12, 31)), model.getCanonicalDate(millis(2024, 3, 9)),
        model.getCanonicalDate(millis(2024, 3, 11)), model.getCanonicalDate(millis(2023, 6, 15)), model.getCanonicalDate(millis(2031, 1, 1)),
        model.getCanonicalDate(millis(2024, 3, 15)))
    for (name in selectableNames) for (d in vDates) for (id in listOf(0, 1, 2)) for ((s, e) in listOf<Pair<Long?, Long?>>(null to null, millis(2024, 3, 12) to millis(2024, 3, 20))) {
        val v = validator(usFormat, name, s, e)
        val r = v.validate(d, InputIdentifier(id), us)
        if (!first) json.append(',')
        first = false
        json.append("{\"selectable\":${q(name)},\"date\":${date(d)},\"input\":$id,\"start\":$s,\"end\":$e,\"error\":${q(r)}}")
    }
    json.append("],")

    // DateInputTransformation / DateOutputTransformation.
    json.append("\"inputTransformation\":[")
    first = true
    for ((original, edited) in listOf("" to "1", "1" to "1a", "0229202" to "02292024", "0229202" to "02292023", "02292024" to "022920245",
        "0101" to "01011999", "" to "13012024", "12" to "12 ", "" to " 0", "0" to "\u0660\u0661", "" to "06152024", "" to "06152031", "" to "03092024")) {
        val calls = mutableListOf<Long?>()
        val t = DateInputTransformation(usFormat, model, validator(usFormat, "weekdays", null, null), InputIdentifier.SingleDateInput, us) { calls.add(it) }
        val buffer = TextFieldBuffer(original, edited)
        with(t) { buffer.transformInput() }
        if (!first) json.append(',')
        first = false
        json.append("{\"original\":${q(original)},\"edited\":${q(edited)},\"text\":${q(buffer.asCharSequence().toString())},\"reverted\":${buffer.reverted},\"calls\":${arr(calls) { "$it" }}}")
    }
    json.append("],\"outputTransformation\":[")
    first = true
    for ((pattern, delimiter) in listOf("MM/dd/yyyy" to '/', "dd.MM.yyyy" to '.', "yyyy-MM-dd" to '-', "dd/MM/yyyy" to '/')) for (raw in listOf("", "1", "12", "123", "1234", "12345", "123456", "1234567", "12345678")) {
        val t = DateOutputTransformation(DateInputFormat(pattern, delimiter))
        val buffer = TextFieldBuffer(raw, raw)
        with(t) { buffer.transformOutput() }
        if (!first) json.append(',')
        first = false
        json.append("[${q(pattern)},${q(raw)},${q(buffer.asCharSequence().toString())}]")
    }
    json.append("],")

    // DatePickerStateImpl.
    json.append("\"datePickerState\":[")
    first = true
    val sel = listOf<Long?>(null, millis(2024, 3, 9) + 3_600_000, millis(1899, 12, 31), millis(2101, 1, 1), millis(2024, 2, 29))
    val disp = listOf<Long?>(millis(2023, 7, 1), millis(2024, 2, 17) + 5, millis(1800, 1, 1))
    for (s in sel) for (d in disp) {
        val state = DatePickerStateImpl(s, d, DatePickerDefaults.YearRange, DisplayMode.Picker, selectable("all"), us)
        val todayMonth = model.getMonth(model.today).startUtcTimeMillis
        val initial = "{\"selected\":${state.selectedDateMillis},\"displayed\":${if (state.displayedMonthMillis == todayMonth && d != todayMonth) "\"today\"" else state.displayedMonthMillis.toString()}}"
        state.displayedMonthMillis = millis(2101, 3, 1)
        val afterBadDisplay = state.displayedMonthMillis
        state.displayedMonthMillis = millis(1999, 5, 20)
        val afterDisplay = state.displayedMonthMillis
        state.displayMode = DisplayMode.Input
        val afterMode = state.displayedMonthMillis
        state.selectedDateMillis = millis(2050, 8, 8) + 999
        val afterSelect = state.selectedDateMillis
        state.selectedDateMillis = millis(2200, 1, 1)
        val afterBadSelect = state.selectedDateMillis
        if (!first) json.append(',')
        first = false
        json.append("{\"selected\":$s,\"displayed\":$d,\"initial\":$initial,\"afterBadDisplay\":${if (afterBadDisplay == todayMonth) "\"today\"" else afterBadDisplay.toString()},\"afterDisplay\":$afterDisplay,\"afterMode\":$afterMode,\"afterSelect\":$afterSelect,\"afterBadSelect\":$afterBadSelect}")
    }
    json.append("],")

    // DateRangePickerStateImpl.setSelection and updateDateSelection.
    val r = listOf<Long?>(null, millis(2024, 3, 9), millis(2024, 3, 20) + 77, millis(2024, 3, 9) + 1000, millis(1850, 1, 1))
    json.append("\"rangeSelection\":[")
    first = true
    for (a in r) for (b in r) {
        val state = DateRangePickerStateImpl(null, null, millis(2024, 3, 1), DatePickerDefaults.YearRange, DisplayMode.Picker, selectable("all"), us)
        state.setSelection(a, b)
        if (!first) json.append(',')
        first = false
        json.append("[$a,$b,${state.selectedStartDateMillis},${state.selectedEndDateMillis}]")
    }
    json.append("],\"updateDateSelection\":[")
    first = true
    val taps = listOf(millis(2024, 3, 9), millis(2024, 3, 9), millis(2024, 3, 20), millis(2024, 3, 5), millis(2024, 4, 1), millis(2024, 2, 1), millis(2024, 2, 1))
    var start: Long? = null
    var end: Long? = null
    for (t in taps) {
        updateDateSelection(t, start, end) { s, e -> start = s; end = e }
        if (!first) json.append(',')
        first = false
        json.append("[$t,$start,$end]")
    }
    json.append("],")

    // SelectedRangeInfo + drawRangeBackground (336dp = the dialog's 360dp less 2 × 12dp; 600dp).
    json.append("\"rangeInfo\":[")
    first = true
    val ranges = listOf(millis(2024, 3, 9) to millis(2024, 3, 9), millis(2024, 3, 9) to millis(2024, 3, 10), millis(2024, 3, 3) to millis(2024, 3, 30),
        millis(2024, 2, 20) to millis(2024, 3, 2), millis(2024, 3, 31) to millis(2024, 4, 2), millis(2024, 1, 1) to millis(2024, 5, 31), millis(2024, 4, 1) to millis(2024, 4, 5))
    for ((tag, fd) in listOf("en-US" to 7, "en-GB" to 1)) {
        val m = createCalendarModel(java.util.Locale.forLanguageTag(tag))
        val march = m.getMonth(2024, 3)
        for ((a, b) in ranges) {
            val info = SelectedRangeInfo.calculateRangeInfo(march, m.getCanonicalDate(a), m.getCanonicalDate(b))
            val draws = listOf(336f, 600f).flatMap { w -> listOf(LayoutDirection.Ltr, LayoutDirection.Rtl).map { dir ->
                if (info == null) "null" else {
                    val scope = ContentDrawScope(Size(w, 288f), dir)
                    with(scope) { drawRangeBackground(info, Color("range")) }
                    "{\"width\":$w,\"rtl\":${dir == LayoutDirection.Rtl},\"rects\":${arr(scope.rects) { r -> arr(r.toList()) { v -> v.toString() } }}}"
                }
            } }
            if (!first) json.append(',')
            first = false
            val infoJson = if (info == null) "null" else "{\"start\":[${info.gridStartCoordinates.x},${info.gridStartCoordinates.y}],\"end\":[${info.gridEndCoordinates.x},${info.gridEndCoordinates.y}],\"firstIsSelectionStart\":${info.firstIsSelectionStart},\"lastIsSelectionEnd\":${info.lastIsSelectionEnd}}"
            json.append("{\"firstDayOfWeek\":$fd,\"start\":$a,\"end\":$b,\"info\":$infoJson,\"draws\":[${draws.joinToString(",")}]}")
        }
    }
    json.append("],")

    // getFirstEnabledDay / getLastEnabledDay.
    json.append("\"enabledDays\":[")
    first = true
    for (name in selectableNames) for ((y, mo) in listOf(2024 to 3, 2023 to 9, 2024 to 6, 2024 to 2)) {
        val m = model.getMonth(y, mo)
        if (!first) json.append(',')
        first = false
        json.append("[${q(name)},$y,$mo,${getFirstEnabledDay(m, selectable(name))},${getLastEnabledDay(m, selectable(name))}]")
    }
    json.append("],\"yearPickerIndex\":")
    json.append(arr(listOf(1900, 1901, 1903, 1904, 2024, 2100)) { y -> "[$y,${yearPickerInitialIndex(y, DatePickerDefaults.YearRange)}]" })
    json.append("}")
    println(json)
}
