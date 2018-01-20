(function (win, doc) {
    'use strict';

    var store = win.__SoulStore__ = win.__SoulStore__ || {};
    var templates = [];
    var loadCache = {};
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

    /**
     * Binds an object to the element.
     * The attribute's value can be in the following formats:
     * - <context-path> - bind the selected context path object's property to textContent / value (depends on HTML element)
     * - <node-property>:<context-path> - bind the selected context path object's property to whatever node property is provided
     * 
     * Whenever the data changes, this node will reflect the change.
     * 
     * Example:
     *  
     *      <div>Your name is: <span data-bind="firstName">Tester</span></div>
     *      <input type="text" data-bind="firstName"/>
     * 
     *      // in your data:
     *      {
     *          "firstName": "Tester"
     *      }
     * 
     * @param {HTMLElement} startNode 
     * @param {Object} context 
     */
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
            var result = obj.cursor[obj.index];
            if (typeof result === 'function') {
                result = obj.cursor[obj.index](binder, binder.context || context);
                if (typeof result !== 'undefined') {
                    binder[target] = result || '';
                }
            } else {
                binder[target] = result || '';
            }
            if (['input', 'select', 'textarea'].indexOf(binder.nodeName.toLowerCase()) >= 0) {
                binder.addEventListener('change', function() {
                    if (source.split('.').pop() === '*') obj.index = obj.cursor.length;
                    if (typeof obj.cursor[obj.index] === 'function') {
                        obj.cursor[obj.index](binder, binder.context || context, this[target]);
                    } else {
                        obj.cursor[obj.index] = this[target];
                    }
                    triggerStoreUpdate(this[target], source);
                }, false);
            }
        });
    }

    /**
     * Handles a toggle data attribute.
     * The attribute's value can be in the following formats:
     * - <context-path> - toggle the selected context path object's property via click event
     * - hover:<context-path> - toggle the selected context path object's property on hover
     * - <toggle-event>:<context-path> - toggle the selected context path object's property on the given toggle event
     * 
     * @param {HTMLElement} startNode 
     * @param {Object} context 
     */
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

    /**
     * Handles data action attributes on click.
     * The attribute's value can be in the following formats:
     * - <action-event>:<action-function> - the action function is not called on click but when the action event is fired
     * - <action-function> - the context path object's property path where to find the action function (function will be called with 2 parameters: node, context)
     * - <action-event>:<action-function>:<parameter> - call the provided action function with a given parameter (function will be called with 4 parameters: node, context, parameter value, parameter name)
     *
     * After this function was called, a change in data is assumed, therefore a re-render is triggered.
     * Example:
     * 
     *      <div data-action="remove:sliderItems.0">Remove first slider item</div>
     * 
     *      // in your data
     *      {
     *          remove: function(node, context, itemObject, parameterName) {
     *              var itemPosition = context.sliderItems.indexOf(itemObject);
     *              context.sliderItems.splice(itemPosition, 1);
     *          }
     *      }
     * 
     * @param {HTMLElement} startNode 
     * @param {Object} context 
     */
    function handleAction(startNode, context) {
        startNode = startNode || doc.body;
        context = context || store;
        each(startNode.querySelectorAll('[data-action]'), function (action) {
            if (action.actionAttached) return;
            action.actionAttached = true;
            var pair = action.dataset.action.split(':');
            var actionEvent = pair[0];
            var actionName = pair[1];
            var parameter = pair[2];
            if (!parameter && actionEvent && actionName) {
                if (['click', 'mouseover', 'mouseout', 'mousemove', 'mousedown', 'mouseenter', 'mouseleave', 'submit', 'load', 'focus', 'blur', 
                     'animationstart', 'animationend', 'animationiteration', 'dblclick', 'drag', 'dragstart', 'dragend', 'dragenter', 'dragleave', 
                     'dragover', 'drop', 'ended', 'error', 'invalid', 'keydown', 'keypress', 'keyup', 'change', 'play', 'pause', 'playing', 
                     'seeked', 'touchstart', 'touchend', 'touchmove'].indexOf(actionEvent.toLowerCase()) < 0) {
                    // no standard event
                    // so assume that we have action function and parameter combination
                    parameter = actionName;
                    actionName = actionEvent;
                    actionEvent = 'click';
                }
            }
            if (actionEvent && !actionName) {
                actionName = actionEvent;
                actionEvent = 'click';
            }
            if (!action.context && action.dataset.context && JSON.parse(action.dataset.context)) {
                action.context = JSON.parse(action.dataset.context);
            }
            var actionFn = getValueFromPath(actionName, action.context || context);
            if (typeof actionFn === 'function') {
                action.addEventListener(actionEvent.toLowerCase(), function(event) {
                    event.preventDefault();
                    parameter && (parameter = getValueFromPath(parameter, action.context || context)); 
                    actionFn(action, action.context || context, parameter, pair[pair.length - 1]);
                    triggerStoreUpdate();
                });
            }
        });
    }

    function handleDataAttributes(startNode, context) {
        handleBind(startNode, context);
        handleToggle(startNode, context);     
        handleAction(startNode, context);        
    }

    function handleLoad(container, context, fn) {
        templates.push({
            render: function() {
                var data = context || store;
                var rendered = fn.render(data);
                // only update if something changed
                if (container.lastRendered !== rendered) {
                    container.innerHTML = rendered;
                    container.lastRendered = rendered;
                }
            },
            node: container
        });
        templates[templates.length - 1].render();
        handleDataAttributes(container, context);
    }

    handleDataAttributes();

    var loadFragment;
    win.addEventListener('store-changed', function(event) {
        each(doc.body.querySelectorAll('[data-bind]'), function(bound) {
            if (bound.dataset.load) return;
            var pair = bound.dataset.bind.split(':');
            var target = pair[0];
            var source = pair[1];
            if (!source) {
                source = target;
                target = ['input', 'select', 'textarea'].indexOf(bound.nodeName.toLowerCase()) >= 0 ? 'value' : 'textContent';
            }
            if (bound.boundObject) {
                var result = bound.boundObject.cursor[bound.boundObject.index];
                if (typeof result === 'function') {
                    result = result(bound, bound.context || store);
                }
                if (bound[target] !== result && 'undefined' !== typeof result) {
                    bound[target] = result || '';
                }
            }
        });
        templates.forEach(function(template, idx) {
            if (!template.node.isConnected) {
                return templates.splice(idx, 1);
            }
            template.render();
            handleDataAttributes(template.node, template.node.context);
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
        var loadHandler = handleLoad.bind(null, container, context);
        if (!toLoad.match(/\.js$/)) toLoad += '.js';
        if (loadCache[toLoad]) {
            return loadHandler(loadCache[toLoad]);
        }
        fetch(toLoad).then(function(response){return response.text();}).then(function(jsCode) { 
            var code = 'var module = {exports:{}};var require=function(path){return{render:function(data){return "<div data-load=\\"' + toLoad.replace(/\w+(\.\w+)?$/, '') + '" + path + "\\" data-context=\'" + JSON.stringify(data).replace(/\'/g, \'\\\'\') + "\'></div>";}}};' + jsCode + ';return module.exports;';
            var fn = new Function(code)();
            loadCache[toLoad] = fn;
            return fn;
        }).then(loadHandler);
    });

    var mo = new MutationObserver(function(mutations) {
        for (var all in mutations) {
            for (var i = 0, arr = [].slice.call(mutations[all].addedNodes), len = arr.length, node; node = arr[i], i < len; i += 1) {
                if (node.dataset && node.dataset.load) {
                    loadFragment(node);
                } else if (node.dataset && node.dataset.bind) {
                    handleBind(node);
                } else if (node.dataset && node.dataset.toggle) {
                    handleToggle(node);
                } else if (node.dataset && node.dataset.action) {
                    handleAction(node);
                } else if (node.nodeType === 1) {
                    var nodeList = node.querySelectorAll('[data-load]');
                    if (nodeList.length > 0) {
                        arr = arr.concat([].slice.call(nodeList));
                        len = arr.length;
                    }
                }
            }
            for (i = 0, arr = [].slice.call(mutations[all].removedNodes), len = arr.length, node; node = arr[i], i < len; i += 1) {
                var affected = templates.filter(function(tpl) { return tpl.node === node});
                while (affected.length > 0) {
                    var idx = templates.lastIndexOf(affected.pop());
                    templates.splice(idx, 1);
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