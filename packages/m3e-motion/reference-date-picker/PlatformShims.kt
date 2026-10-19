// Stand-ins for the Android platform APIs CalendarModelImpl.android.kt (compiled as vendored)
// imports: the SDK level check (the harness runs the API 26+ java.time model).
@file:Suppress("unused")

package android.os

object Build {
    object VERSION {
        const val SDK_INT = 34
    }

    object VERSION_CODES {
        const val N = 24
        const val O = 26
    }
}
