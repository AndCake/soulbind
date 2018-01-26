function assertEquals(a, b, msg) {
    if (a !== b) {
        throw new Error('Assertion failed: ' + a + '===' + b + '. ' + (msg || ''));
    }
}

function assertContains(a, b, msg) {
    assertEquals(true, b.indexOf(a) >= 0, 'Assertion failed: "' + b + '" contains "' + a + '". ' + (msg || ''));
}

function refreshStore() {
    var event = new Event('store-changed');
    window.dispatchEvent(event);
}

function createElement(tag, attrs, content) {
    var el = document.createElement(tag);

    for (var all in attrs) {
        el.setAttribute(all, attrs[all]);
    }

    el.innerHTML = content;

    return el;
}

function appendElement(parent, tag, attrs, content) {
    var el = createElement(tag, attrs, content);
    parent.appendChild(el);
    return el;
}

describe('soulbind', () => {

    describe('data-bind', () => {
        it('supports simple data binding', done => {
            __SoulStore__.counter = '0';
            var div = appendElement(document.body, 'div', {}, '<span data-bind="counter"></span>');
            setTimeout(function() {
                assertEquals('0', div.querySelector('span').innerHTML, 'correctly presets value.');
    
                __SoulStore__.counter = 1;
                refreshStore();
                setTimeout(function() {
        
                    assertEquals('1', div.querySelector('span').innerHTML);
                    done();
                }, 10);
            }, 10);
        });
        it('can deal with context', done => {
            var div = appendElement(document.body, 'div', {}, '<span data-bind="funky" data-context=\'{"funky": "test"}\'></span>');
            setTimeout(function() {
                assertEquals('test', div.querySelector('span').innerHTML);
                done();
            }, 10);
        });
        it('can call functions to retrieve the value', done => {
            __SoulStore__.func = function() { return 'function called'; }
            var div = appendElement(document.body, 'div', {}, '<span data-bind="func"></span>');
            setTimeout(function() {
                assertEquals('function called', div.querySelector('span').innerHTML);
                done();
            }, 10);
        });
        it('can update the store if the value is bound to a form field', done => {
            var div = appendElement(document.body, 'div', {}, '<input type="text" data-bind="counter"/>');
            setTimeout(function() {
                assertEquals('1', div.querySelector('input').value);
                div.querySelector('input').value = 23;
                div.querySelector('input').dispatchEvent(new Event('change'));
                assertEquals('23', div.querySelector('input').value);
                assertEquals('23', document.querySelector('span').innerHTML);
                done();
            }, 10);
        });
        it('form fields can deal with function values as well', done => {
            __SoulStore__.counter = function(node, context, value) {
                if (!value) {
                    return this.valueSet || 'empty';
                } else {
                    this.valueSet = 'new value: ' + value;
                    return this.valueSet;
                }
            }.bind({});
            refreshStore();
            assertEquals('empty', document.querySelector('input').value);
            assertEquals('empty', document.querySelector('span').innerHTML);
            document.querySelector('input').value = 'some value';
            document.querySelector('input').dispatchEvent(new Event('change'));
            assertEquals('new value: some value', document.querySelector('input').value);
            assertEquals('new value: some value', document.querySelector('span').innerHTML);
            done();
        });
        it('form fields can deal with entering array values', done => {
            __SoulStore__.array = [];
            var div = appendElement(document.body, 'div', {}, '<input type="text" data-bind="array.*"/>');
            setTimeout(function() {
                var el = div.querySelector('input');
                el.value = 'some value';
                el.dispatchEvent(new Event('change'));
                assertEquals(1, __SoulStore__.array.length, 'store array got the value appended');
                done();
            }, 10);
        });
    });

    describe('data-toggle', () => {
        it('can toggle the value of a store entry', done => {
            var div = appendElement(document.body, 'div', {}, '<button data-toggle="toggledValue">Toggle</button>');
            setTimeout(function() {
                div.querySelector('button').dispatchEvent(new Event('click'));
                assertEquals(true, __SoulStore__.toggledValue, 'Value was toggled to true');
                div.querySelector('button').dispatchEvent(new Event('click'));
                assertEquals(false, __SoulStore__.toggledValue, 'Value was toggled back to false');
                done();
            }, 10);
        });
        it('can toggle a context-specific value', done => {
            var div = appendElement(document.body, 'div', {}, '<button data-toggle="toggledValue" data-context=\'{"toggledValue": true}\'>Toggle</button>');
            setTimeout(function() {
                var button = div.querySelector('button');
                button.dispatchEvent(new Event('click'));
                assertEquals(false, button.context.toggledValue, 'Value was toggled to false');
                button.dispatchEvent(new Event('click'));
                assertEquals(true, button.context.toggledValue, 'Value was toggled back to true');
                done();
            }, 10);
        });
        it('can toggle based on hover event', done => {
            var div = appendElement(document.body, 'div', {}, '<button data-toggle="hover:toggledValue">Toggle</button>');
            setTimeout(function() {
                div.querySelector('button').dispatchEvent(new Event('mouseover'));
                assertEquals(true, __SoulStore__.toggledValue, 'Value was toggled to true');
                div.querySelector('button').dispatchEvent(new Event('mouseout'));
                assertEquals(false, __SoulStore__.toggledValue, 'Value was toggled back to false');
                done();
            }, 10);
        });
    });

    describe('data-action', () => {
        it('can trigger function calls on click', done => {
            __SoulStore__.remove = function(node, ctx, toRemove) {
                var idx = ctx.array.indexOf(toRemove);
                ctx.array.splice(idx, 1);
            };
            var div = appendElement(document.body, 'div', {}, '<button data-action="remove:array.0">remove first element</button>');
            setTimeout(function() {
                var button = div.querySelector('button');
                button.dispatchEvent(new Event('click'));
                assertEquals(0, __SoulStore__.array.length, 'Value was removed from array');
                done();
            }, 10);
        });
/*
        it('can pass over a context object', done => {
            var div = appendElement(document.body, 'div', {}, '<button data-action="remove" data-context=\'{"array": ["Test1", "Test2"]}\'>remove first element</button>');
            setTimeout(function() {
                var button = div.querySelector('button');
                button.context.remove = function(node, ctx) {
                    console.log(node, ctx);
                    ctx.array.shift();
                };
                button.dispatchEvent(new Event('click'));
                assertEquals(1, button.context.array.length, 'Value was removed from array');
                done();
            }, 10);
        });
        */
    });

    describe('data-load', () => {
        it('can load an external template on demand', done => {
            var div = appendElement(document.body, 'div', {}, '<div data-load="./templates/mainSlider"></div>');
            var check;
            setTimeout(check = function() {
                if (!div.querySelector('ul')) {
                    return setTimeout(check, 10);
                }
                assertEquals(1, div.querySelectorAll('li').length, 'rendered the loaded template');
                done();
            }, 10);
        });
        it('can bind the template to a specific object in the store', done => {
            __SoulStore__.testObject = {
                sliderItems: ['Test', 'Hello']
            };
            var check;
            var div = appendElement(document.body, 'div', {}, '<div data-load="./templates/mainSlider" data-bind="testObject"></div>');
            setTimeout(check = function() {
                if (!div.querySelector('ul')) {
                    return setTimeout(check, 10);
                }
                assertEquals(2, div.querySelectorAll('li').length, 'rendered the loaded template');
                assertEquals('Hello', [].slice.call(div.querySelectorAll('li'), -1)[0].innerHTML, 'rendered the correct context');
                done();
            }, 10);
        });
        it('can load a template with template-specific styles', done => {
            var div = appendElement(document.body, 'div', {}, '<div data-load="./templates/productTile" data-context=\'{"name": "Test Product", "url": "/test", "price": 12.99}\'></div>');
            var check;
            setTimeout(check = function() {
                if (!div.querySelector('.product-tile')) {
                    return setTimeout(check, 10);
                }
                assertEquals('style-productTile.js', document.querySelector('style').id, 'renders style tag');
                assertEquals('.product-tile', document.querySelector('style').textContent.match(/\.product-tile/g)[0], 'style tag contains styles');
                done();
            }, 10);
        });
        it('re-renders the template if the data changes', done => {
            var div = document.querySelector('div[data-load$="productTile"]');
            div.context.price = 30.25;
            refreshStore();
            assertEquals('30.25', div.querySelector('.product-price').innerHTML.trim());
            done();
        });
    });

    describe('API use', () => {
        it('can load a template', done => {
            window.SoulBind.load('./templates/mainSlider', null).then(el => {
                assertEquals('DIV', el.nodeName);
                assertContains('Nothing here', el.innerHTML);
                done();
            });
        });
        it('can load a template with bound store value', done => {
            window.SoulBind.load('./templates/mainSlider', 'testObject').then(el => {
                assertEquals('DIV', el.nodeName);
                assertContains('Test', el.innerHTML);
                assertContains('Hello', el.innerHTML);
                done();
            }, err => {
                console.error(err);
                throw new Error('Unable to load templates/mainSlider');
            });
        });
        it('can load a template with custom context', done => {
            window.SoulBind.load('./templates/mainSlider', {
                sliderItems: ['X123', 'Y234']
            }).then(el => {
                assertEquals('DIV', el.nodeName);
                assertContains('X123', el.innerHTML);
                assertContains('Y234', el.innerHTML);
                done();
            }, err => {
                console.error(err);
                throw new Error('Unable to load templates/mainSlider');
            });
        });
        it('refreshes API-loaded templates when triggering store update', done => {
            __SoulStore__.testObject2 = {
                sliderItems: ['Test', 'Helo']
            };
            window.SoulBind.load('./templates/mainSlider', 'testObject2').then(el => {
                assertEquals('DIV', el.nodeName);
                assertContains('Test', el.innerHTML);
                assertContains('Helo', el.innerHTML);

                __SoulStore__.testObject2.sliderItems[1] = 'Just a value';
                window.SoulBind.storeChanged();
                assertContains('Test', el.innerHTML);
                assertContains('Just a value', el.innerHTML);
                done();
            }, err => {
                console.error(err);
                throw new Error('Unable to load templates/mainSlider');
            });
        });
    });

    describe('memory management', () => {
        it('cleans up loaded template bindings if the element is removed', done => {
            var div = document.createElement('div');
            div.appendChild(document.querySelector('[data-bind="testObject"]'));
            document.body.appendChild(div);
            document.body.innerHTML = '';
            setTimeout(function() {
                __SoulStore__.testObject.sliderItems.push('New Item');
                window.SoulBind.storeChanged();
                done();
            }, 10);
        });
    });
});

describe('coverage', () => {
    it('generates the code coverage report', (done) => {
        // only works for Nightmare browser
        if (typeof window.require !== 'function') return done();
        const fs = window.require('fs');
        if (window.__coverage__) {
            fs.writeFileSync('./coverage.json', JSON.stringify(window.__coverage__), 'utf-8');
        } else {
            throw new Error('No code coverage report generated.');
        }
        done();
    });
});