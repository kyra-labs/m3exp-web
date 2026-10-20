/**
 * The default accessible name of the pull-to-refresh indicator (the arrow's progress bar and the
 * refreshing spinner). Compose gives the indicator no description (the arrow sets only its
 * progress, `progressBarRangeInfo`; the spinner nothing), but a web progress bar needs a name;
 * "Refresh" matches the visible Refresh button the samples pair it with (TODO(verify): SOURCES
 * register #85). Both layers take an override for other languages.
 * @internal Shared with m3e-react; not part of the public API.
 */
export const PULL_TO_REFRESH_INDICATOR_LABEL = 'Refresh';
