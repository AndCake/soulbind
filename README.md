Soul Bind
=========

Simple data binding, event handling and support for templating. Weighs in at just 2.1k minified and gzipped and 5.1k minified.

You can use the following data attributes:

 * data-bind
     Binds an object to the element.
     The attribute's value can be in the following formats:
     - <context-path> - bind the selected context path object's property to textContent / value (depends on HTML element)
     - <node-property>:<context-path> - bind the selected context path object's property to whatever node property is provided
     
     Whenever the data changes, this node will reflect the change. If the context path resolves to a function instead of a string / number, then this function will be called with the respective node and it's data context. If the context path is a function and it is bound to a form field, then
     if the form field's value changes, it's new value is passed into the context path function as the third parameter.
     
     Example:
      
          <div>Your name is: <span data-bind="firstName">Tester</span></div>
          <input type="text" data-bind="firstName"/>
     
          // in your data:
          {
              "firstName": "Tester"
          }

     Example 2:

        <div>Random number: <span data-bind="rand"></span></div>
        <label>Multiplicator: <input type="text" data-bind="rand"/></label>

        // in your data:
        {
            "rand": function(node, context, multiplicator) {
                if (multiplicator) {
                    this.multiplicator = multiplicator;
                }
                if (!this.multiplicator) {
                    this.multiplicator = 1000;
                }
                if (node.nodeName === 'INPUT' && !multiplicator) {
                    return this.multiplicator;
                }
                return Math.floor(Math.random() * this.multiplicator);
            }.bind({})
        }

 * data-toggle
     Handles a toggle data attribute.
     The attribute's value can be in the following formats:
     - <context-path> - toggle the selected context path object's property via click event
     - hover:<context-path> - toggle the selected context path object's property on hover
     - <toggle-event>:<context-path> - toggle the selected context path object's property on the given toggle event

     Example:
    
        In your template:

            {{#showFilters}}
                <ul class="filter">
                    <li>...</li>
                </ul>
            {{/showFilters}}

        In your HTML:

            <button data-toggle="showFilters">Toggle filter</button>

 * data-action
     Handles data action attributes on click.
     The attribute's value can be in the following formats:
     - <action-event>:<action-function> - the action function is not called on click but when the action event is fired
     - <action-function> - the context path object's property path where to find the action function (function will be called with 2 parameters: node, context)
     - <action-event>:<action-function>:<parameter> - call the provided action function with a given parameter (function will be called with 4 parameters: node, context, parameter value, parameter name)
     
     After this function was called, a change in data is assumed, therefore a re-render is triggered.

     Example:
     
          <div data-action="remove:sliderItems.0">Remove first slider item</div>
     
          // in your data
          {
              remove: function(node, context, itemObject, parameterName) {
                  var itemPosition = context.sliderItems.indexOf(itemObject);
                  context.sliderItems.splice(itemPosition, 1);
              }
          }

 * data-load
     Handles asynchronous loading of additional templates / fragments. Needs to be a CommonJS module that exports a render(data) function and generates a string. You can use require() in order to load other templates / fragments, as long as they also export the render(data) function.
     If a data-bind attribute is present for the same element, then the data-bind will not update the content but define a sub-set of the data context that will be made available to the render(data) function.

     The path provided should be relative to the index.js / index.min.js file and reside on the same server.

     Example:

         <div data-load="./templates/miniGrid" data-bind="homepage"></div>

         This will load a miniGrid.js template file from the server via fetch and inject the result of the render() function into the div. The render function will be called with the current context's `homepage` property selected (so only data within the `homepage` property is accessible to the render function).
    
 * data-context
     Defines a JSON object that should be the current element's context. Useful, if you want a separate / encapsulated context for a part of your page.

All data is stored / retrieved from the `__SoulStore__` global variable, if no explicit context via `data-context` is used. If you manually change the store after the page was loaded, it is recommended to fire a `store-changed` custom event on the `window` object to make sure that everything gets re-rendered.