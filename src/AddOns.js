/* eslint-disable */
// TODO => Move to es6
import CIQ from 'chartiq';
import $ from 'jquery';
//-------------------------------------------------------------------------------------------
// Copyright 2012-2016 by ChartIQ, Inc.
// All rights reserved
//-------------------------------------------------------------------------------------------


/**
 * Use this constructor to initialize visualization styles of extended hours by the use of shading and delimitation lines.
 *
 * Requires `addOns.js`
 *
 * This visualization will only work if data for the corresponding sessions is provided from your quote feed and the market definitions have the corresponding entries.
 * See {@link CIQ.Market} for details on how to define extended (non-default) hours.
 *
 * By default all sessions are disabled unless explicitly enabled using {@link CIQ.ExtendedHours.prepare} or {@link CIQ.ExtendedHours.set}.
 *
 * All possible market sessions needed to be shaded at any given time should be enabled at once with this method.
 *
 * Your fetch should load the required data based on the `params.stx.layout.extended` and `params.stx.layout.marketSessions` settings.
 * Remember that setting `params.filter` to true, performs a filter of masterData when {@link CIQ.ExtendedHours.set} is invoked,
 * rather than calling {@link CIQ.ChartEngine#newChart} to reload the data from the server
 * every time you enable or disable this feature. So you must always return all sessions on your fetch responses.
 *
 *CSS info:
 * - The styles for the shading of each session is determined by the corresponding CSS class in the form of "stx_market_session."+session_name (Example: `stx_market_session.pre`)
 * - The divider line is determined by the CSS class "stx_market_session.divider".
 *
 * ** Important:** This module must be initialized before {@link CIQ.ChartEngine#importLayout} or the sessions will not be able to be restored.
 *
 * Example <iframe width="800" height="500" scrolling="no" seamless="seamless" align="top" style="float:top" src="http://jsfiddle.net/chartiq/g2vvww67/embedded/result,js,html/" allowfullscreen="allowfullscreen" frameborder="1"></iframe>
 *
 * @param {object} params The constructor parameters
 * @param {CIQ.ChartEngine} [params.stx] The chart object
 * @param {boolean} [params.filter] Setting to true performs a filter of masterData when {@link CIQ.ExtendedHours.set} is invoked, rather than calling {@link CIQ.ChartEngine#newChart} to reload the data from the server.
 * @constructor
 * @name  CIQ.ExtendedHours
 * @example
 * // Call this only once to initialize the market sessions display manager.
    new CIQ.ExtendedHours({stx:stxx, filter:true});

    // By default all sessions are disabled unless explicitly enabled.
    // This forces the extended hours sessions ["pre","post"] to be enabled when the chart is initially loaded.
    stxx.extendedHours.prepare(true);

    //Now display your chart
    stxx.newChart(stxx.chart.symbol, null, null, function(){});

 * @example
    // once your chart is displayed, you can call this from any UI interface to turn on extended hours.
    stx.extendedHours.set(true);

    // or call this from any UI interface to turn off extended hours.
    stx.extendedHours.set(false);

 * @example
 * 	// CSS entries for a session divider and sessions named "pre" and "post"
    .stx_market_session.divider {
        background-color: rgba(0,255,0,0.8);
        width: 1px;
    }
    .stx_market_session.pre {
        background-color: rgba(255,255,0,0.1);
    }
    .stx_market_session.post {
        background-color: rgba(0,0,255,0.2);
    }
 * @since
 * <br>&bull; 06-2016-02
 * <br>&bull; 3.0.0 changed argument to an object to support filter
 * <br>&bull; 3.0.0 no longer necessary to explicitly call new Chart to re-load data. Instead call {@link CIQ.ExtendedHours.set} function.
 * <br>&bull; 5.0.0 no longer necessary to explicitly set `stx.layout.marketSessions` or 1stx.layout.extended` to manage sessions; instead call {@link CIQ.ExtendedHours.prepare} or {@link CIQ.ExtendedHours.set}
 */
CIQ.ExtendedHours = function (params) {
    let stx = params.stx;
    let filter = params.filter;
    if (!stx) { // backwards compatibility
        stx = params;
        filter = false;
    }
    let styles = {};
    this.stx = stx;
    this.stx.extendedHours = this;
    /**
     * Prepares the extended hours settings and classes for the session names enumerated in the arguments without actually displaying or loading the data.
     *
     * This method can be used to force a particular session to load by default by calling it before {@link CIQ.ChartEngine#newChart}.
     * Otherwise the chart will be loaded with all sessions disabled until {@link CIQ.ExtendedHours.set} is invoked.
     *
     * {@link CIQ.ChartEngine#importLayout} will also call this method to ensure the sessions are restored as previously saved.
     *
     * @param  {boolean} enable Set to turn on/off the extended-hours visualization.
     * @param  {array} sessions The sessions to visualize when enable is true.  Any sessions previously visualized will be disabled.  If set to null, will default to ["pre","post"].
     * @memberof CIQ.ExtendedHours
     * @method prepare
     * @since 5.0.0
     */
    this.prepare = function (enable, sessions) {
        stx.layout.extended = enable;
        for (var sess in stx.layout.marketSessions) {
            styles.session = {};
            stx.chart.market.disableSession(sess);
        }
        stx.layout.marketSessions = {};
        if (enable) {
            if (!sessions) sessions = ['pre', 'post'];
            if (sessions.length) {
                for (let s = 0; s < sessions.length; s++) {
                    stx.layout.marketSessions[sessions[s]] = true;
                }
            } else {
                stx.layout.marketSessions = sessions;
            }
        }
        stx.changeOccurred('layout');
        for (sess in stx.layout.marketSessions) {
            if (!styles.session) styles.session = {};
            styles.session[sess] = stx.canvasStyle(`stx_market_session ${sess}`);
            stx.chart.market.disableSession(sess, true);
        }
    };


    /**
     * gathers and renders the extended hours for the preset session names enumerated in prepare().
     * @param  {function} cb Optional callback function to be invoked once chart is reloaded with extended hours data.
     * @memberof CIQ.ExtendedHours
     * @method complete
     * @private
     * @since 5.0.0
     */
    this.complete = function (cb) {
        if (!stx.chart.market.market_def) {
            // possibly a 24 hours Market. Not necessarily an error but nothing to do for ExtendedHours
            if (cb) cb();
            return;
        }
        if (filter) {
            stx.createDataSet();
            stx.draw();
            if (cb) cb();
        } else {
            stx.newChart(stx.chart.symbol, null, null, cb);
        }
    };

    /**
     * Turns on or off extended hours for the session names enumerated in the arguments.
     * @param  {boolean} enable Set to turn on/off the extended-hours visualization.
     * @param  {array} sessions The sessions to visualize when enable is true.  Any sessions previously visualized will be disabled.  If set to null, will default to ["pre","post"].
     * @param  {function} cb Optional callback function to be invoked once chart is reloaded with extended hours data.
     * @memberof CIQ.ExtendedHours
     * @method set
     */
    this.set = function (enable, sessions, cb) {
        this.prepare(enable, sessions);
        this.complete(cb);
    };

    this.stx.append('createYAxis', function (panel) {
        if (!this.layout.extended) return;
        let chart = panel.chart;
        if (CIQ.ChartEngine.isDailyInterval(this.layout.interval)) return;
        styles.divider = this.canvasStyle('stx_market_session divider');
        if (styles.session) {
            let m = chart.market;
            let ranges = [];
            let range = {};
            let nextBoundary,
                thisSession;
            for (var i = 0; i < chart.dataSegment.length; i++) {
                let ds = chart.dataSegment[i];
                if (!ds || !ds.DT) continue;
                let c = null;
                if (m.market_def) {
                    if (!nextBoundary || nextBoundary <= ds.DT) {
                        thisSession = m.getSession(ds.DT, this.dataZone);
                        let filterSession = (thisSession !== '' && (!this.layout.marketSessions || !this.layout.marketSessions[thisSession]));
                        nextBoundary = m[filterSession ? 'getNextOpen' : 'getNextClose'](ds.DT, this.dataZone, this.dataZone);
                    }
                }

                let s = styles.session[thisSession];
                if (s) c = s.backgroundColor;
                if (range.color && range.color != c) {
                    ranges.push({ start: range.start, end: range.end, color: range.color });
                    range = {};
                }
                if (c) {
                    let cw = this.layout.candleWidth;
                    if (ds.candleWidth) cw = ds.candleWidth;
                    range.end = this.pixelFromBar(i, chart) + cw / 2;
                    if (!range.start && range.start !== 0) range.start = range.end - cw + 1;
                    range.color = c;
                } else {
                    range = {};
                }
            }
            if (range.start || range.start === 0) ranges.push({ start: range.start, end: range.end, color: range.color });
            let noDashes = CIQ.isTransparent(styles.divider.backgroundColor);
            let dividerLineWidth = styles.divider.width.replace(/px/g, '');
            for (let p in this.panels) {
                let thisPanel = this.panels[p];
                if (thisPanel.shareChartXAxis === false) continue;
                if (thisPanel.hidden) continue;
                this.startClip(p);
                for (i = 0; i < ranges.length; i++) {
                    chart.context.fillStyle = ranges[i].color;
                    if (!noDashes && ranges[i].start > chart.left) {
                        this.plotLine(ranges[i].start, ranges[i].start, thisPanel.bottom, thisPanel.top, styles.divider.backgroundColor, 'line', chart.context, thisPanel, {
                            pattern: 'dashed',
                            lineWidth: dividerLineWidth,
                        });
                    }
                    chart.context.fillRect(ranges[i].start, thisPanel.top, ranges[i].end - ranges[i].start, thisPanel.bottom - thisPanel.top);
                    if (!noDashes && ranges[i].end < chart.right) {
                        this.plotLine(ranges[i].end, ranges[i].end, thisPanel.bottom, thisPanel.top, styles.divider.backgroundColor, 'line', chart.context, thisPanel, {
                            pattern: 'dashed',
                            lineWidth: dividerLineWidth,
                        });
                    }
                }
                this.endClip();
            }
        }
    });
};

/**
 * Add-On that creates a hovering "tooltip" as mouse is moved over the chart when the cross-hairs are active.
 *
 * Requires `jquery` and `addOns.js`; as well as `markers.js` to be bundled in `chartiq.js`.
 *
 * There can be only one CIQ.Tooltip per chart.
 *
 * Color and layout can be customized via `stx-hu-tooltip` and related CSS classes. Defaults can be found in `stx-chart.css`.
 *
 * CIQ.Tooltip automatically creates its own HTML inside the chart container.
 * Here is an example of the structure (there will be one field tag per displayed element):
 * ```
 * <stx-hu-tooltip>
 * 		<stx-hu-tooltip-field>
 * 			<stx-hu-tooltip-field-name></stx-hu-tooltip-field-name>
 * 			<stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
 * 		</stx-hu-tooltip-field>
 * </stx-hu-tooltip>
 * ```
 * By default, the `stx-hu-tooltip-field` elements are inserted in the following order:
 * - DT
 * - Open
 * - High
 * - Low
 * - Close
 * - Volume
 * - series
 * - studies
 *
 * But the default layout can be changed. You can override the order of fields or change the labels by manually inserting
 * the HTML that the tooltip would otherwise have created for that field.
 * If no override HTML is found for a particular field, the default will be used.
 * This HTML must be placed *inside the chart container*.
 *
 * Numbers will be displayed using the {@link CIQ.ChartEngine.YAxis#priceFormattery, if any,
 * or {@link CIQ.ChartEngine#formatYAxisPrice} to guarantee uniformity with the y-axis.
 *
 * All of the code is provided in `addOns.js` and can be fully customized by copying the source code from the library and overriding
 * the functions with your changes. Be sure to never modify a library file as this will hinder upgrades.
 *
 * Visual Reference:<br>
 * ![stx-hu-tooltip](stx-hu-tooltip.png "stx-hu-tooltip")
 *
 * @param {object} tooltipParams The constructor parameters.
 * @param {CIQ.ChartEngine} [tooltipParams.stx] The chart object.
 * @param {boolean} [tooltipParams.ohl] set to true to show OHL data (Close is always shown).
 * @param {boolean} [tooltipParams.volume] set to true to show Volume.
 * @param {boolean} [tooltipParams.series] set to true to show value of series.
 * @param {boolean} [tooltipParams.studies] set to true to show value of studies.
 * @param {boolean} [tooltipParams.showOverBarOnly] set to true to show tooltip only when over the primary line/bars.
 * @constructor
 * @name  CIQ.Tooltip
 * @since
 * <br>&bull; 09-2016-19
 * <br>&bull; 5.0.0 now `tooltipParams.showOverBarOnly` available to show tooltip only when over the primary line/bars.
 * @example <caption>Adding a hover tool tip to a chart:</caption>
 *
 * //First declare your chart engine
 * var stxx=new CIQ.ChartEngine({container:$("#chartContainer")[0]});
 *
 * //Then link the hoer to that chart.
 * //Note how we've enabled OHL, Volume, Series and Studies.
 * new CIQ.Tooltip({stx:stxx, ohl:true, volume:true, series:true, studies:true});
 *
 * @example <caption>Customize the order, layout or text in tooltip labels:</caption>
 * // In this example, we've rearranged the HTML to display the Close filed first, then the DT
 * // We are also labeling the DT 'Date/Time' and the Close 'Last'
 * // The rest of the fileds will be then displayed in their default order.
 *
    <stx-hu-tooltip>
        <stx-hu-tooltip-field field="Close">
            <stx-hu-tooltip-field-name>Last</stx-hu-tooltip-field-name>
            <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
        </stx-hu-tooltip-field>
        <stx-hu-tooltip-field field="DT">
            <stx-hu-tooltip-field-name>Date/Time</stx-hu-tooltip-field-name>
            <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
        </stx-hu-tooltip-field>
    </stx-hu-tooltip>
 *
 * @example
 * // Sample CSS for the hover tool tip. Working sample found in stx-chart.css
    stx-hu-tooltip {
        position: absolute;
        left: -50000px;
        z-index: 30;
        white-space: nowrap;
        padding: 6px;
        border: 1px solid gray;
        background-color: rgba(42,81,208,.5);
        color: white;
    }

    stx-hu-tooltip-field {
        display:table-row;
    }

    stx-hu-tooltip-field-name {
        display:table-cell;
        font-weight:bold;
        padding-right:5px;
    }

    stx-hu-tooltip-field-name:after {
        content:':';
    }

    stx-hu-tooltip-field-value {
        display:table-cell;
        text-align:right;
    }
 */

CIQ.Tooltip = function (tooltipParams) {
    let stx = tooltipParams.stx;
    let showOhl = tooltipParams.ohl;
    let showVolume = tooltipParams.volume;
    let showSeries = tooltipParams.series;
    let showStudies = tooltipParams.studies;
    let showOverBarOnly = tooltipParams.showOverBarOnly;

    let node = $(stx.chart.container).find('stx-hu-tooltip')[0];
    if (!node) {
        node = $('<stx-hu-tooltip></stx-hu-tooltip>').appendTo($(stx.chart.container))[0];
    }
    CIQ.Marker.Tooltip = function (params) {
        if (!this.className) this.className = 'CIQ.Marker.Tooltip';
        params.label = 'tooltip';
        CIQ.Marker.call(this, params);
    };

    CIQ.Marker.Tooltip.ciqInheritsFrom(CIQ.Marker, false);

    CIQ.Marker.Tooltip.sameBar = function (bar1, bar2) {
        if (!bar1 || !bar2) return false;
        if (+bar1.DT != +bar2.DT) return false;
        if (bar1.Close != bar2.Close) return false;
        if (bar1.Open != bar2.Open) return false;
        if (bar1.Volume != bar2.Volume) return false;
        return true;
    };

    CIQ.Marker.Tooltip.placementFunction = function (params) {
        let offset = 30;
        let stx = params.stx;
        for (let i = 0; i < params.arr.length; i++) {
            let marker = params.arr[i];
            let bar = stx.barFromPixel(stx.cx);
            let quote = stx.chart.dataSegment[bar];
            var goodBar;
            let overBar = true;
            var highPx,
                lowPx;

            if (quote != 'undefined' && quote && quote.DT) {
                goodBar = true;
                if (quote.High) highPx = stx.pixelFromPrice(quote.High);
                if (quote.Low) lowPx = stx.pixelFromPrice(quote.Low);
                if (!stx.highLowBars[stx.layout.chartType]) {
                    if (quote.Close) {
                        highPx = stx.pixelFromPrice(quote.Close) - 15;
                        lowPx = stx.pixelFromPrice(quote.Close) + 15;
                    }
                }
                if (showOverBarOnly && !(stx.cy >= highPx && stx.cy <= lowPx)) overBar = false;
            }

            if (
                (stx.controls.crossX && stx.controls.crossX.style.display == 'none') ||
                (stx.controls.crossY && stx.controls.crossY.style.display == 'none') ||
                !(CIQ.ChartEngine.insideChart &&
                    stx.layout.crosshair &&
                    stx.displayCrosshairs &&
                    !stx.overXAxis &&
                    !stx.overYAxis &&
                    !stx.openDialog &&
                    !stx.activeDrawing &&
                    !stx.grabbingScreen &&
                    goodBar &&
                    overBar)
            ) {
                marker.node.style.left = '-50000px';
                marker.node.style.right = 'auto';
                marker.lastBar = {};
                return;
            }
            if (CIQ.Marker.Tooltip.sameBar(stx.chart.dataSegment[bar], marker.lastBar) && bar != stx.chart.dataSegment.length - 1) return;
            marker.lastBar = stx.chart.dataSegment[bar];
            if (parseInt(getComputedStyle(marker.node).width, 10) + offset < CIQ.ChartEngine.crosshairX) {
                marker.node.style.left = 'auto';
                marker.node.style.right = `${Math.round(stx.container.clientWidth - stx.pixelFromBar(bar) + offset)}px`;
            } else {
                marker.node.style.left = `${Math.round(stx.pixelFromBar(bar) + offset)}px`;
                marker.node.style.right = 'auto';
            }
            marker.node.style.top = `${Math.round(CIQ.ChartEngine.crosshairY - stx.top - parseInt(getComputedStyle(marker.node).height, 10) / 2)}px`;
        }
        stx.doDisplayCrosshairs();
    };

    function renderFunction() {
        // the tooltip has not been initialized with this chart.
        if (!this.huTooltip) return;

        // crosshairs are not on
        if (
            (stx.controls.crossX && stx.controls.crossX.style.display == 'none') ||
            (stx.controls.crossY && stx.controls.crossY.style.display == 'none')
        ) return;

        let bar = this.barFromPixel(this.cx);
        if (!this.chart.dataSegment[bar]) {
            this.positionMarkers();
            return;
        }
        if (CIQ.Marker.Tooltip.sameBar(this.chart.dataSegment[bar], this.huTooltip.lastBar) && bar != this.chart.dataSegment.length - 1) return;
        let node = $(this.huTooltip.node);
        node.find('[auto]').remove();
        node.find('stx-hu-tooltip-field-value').html();

        let panel = this.chart.panel;
        let yAxis = panel.yAxis;
        let dupMap = {};
        let fields = [];
        fields.push({
            member: 'DT', display: 'DT', panel, yAxis,
        });
        fields.push({
            member: 'Close', display: 'Close', panel, yAxis,
        });
        dupMap.DT = dupMap.Close = 1;
        if (showOhl) {
            fields.push({
                member: 'Open', display: 'Open', panel, yAxis,
            });
            fields.push({
                member: 'High', display: 'High', panel, yAxis,
            });
            fields.push({
                member: 'Low', display: 'Low', panel, yAxis,
            });
            dupMap.Open = dupMap.High = dupMap.Low = 1;
        }
        if (showVolume) {
            fields.push({
                member: 'Volume', display: 'Volume', panel: null, yAxis: null,
            }); // null yAxis use raw value
            dupMap.Volume = 1;
        }
        if (showSeries) {
            let renderers = this.chart.seriesRenderers;
            for (let renderer in renderers) {
                let rendererToDisplay = renderers[renderer];
                panel = this.panels[rendererToDisplay.params.panel];
                yAxis = rendererToDisplay.params.yAxis;
                if (!yAxis && rendererToDisplay.params.shareYAxis) yAxis = panel.yAxis;
                for (let id = 0; id < rendererToDisplay.seriesParams.length; id++) {
                    let seriesParams = rendererToDisplay.seriesParams[id];
                    if (!yAxis && seriesParams.shareYAxis) yAxis = panel.yAxis;
                    // if a series has a symbol and a field then it maybe a object chain
                    let sKey = seriesParams.symbol;
                    let subField = seriesParams.field;
                    if (!sKey) sKey = subField;
                    else if (subField && sKey != subField) sKey = CIQ.createObjectChainNames(sKey, subField)[0];
                    let display = seriesParams.display || seriesParams.symbol || seriesParams.field;
                    if (sKey && !dupMap[display]) {
                        fields.push({
                            member: sKey, display, panel, yAxis,
                        });
                        dupMap[display] = 1;
                    }
                }
            }
        }
        if (showStudies) {
            for (let study in this.layout.studies) {
                panel = this.panels[this.layout.studies[study].panel];
                yAxis = panel.yAxis;
                for (let output in this.layout.studies[study].outputMap) {
                    if (output && !dupMap[output]) {
                        fields.push({
                            member: output, display: output, panel, yAxis,
                        });
                        dupMap[output] = 1;
                    }
                }
                if (!dupMap[`${study}_hist`]) {
                    fields.push({
                        member: `${study}_hist`, display: `${study}_hist`, panel, yAxis,
                    });
                    fields.push({
                        member: `${study}_hist1`, display: `${study}_hist1`, panel, yAxis,
                    });
                    fields.push({
                        member: `${study}_hist2`, display: `${study}_hist2`, panel, yAxis,
                    });
                    dupMap[`${study}_hist`] = 1;
                }
            }
        }
        for (let f = 0; f < fields.length; f++) {
            let obj = fields[f];
            let name = obj.member;
            let displayName = obj.display;
            panel = obj.panel;
            yAxis = obj.yAxis;
            let labelDecimalPlaces = null;
            if (yAxis) {
                if (panel !== panel.chart.panel) {
                    // If a study panel, use yAxis settings to determine decimal places
                    if (yAxis.decimalPlaces || yAxis.decimalPlaces === 0) labelDecimalPlaces = yAxis.decimalPlaces;
                    else if (yAxis.maxDecimalPlaces || yAxis.maxDecimalPlaces === 0) labelDecimalPlaces = yAxis.maxDecimalPlaces;
                } else {
                    // If a chart panel, then always display at least the number of decimal places as calculated by masterData (panel.chart.decimalPlaces)
                    // but if we are zoomed to high granularity then expand all the way out to the y-axis significant digits (panel.yAxis.printDecimalPlaces)
                    labelDecimalPlaces = Math.max(yAxis.printDecimalPlaces, panel.chart.decimalPlaces);
                    //	... and never display more decimal places than the symbol is supposed to be quoting at
                    if (yAxis.maxDecimalPlaces || yAxis.maxDecimalPlaces === 0) labelDecimalPlaces = Math.min(labelDecimalPlaces, yAxis.maxDecimalPlaces);
                }
            }
            let fieldName = displayName.replace(/^(Result )(.*)/, '$2');
            let dsField = this.chart.dataSegment[bar][name];
            if ((dsField || dsField === 0) && (typeof dsField !== 'object' || name == 'DT')) {
                let fieldValue = '';
                if (dsField.constructor == Number) {
                    if (!yAxis) { // raw value
                        fieldValue = dsField;
                    } else if (yAxis.originalPriceFormatter && yAxis.originalPriceFormatter.func) { // in comparison mode with custom formatter
                        fieldValue = yAxis.originalPriceFormatter.func(this, panel, dsField, labelDecimalPlaces);
                    } else if (yAxis.priceFormatter && yAxis.priceFormatter != CIQ.Comparison.priceFormat) { // using custom formatter
                        fieldValue = yAxis.priceFormatter(this, panel, dsField, labelDecimalPlaces);
                    } else {
                        fieldValue = this.formatYAxisPrice(dsField, panel, labelDecimalPlaces, yAxis);
                    }
                } else if (this.chart.dataSegment[bar][name].constructor == Date) {
                    if (name == 'DT' && this.controls.floatDate && this.controls.floatDate.innerHTML) {
                        if (CIQ.ChartEngine.hideDates()) fieldValue = 'N/A';
                        else fieldValue = this.controls.floatDate.innerHTML;
                    } else {
                        fieldValue = CIQ.yyyymmdd(dsField);
                        if (!CIQ.ChartEngine.isDailyInterval(this.layout.interval)) {
                            fieldValue += ` ${dsField.toTimeString().substr(0, 8)}`;
                        }
                    }
                } else {
                    fieldValue = dsField;
                }
                let dedicatedField = node.find(`stx-hu-tooltip-field[field="${fieldName}"]`);
                if (dedicatedField.length) {
                    dedicatedField.find('stx-hu-tooltip-field-value').html(fieldValue);
                    let fieldNameField = dedicatedField.find('stx-hu-tooltip-field-name');
                    if (fieldNameField.html() === '') { fieldNameField.html(this.translateIf(fieldName)); }
                } else {
                    $('<stx-hu-tooltip-field auto></stx-hu-tooltip-field>')
                        .append($(`<stx-hu-tooltip-field-name>${this.translateIf(fieldName)}</stx-hu-tooltip-field-name>`))
                        .append($(`<stx-hu-tooltip-field-value>${fieldValue}</stx-hu-tooltip-field-value>`))
                        .appendTo(node);
                }
            } else {
                let naField = node.find(`stx-hu-tooltip-field[field="${fieldName}"]`);
                if (naField.length) {
                    let naFieldNameField = naField.find('stx-hu-tooltip-field-name');
                    if (naFieldNameField.html() !== '') { naField.find('stx-hu-tooltip-field-value').html('n/a'); }
                }
            }
        }
        this.huTooltip.render();
    }

    CIQ.ChartEngine.prototype.append('undisplayCrosshairs', function () {
        let tt = this.huTooltip;
        if (tt && tt.node) {
            let node = $(tt.node);
            if (node && node[0]) {
                node[0].style.left = '-50000px';
                node[0].style.right = 'auto';
                tt.lastBar = {};
            }
        }
    });
    CIQ.ChartEngine.prototype.append('deleteHighlighted', function () {
        this.huTooltip.lastBar = {};
        this.headsUpHR();
    });
    CIQ.ChartEngine.prototype.append('headsUpHR', renderFunction);
    CIQ.ChartEngine.prototype.append('createDataSegment', renderFunction);
    stx.huTooltip = new CIQ.Marker.Tooltip({
        stx, xPositioner: 'bar', chartContainer: true, node,
    });
};


/**
 * Add-On that puts the chart into "sleep mode" after a period of inactivity.
 *
 * Requires `addOns.js`
 *
 * In sleep mode, a class "ciq-sleeping" will be added to the body.  This will dim out the chart.
 * Sleep mode is ended when interaction with the chart is detected.
 *
 * @param {object} params Configuration parameters
 * @param {CIQ.ChartEngine} [params.stx] The chart object
 * @param {number} [params.minutes] Inactivity period in _minutes_.  Set to 0 to disable the sleep mode.
 * @param {number} [params.interval] Sleeping quote update interval in _seconds_.  During sleep mode, this is used for the update loop.
 * 									Set to non-zero positive number or defaults to 60.
 * @param {function} [params.wakeCB] Optional callback function after waking
 * @param {function} [params.sleepCB] Optional callback function after sleeping
 * @constructor
 * @name  CIQ.InactivityTimer
 * @since 3.0.0
 * @example
 * 	new CIQ.InactivityTimer({stx:stxx, minutes:30, interval:15});  //30 minutes of inactivity will put chart into sleep mode, updating every 15 seconds
 *
 */
CIQ.InactivityTimer = function (params) {
    if (!params.minutes) return;
    if (!params.interval || params.interval < 0) params.interval = 60;
    this.stx = params.stx;
    this.timeout = params.minutes;
    this.interval = params.interval;
    this.wakeCB = params.wakeCB;
    this.sleepCB = params.sleepCB;
    this.sleepTimer = null;
    this.sleeping = false;
    this.last = new Date().getTime();
    this.wakeChart = function () {
        window.clearTimeout(this.sleepTimer);
        this.last = new Date().getTime();
        if (this.sleeping) {
            if (this.stx.quoteDriver) this.stx.quoteDriver.updateChartLoop();
            this.sleeping = false;
            CIQ.unappendClassName(document.body, 'ciq-sleeping');
        }
        this.sleepTimer = window.setTimeout(this.sleepChart.bind(this), this.timeout * 60000);
        if (this.wakeCB) wakeCB();
    };
    this.sleepChart = function () {
        if (!this.sleeping) {
            if (this.stx.quoteDriver) this.stx.quoteDriver.updateChartLoop(this.interval);
            this.sleeping = true;
            CIQ.appendClassName(document.body, 'ciq-sleeping');
        }
        if (this.sleepCB) sleepCB();
    };
    $(document).on(
        'mousemove mousedown touchstart touchmove pointerdown pointermove keydown wheel',
        $('body'),
        (function (self) { return function (e) { self.wakeChart(); }; }(this)),
    );
    this.wakeChart();
};


/**
 * Add-On that animates the chart.
 *
 * Requires `addOns.js`
 *
 * The chart is animated in three ways:
 * 1.  The current price pulsates
 * 2.  The current price appears to move smoothly from the previous price
 * 3.  The chart's y-axis smoothly expands/contracts when a new high or low is reached
 *
 * @param {CIQ.ChartEngine} stx The chart object
 * @param {object} animationParameters Configuration parameters
 * @param {boolean} [animationParameters.stayPut=false] Set to true for last tick to stay in position it was scrolled and have rest of the chart move backwards as new ticks are added instead of having new ticks advance forward and leave the rest of the chart in place.
 * @param {number} [animationParameters.ticksFromEdgeOfScreen=5] Number of ticks from the right edge the chart should stop moving forward so the last tick never goes off screen (only applicable if stayPut=false)
 * @param {number} [animationParameters.granularity=1000000] Set to a value that will give enough granularity for the animation.  The larger the number the smaller the price jump between frames, which is good for charts that need a very slow smooth animation either because the price jumps between ticks are very small, or because the animation was set up to run over a large number of frames when instantiating the CIQ.EaseMachine.
 * @param {number} [animationParameters.tension=null] Splining tension for smooth curves around data points (range 0-1).  Must include splines.js for this to be effective.
 * @param {CIQ.EaseMachine} easeMachine Override the default easeMachine.  Default is `new CIQ.EaseMachine(Math.easeOutCubic, 1000);`
 * @constructor
 * @name  CIQ.Animation
 * @since
 * <br>&bull; 3.0.0 Now part of addOns.js. Previously provided as a standalone animation.js file
 * <br>&bull; 4.0.0 beacon only flashes for line charts. On Candles or bars it is suppressed as it produces an unnatural effect.
 * @example
 * 	new CIQ.Animation(stxx, {tension:0.3});  //Default animation with splining tension of 0.3
 * @since TBD Animation does not support aggregation types
 *
 */
CIQ.Animation = function (stx, animationParameters, easeMachine) {
    let params = {
        stayPut: false,
        ticksFromEdgeOfScreen: 5,
        granularity: 1000000,
    };
    animationParameters = CIQ.extend(params, animationParameters);

    if (params.tension) stx.chart.tension = animationParameters.tension;
    stx.tickAnimator = easeMachine || new CIQ.EaseMachine(Math.easeOutCubic, 1000);
    let scrollAnimator = new CIQ.EaseMachine(Math.easeInOutCubic, 200);

    let flashingColors = ['#0298d3', '#19bcfc', '#5dcffc', '#9ee3ff'];
    let flashingColorIndex = 0;
    let flashingColorThrottle = 20;
    let flashingColorThrottleCounter = 0;

    let filterSession = false;
    let nextBoundary = null;

    function initMarketSessionFlags() {
        filterSession = false;
        nextBoundary = null;
    }

    stx.addEventListener(['symbolChange', 'layout'], (obj) => {
        initMarketSessionFlags();
    });

    stx.prepend('appendMasterData', function (appendQuotes, chart, params) {
        let self = this;
        if (!chart) {
            chart = self.chart;
        }
        // Animations don't support all chart types, only ones with aggregationType values of ohlc or null
        if (this.layout.aggregationType === 'ohlc' || this.layout.aggregationType === null) {
            if (!self.tickAnimator) {
                console.error('Animation plug-in can not run because the tickAnimator has not be declared. See instructions in animation.js');
                return;
            }
            let tickAnimator = self.tickAnimator;

            function unanimateScroll() {
                if (chart.animatingHorizontalScroll) {
                    chart.animatingHorizontalScroll = false;
                    self.micropixels = self.nextMicroPixels = self.previousMicroPixels; // <-- Reset self.nextMicroPixels here
                    chart.lastTickOffset = 0;
                }
                if (chart.closePendingAnimation) {
                    chart.masterData[chart.masterData.length - 1].Close = chart.closePendingAnimation;
                    chart.closePendingAnimation = 0;
                }
            }

            if (chart === null || chart === undefined) return;

            if (params !== undefined && params.animationEntry) return;

            // If symbol changes then reset all of our variables
            if (this.prevSymbol != chart.symbol) {
                this.prevQuote = 0;
                chart.closePendingAnimation = 0;
                this.prevSymbol = chart.symbol;
            }
            unanimateScroll();
            tickAnimator.stop();
            if (appendQuotes.length > 2) {
                return;
            }
            let newParams = CIQ.clone(params);
            if (!newParams) newParams = {};
            newParams.animationEntry = true;
            newParams.bypassGovernor = true;
            newParams.noCreateDataSet = false;
            // newParams.allowReplaceOHL = true;
            newParams.firstLoop = true;
            let symbol = this.chart.symbol;
            let period = this.layout.periodicity;
            let interval = this.layout.interval;
            let timeUnit = this.layout.timeUnit;

            function cb(quote, prevQuote, chartJustAdvanced) {
                return function (newData) {
                    let newClose = newData.Close;
                    if (!chart.dataSet.length || symbol != chart.symbol || period != self.layout.periodicity || interval != self.layout.interval || timeUnit != self.layout.timeUnit) {
                        // console.log ("---- STOP animating: Old",symbol,' New : ',chart.symbol, Date())
                        unanimateScroll();
                        tickAnimator.stop();
                        return; // changed symbols mid animation
                    }
                    let q = CIQ.clone(quote);
                    q.Close = Math.round(newClose * animationParameters.granularity) / animationParameters.granularity; // <<------ IMPORTANT! Use 1000000 for small price increments, otherwise animation will be in increments of .0001
                    // q.Close = Math.round(newClose*chart.roundit)/chart.roundit; // to ensure decimal points don't go out too far for interim values
                    if (chartJustAdvanced) {
                        if (!q.Open && q.Open !== 0) q.Open = q.Close;
                        if (!q.High && q.High !== 0) q.High = Math.max(q.Open, q.Close);
                        if (!q.Low && q.Low !== 0) q.Low = Math.min(q.Open, q.Close);
                    } else {
                        if (quote.Close > prevQuote.High) q.High = q.Close;
                        if (quote.Close < prevQuote.Low) q.Low = q.Close;
                    }
                    if (chart.animatingHorizontalScroll) {
                        self.micropixels = newData.micropixels;
                        chart.lastTickOffset = newData.lineOffset;
                    }
                    newParams.updateDataSegmentInPlace = !tickAnimator.hasCompleted;
                    // console.log("animating: Old",symbol,' New : ',chart.symbol);
                    self.appendMasterData([q], chart, newParams);
                    newParams.firstLoop = false;
                    if (tickAnimator.hasCompleted) {
                        // console.log( 'animator has completed') ;
                        // self.pendingScrollAdvance=false;
                        // var possibleYAxisChange = chart.animatingHorizontalScroll;
                        unanimateScroll();
                        /* if (possibleYAxisChange) { // <---- Logic no longer necessary
                         // After completion, one more draw for good measure in case our
                         // displayed high and low have changed, which would trigger
                         // the y-axis animation
                         setTimeout(function(){
                         self.draw();
                         }, 0);
                         } */
                    }
                };
            }

            let quote = appendQuotes[appendQuotes.length - 1];
            this.prevQuote = this.currentQuote(); // <---- prevQuote logic has been changed to prevent forward/back jitter when more than one tick comes in between animations
            let chartJustAdvanced = false; // When advancing, we need special logic to deal with the open
            if (period == 1 && appendQuotes.length == 2) { // Don't do this if consolidating
                this.prevQuote = appendQuotes[0];
                appendQuotes.splice(1, 1);
            }
            if (!quote || !this.prevQuote) return false;

            let dataZone = this.dataZone;
            if (this.extendedHours && chart.market.market_def) {
                // Filter out unwanted sessions
                let dtToFilter = quote.DT;
                if (CIQ.ChartEngine.isDailyInterval(interval)) {
                    filterSession = !chart.market.isMarketDate(dtToFilter);
                } else if (!nextBoundary || nextBoundary <= dtToFilter) {
                    let session = chart.market.getSession(dtToFilter, dataZone);
                    filterSession = (session !== '' && (!this.layout.marketSessions || !this.layout.marketSessions[session]));
                    nextBoundary = chart.market[filterSession ? 'getNextOpen' : 'getNextClose'](dtToFilter, dataZone, dataZone);
                }
                if (filterSession) {
                    this.draw();
                    return false;
                }
            }

            let barSpan = period;
            if (interval == 'second' || timeUnit == 'second') barSpan *= 1000;
            else if (interval == 'minute' || timeUnit == 'minute') barSpan *= 60000;
            if (!isNaN(interval)) barSpan *= interval;
            if (interval == 'day' || timeUnit == 'day') chartJustAdvanced = quote.DT.getDate() != this.prevQuote.DT.getDate();
            else if (interval == 'week' || timeUnit == 'week') chartJustAdvanced = quote.DT.getDate() >= this.prevQuote.DT.getDate() + 7;
            else if (interval == 'month' || timeUnit == 'month') chartJustAdvanced = quote.DT.getMonth() != this.prevQuote.DT.getMonth();
            else chartJustAdvanced = quote.DT.getTime() >= this.prevQuote.DT.getTime() + barSpan;

            let linearChart = !this.standaloneBars[this.layout.chartType];

            let beginningOffset = 0;
            if (chartJustAdvanced) {
                if (this.animations.zoom.hasCompleted) {
                    let candleWidth = this.layout.candleWidth;
                    if (chart.scroll <= chart.maxTicks) {
                        while (this.micropixels > 0) { // If micropixels is larger than a candle then scroll back further
                            chart.scroll++;
                            this.micropixels -= candleWidth;
                        }
                    }
                    if (chart.scroll <= chart.maxTicks) {
                        this.previousMicroPixels = this.micropixels;
                        this.nextMicroPixels = this.micropixels + candleWidth;
                        beginningOffset = candleWidth * -1;
                        if (chart.dataSegment.length < chart.maxTicks - animationParameters.ticksFromEdgeOfScreen && !animationParameters.stayPut) {
                            this.nextMicroPixels = this.micropixels;
                            chart.scroll++;
                        }
                        chart.animatingHorizontalScroll = linearChart; // When the chart advances we also animate the horizontal scroll by incrementing micropixels
                        chart.previousDataSetLength = chart.dataSet.length;
                    } else {
                        chart.scroll++;
                    }
                } else {
                    return false;
                }
            }
            chart.closePendingAnimation = quote.Close;
            let start = (chartJustAdvanced && !linearChart) ? quote.Open : this.prevQuote.Close;
            tickAnimator.run(cb(quote, CIQ.clone(this.prevQuote), chartJustAdvanced), {
                Close: start,
                micropixels: this.nextMicroPixels,
                lineOffset: beginningOffset,
            }, { Close: quote.Close, micropixels: this.micropixels, lineOffset: 0 });
            return true; // bypass default behavior in favor of animation
        }
    });

    stx.prepend('renderYAxis', function (chart) {
        if (this.grabbingScreen) return;

        let panel = chart.panel;
        let arr = panel.yaxisRHS.concat(panel.yaxisLHS);

        function closure(self) {
            return function (values) {
                chart.animatedLow = values.low;
                chart.animatedHigh = values.high;
                self.draw();
            };
        }
        let i;
        for (i = 0; i < arr.length; i++) {
            let yAxis = arr[i];
            let low = null,
                high = null;
            if (panel.yAxis === yAxis) {
                // initialize prev values
                if (!chart.prevLowValue && chart.prevLowValue !== 0) {
                    chart.prevLowValue = chart.animatedLow = chart.lowValue;
                }
                if (!chart.prevHighValue && chart.prevHighValue !== 0) {
                    chart.prevHighValue = chart.animatedHigh = chart.highValue;
                }

                // check for a change, if so we will spin off an animation

                if (chart.prevLowValue != chart.lowValue || chart.prevHighValue != chart.highValue) {
                    chart.animatingVerticalScroll = true;
                    scrollAnimator.stop();
                    let prevLow = chart.prevLowValue; let prevHigh = chart.prevHighValue;
                    chart.prevLowValue = chart.lowValue;
                    chart.prevHighValue = chart.highValue;
                    scrollAnimator.run(closure(this), { low: prevLow, high: prevHigh }, { low: chart.lowValue, high: chart.highValue });
                    return true;
                }
                chart.animatingVerticalScroll = false;
                low = chart.animatedLow;
                high = chart.animatedHigh;
            }
            this.calculateYAxisRange(panel, yAxis, low, high);
        }

        let parameters = {};

        for (i = 0; i < arr.length; i++) {
            parameters.yAxis = arr[i];
            this.createYAxis(panel, parameters);
            this.drawYAxis(panel, parameters);
        }
        this.drawPanels();
        return true; // bypass original kernel code
    });

    stx.prepend('draw', function () {
        if (this.chart.animatingVerticalScroll) {
            this.renderYAxis(this.chart);
            return true;
        }
    });

    stx.append('draw', function () {
        if (filterSession) return;
        if (this.chart.dataSet && this.chart.dataSet.length && !this.standaloneBars[this.layout.chartType]) {
            if (flashingColorThrottleCounter % flashingColorThrottle === 0) {
                flashingColorIndex++;
                flashingColorThrottleCounter = 0;
            }
            flashingColorThrottleCounter++;

            let context = this.chart.context;
            let panel = this.chart.panel;
            let currentQuote = this.currentQuote();
            if (!currentQuote) return;
            let price = currentQuote.Close;
            let x = this.pixelFromTick(currentQuote.tick, this.chart);
            if (this.chart.lastTickOffset) x += this.chart.lastTickOffset;
            let y = this.pixelFromPrice(price, panel);
            if (this.chart.yAxis.left > x &&
            this.chart.yAxis.top <= y &&
            this.chart.yAxis.bottom >= y) {
                if (flashingColorIndex >= flashingColors.length) flashingColorIndex = 0;
                context.beginPath();
                context.moveTo(x, y);
                context.arc(x, y, 2 + flashingColorIndex * 1.07, 0, Math.PI * 2, false);
                context.fillStyle = flashingColors[flashingColorIndex];
                context.fill();
            }
        }
    });
};


/**
 * Add-On that puts a range slider under the chart. This allows the datasegment to be selectable as a portion of the dataset.
 *
 * Requires `addOns.js`
 *
 * Once instantiated, use the slider `display(true/false)` function to add it or remove it from the chart. See example.
 *
 * If using chatIQ webComponents, it needs to be created before the UI manager (startUI) is called for custom themes to apply.
 *
 * Visual Reference:<br>
 * ![rangeSlider](img-rangeSlider.png "rangeSlider")
 *
 * @param {object} params Configuration parameters
 * @param {CIQ.ChartEngine} [params.stx] The chart object
 * @param {number} [params.height=95] Height of range slider panel
 * @param {number} [params.chartContainer=$("#chartContainer")] jquery handle to the main chart container
 * @constructor
 * @name  CIQ.RangeSlider
 * @since 4.0.0
 * @example
 *  // instantiate a range slider
 * 	new CIQ.RangeSlider({stx:stxx,height:95,chartContainer:$("#chartContainer")});
 *
 *  // display the slider
 * 	stxx.slider.display(true);
 *
 *  // hide the slider
 * 	stxx.slider.display(false);
 */
CIQ.RangeSlider = function (params) {
    let stx = params.stx;
    stx.slider = this;
    let sliderHeight = params.height ? params.height : 95;
    let chartContainer = params.chartContainer ? $(params.chartContainer) : $(params.stx.container);

    let ciqSlider = $('<div class="ciq-slider"></div>');
    let sliderContainer = $('<div class="chartContainer" id="sliderContainer"></div>');
    ciqSlider.insertAfter(chartContainer.parent()).append(sliderContainer);
    ciqSlider.css('height', `${sliderHeight}px`).css('padding-top', '5px').hide();
    sliderContainer.css('height', `${ciqSlider.height()}px`);
    sliderContainer.prop('dimensionlessCanvas', true);
    let self = this.slider = new CIQ.ChartEngine({ container: sliderContainer[0], preferences: { labels: false, whitespace: 0 } });
    self.xaxisHeight = 30;
    self.manageTouchAndMouse = false;
    self.chart.yAxis.drawCurrentPriceLabel = false;
    self.chart.baseline.userLevel = false;
    self.initializeChart();
    let subholder = self.chart.panel.subholder;
    let style = stx.canvasStyle('stx_range_slider shading');

    this.display = function (on) {
        ciqSlider[on ? 'show' : 'hide']();
        stx.resizeChart();
        if (!on) return;
        self.resizeChart();
        self.initializeChart();
        self.draw();
        this.drawSlider();
    };
    this.setSymbol = function (symbol) {
        self.chart.symbol = symbol;
        self.adjustPanelPositions();
    };
    this.acceptLayoutChange = function (layout) {
        let doDraw = false;
        if (self.layout.rangeSlider !== layout.rangeSlider) {
            stx.slider.display(layout.rangeSlider);
        }
        let relevantLayoutPropertiesForRedraw = ['chartType', 'aggregationType',
            'periodicity', 'interval', 'timeUnit',
            'chartScale', 'extended', 'marketSessions', 'rangeSlider',
            'kagi', 'range', 'renko', 'priceLines', 'pandf'];
        relevantLayoutPropertiesForRedraw.forEach((x) => {
            if (!CIQ.equals(self.layout[x], layout[x])) {
                self.layout[x] = layout[x];
                doDraw = true;
            }
        });
        if (!ciqSlider.is(':visible')) return;
        if (doDraw) {
            self.draw();
            this.drawSlider();
        }
    };
    this.copyData = function (chart) {
        // if(!ciqSlider.is(":visible")) return;
        if (!chart.dataSet) return;
        self.chart.symbol = chart.symbol;
        self.masterData = self.chart.masterData = chart.masterData;
        self.chart.dataSet = chart.dataSet;
        self.chart.state = chart.state;
        self.chart.baseline.defaultLevel = chart.baseline.actualLevel;
        self.chart.scroll = self.chart.dataSet.length;
        self.chart.maxTicks = self.chart.scroll + 1;
        self.layout.candleWidth = chart.width / (self.chart.maxTicks + 1);
        self.draw();
        this.drawSlider();
    };
    this.drawSlider = function () {
        if (!stx.chart.dataSet || !stx.chart.dataSet.length) return;
        let chartSubholder = stx.chart.panel.subholder,
            ctx = self.chart.context,
            segmentImage = self.chart.segmentImage,
            halfCandle = self.layout.candleWidth / 2;
        let left = self.tickLeft = Math.max(stx.tickFromPixel(chartSubholder.offsetLeft), 0);
        let right = self.tickRight = Math.min(left + stx.chart.maxTicks - 2, stx.chart.dataSet.length - 1);
        let pLeft = self.pixelLeft = self.pixelFromTick(left) - (segmentImage ? segmentImage[left].candleWidth / 2 : halfCandle);
        let pRight = self.pixelRight = self.pixelFromTick(right) + (segmentImage ? segmentImage[right].candleWidth / 2 : halfCandle);
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(subholder.offsetLeft, subholder.offsetTop, pLeft - subholder.offsetLeft, subholder.offsetHeight);
        ctx.fillRect(subholder.offsetWidth, subholder.offsetTop, pRight - subholder.offsetWidth, subholder.offsetHeight);
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = parseInt(style.borderWidth, 10);
        ctx.moveTo(pLeft, subholder.offsetTop);
        ctx.lineTo(pLeft, subholder.offsetTop + subholder.offsetHeight);
        ctx.moveTo(pRight, subholder.offsetTop);
        ctx.lineTo(pRight, subholder.offsetTop + subholder.offsetHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = parseInt(style.width, 10);
        ctx.lineCap = 'round';
        ctx.moveTo(pLeft, subholder.offsetTop + subholder.offsetHeight / 4);
        ctx.lineTo(pLeft, subholder.offsetTop + 3 * subholder.offsetHeight / 4);
        ctx.moveTo(pRight, subholder.offsetTop + subholder.offsetHeight / 4);
        ctx.lineTo(pRight, subholder.offsetTop + 3 * subholder.offsetHeight / 4);
        ctx.stroke();
        ctx.restore();
    };
    stx.addEventListener('layout', (obj) => {
        obj.stx.slider.acceptLayoutChange(obj.stx.layout);
    });
    stx.addEventListener('symbolChange', (obj) => {
        if (obj.action == 'master') obj.stx.slider.setSymbol(obj.symbol);
    });
    stx.addEventListener('symbolImport', (obj) => {
        if (obj.action == 'master') obj.stx.slider.setSymbol(obj.symbol);
        obj.stx.slider.acceptLayoutChange(obj.stx.layout);
    });
    stx.addEventListener('theme', (obj) => {
        self.clearPixelCache();
        self.styles = {};
        self.chart.container.style.backgroundColor = '';
        let helper = new CIQ.ThemeHelper({ stx: obj.stx });
        helper.params.stx = self;
        helper.update();
    });
    stx.append('createDataSet', function () {
        this.slider.copyData(this.chart);
    });
    stx.append('draw', function () {
        if (!ciqSlider.is(':visible')) return;
        if (!self.chart.dataSet) return;
        self.chart.baseline.defaultLevel = this.chart.baseline.actualLevel;
        self.draw();
        this.slider.drawSlider();
    });
    stx.prepend('resizeChart', () => {
        let ciqChart = chartContainer.parent();
        let heightOffset = ciqChart.height() - chartContainer.height();
        ciqChart.height(ciqChart.parent().height() - (ciqSlider.is(':visible') ? sliderHeight : 0));
        chartContainer.height(ciqChart.height() - heightOffset);
    });
    $(subholder).on('mousedown touchstart pointerdown', (e) => {
        let start = e.offsetX || e.originalEvent.layerX;
        if (!start && start !== 0) return; // wrong event
        let s = $(self);
        s.prop('startDrag', start)
            .prop('startPixelLeft', self.pixelLeft)
            .prop('startPixelRight', self.pixelRight);
        let bw = parseInt(style.borderLeftWidth, 10);
        if (start < self.pixelRight - bw) s.prop('needsLeft', true);
        if (start > self.pixelLeft + bw) s.prop('needsRight', true);
        if (CIQ.touchDevice) return;
        CIQ.appendClassName(e.target, 'stx-drag-chart');
    });
    $(subholder).on('mouseup mouseout touchend pointerup', (e) => {
        CIQ.unappendClassName(e.target, 'stx-drag-chart');
        let s = $(self);
        s.prop('startDrag', null)
            .prop('needsLeft', false)
            .prop('needsRight', false);
    });
    $(subholder).on('mousemove touchmove pointermove', (e) => {
        let s = $(self);
        let startDrag = s.prop('startDrag');
        if (!startDrag && startDrag !== 0) return;
        let touches = e.originalEvent.touches;
        let movement = (touches && touches.length) ? touches[0].pageX - e.target.offsetLeft : e.offsetX;
        if (!movement && movement !== 0) return; // wrong event
        movement -= startDrag;
        let tickLeft = self.tickLeft,
            tickRight = self.tickRight;
        let startPixelLeft = s.prop('startPixelLeft'),
            startPixelRight = s.prop('startPixelRight');
        let needsLeft = s.prop('needsLeft'),
            needsRight = s.prop('needsRight');
        if (needsLeft) {
            if (startPixelLeft + movement < 0) movement = -startPixelLeft;
            tickLeft = self.tickFromPixel(startPixelLeft + movement);
            if (needsRight) tickRight = self.tickRight + tickLeft - self.tickLeft;
        } else if (needsRight) {
            tickRight = Math.min(self.tickFromPixel(startPixelRight + movement), stx.chart.dataSet.length - 1);
        } else return;

        let newCandleWidth = stx.chart.width / (tickRight - tickLeft + 1);
        if (tickRight >= tickLeft && newCandleWidth >= stx.minimumCandleWidth) {
            self.tickLeft = tickLeft;
            self.tickRight = tickRight;
            stx.chart.scroll = stx.chart.dataSet.length - tickLeft;
            if (!needsLeft || !needsRight) {
                stx.setCandleWidth(newCandleWidth);
            }
            stx.micropixels = 0;
            stx.draw();
        }
    });
    this.copyData(stx.chart);
};