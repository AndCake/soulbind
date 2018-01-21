// load fetch polyfill for IE
if (!window.fetch) {
    document.write('<script src="https://unpkg.com/promis@1.1.4/promise.js"><\/' + 'script>');
    document.write('<script src="//unpkg.com/unfetch/dist/unfetch.umd.js" onload="window.fetch=window.unfetch"><\/' + 'script>');
}

// CustomEvent constructor polyfill for IE
(function () {
    if (typeof window.CustomEvent === "function") return false;

    function CustomEvent(event, params) {
        params = params || {
            bubbles: false,
            cancelable: false,
            detail: undefined
        };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
}());

// currentScript polyfill for IE
(function () {
    if (typeof document.currentScript !== 'undefined' || !document.__defineGetter__) return;
    document.__defineGetter__("currentScript", function() {
        try {
            throw new Error()
        } catch (e) {
            var qualifiedUrl = location.protocol + "//" + location.host, 
                srcs = e.stack.match(new RegExp(qualifiedUrl + ".*?\\.js", 'g')), 
                src = srcs[srcs.length - 1],
                absoluteUrl = src.replace(qualifiedUrl, ""),
                scripts = document.scripts, 
                i = -1, 
                l = scripts.length;

            while (++i < l) {
                if (scripts[i][0] == "/" && scripts[i].src == absoluteUrl || scripts[i].src == src) {
                    return scripts[i];
                }
            }
        }
    });
}());