(function (win, doc) {
    'use strict';

    var store = win.__SoulStore__ = win.__SoulStore__ || {};
    var templates = [];
    var each = function (arr, fn) {
        for (var i = 0, len = arr.length, el; el = arr[i], i < len; i += 1) {
            fn(el, i, arr);
        }
    };
    var triggerStoreUpdate = function triggerStoreUpdate(value, path) {
        var event = new CustomEvent('store-changed', {
            detail: {
                value: value,
                path: path
            },
            bubbles: false
        });
        win.dispatchEvent(event);
    };
    var resolvePath = function(path, data) {
        var cursor = data;
        var last = null;
        each(path.split('.'), function (el, idx, arr) {
            if (idx >= arr.length - 1) {
                last = el;
                if (el === '*') {
                    el = cursor.length;
                }
                return;
            }
            if (el !== '*') {
                if (!cursor[el] && idx < arr.length - 1) {
                    cursor[el] = {};
                    if (arr[idx + 1] === '*') {
                        cursor[el] = [];
                    }
                }
                cursor = cursor[el];
            }
        });
        return {
            cursor: cursor,
            index: last
        };
    };
    var getValueFromPath = function(path, data) {
        var obj = resolvePath(path, data);
        return obj.cursor[obj.index];
    };

    function handleBind(startNode, context) {
        startNode = startNode || doc.body;
        context = context || store;             
        each(startNode.querySelectorAll('[data-bind]'), function (binder, idx) {
            if (binder.bindAttached) return;
            binder.bindAttached = true;
            var pair = binder.dataset.bind.split(':');
            var target = pair[0];
            var source = pair[1];
            if (!source) {
                source = target;
                target = binder.nodeName === 'INPUT' || binder.nodeName === 'SELECT' || binder.nodeName === 'TEXTAREA' ? 'value' : 'textContent';
            }
            if (!binder.context && binder.dataset.context && JSON.parse(binder.dataset.context)) {
                binder.context = JSON.parse(binder.dataset.context);
            }
            var obj = resolvePath(source, binder.context || context);
            var value = getValueFromPath(source, binder.context || context);
            obj.cursor[obj.index] = value || binder[target];
            binder.boundObject = obj;
            if (['input', 'select', 'textarea'].indexOf(binder.nodeName.toLowerCase()) >= 0) {
                binder.addEventListener('change', function() {
                    if (source.split('.').pop() === '*') obj.index = obj.cursor.length;
                    obj.cursor[obj.index] = this[target];
                    triggerStoreUpdate(this[target], source);
                }, false);
            }
        });
    }

    function handleToggle(startNode, context) {
        startNode = startNode || doc.body;
        context = context || store;
        each(startNode.querySelectorAll('[data-toggle]'), function (toggler) {
            if (toggler.toggleAttached) return;
            toggler.toggleAttached = true;
            var pair = toggler.dataset.toggle.split(':');
            var toggleEvent = pair[0]
            var toToggle = pair[1];
            if (!toToggle) {
                toggleEvent = 'click';
                toToggle = pair[0];
            }
            if (!toggler.context && toggler.dataset.context && JSON.parse(toggler.dataset.context)) {
                toggler.context = JSON.parse(toggler.dataset.context);
            }
            var obj = resolvePath(toToggle, toggler.context || context);
            if (toggleEvent === 'hover') {
                var startValue = obj.cursor[obj.index];
                toggler.addEventListener('mouseover', function() {
                    obj.cursor[obj.index] = !startValue;
                    triggerStoreUpdate(obj.cursor[obj.index], toToggle, toggler.context || context);
                });
                toggler.addEventListener('mouseout', function() {
                    obj.cursor[obj.index] = startValue;
                    triggerStoreUpdate(obj.cursor[obj.index], toToggle, toggler.context || context);
                });
            } else {
                toggler.addEventListener(toggleEvent, function() {
                    obj.cursor[obj.index] = !obj.cursor[obj.index];
                    triggerStoreUpdate(obj.cursor[obj.index], toToggle, toggler.context || context);
                });
            }
        });        
    }

    handleBind();
    handleToggle();

    var loadFragment;
    win.addEventListener('store-changed', function(event) {
        templates.forEach(function(template, idx) {
            if (!template.node.isConnected) {
                templates.splice(idx, 1);
                return;
            }
            template.render(event.detail.path);
            handleBind(template.node, template.node.context);
            handleToggle(template.node, template.node.context);
        });
    });
    each(doc.body.querySelectorAll('[data-load]'), loadFragment = function(container) {
        var toLoad = container.dataset.load;
        var bindTo = container.dataset.bind;
        var context = container.dataset.context;
        if (context) {
            context = JSON.parse(context);
        }
        container.context = context;
        if (bindTo) {
            var obj = resolvePath(bindTo, context || store);
            container.context = obj.cursor[obj.index] || {};
            context = container.context;
        }
        if (!toLoad.match(/\.js$/)) toLoad += '.js';
        fetch(toLoad).then(function(response){return response.text();}).then(function(jsCode) { 
            var code = 'var module = {exports:{}};var require=function(path){return{render:function(data){return "<div data-load=\\"' + toLoad.replace(/\w+(\.\w+)?$/, '') + '" + path + "\\" data-context=\'" + JSON.stringify(data).replace(/\'/g, \'\\\'\') + "\'></div>";}}};' + jsCode + ';return module.exports;';
            return new Function(code)();
        }).then(function(fn) {
            templates.push({
                render: function() {
                    var data = context || store;
                    container.innerHTML = fn.render(data);
                },
                node: container
            });
            templates[templates.length - 1].render();
            handleBind(container, context);
            handleToggle(container, context);
        });
    });

    var mo = new MutationObserver(function(mutations) {
        for (var all in mutations) {
            for (var i = 0, arr = [].slice.call(mutations[all].addedNodes), len = arr.length, node; node = arr[i], i < len; i += 1) {
                if (node.dataset && node.dataset.load) {
                    loadFragment(node);
                } else if (node.nodeType === 1) {
                    var nodeList = node.querySelectorAll('[data-load]');
                    if (nodeList.length > 0) {
                        arr = arr.concat([].slice.call(nodeList));
                        len = arr.length;
                    }
                }
            }
        }
    });
    mo.observe(doc.body, {subtree: true, childList: true});
}(window, document));

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
})();