/**
 * @file Provides implementation of string template compiler and utilities.
 * @author Simon Struthers
 * @copyright The Simon Bolivar Company 2023
 * @license MPL-2.0
 * @version 1.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
!function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ?
        module.exports = factory() :
    typeof define === 'function' && define.amd ?
        define(factory) :
    global.template = factory();
}(this, () => {
    let bareTemplate, errMsg = 'insert must be an object.';
    try {
        Function();

        const escapeCharactersRegExp = /(`|\$)/g,
            identifierRegExp = /^[\p{IDS}$_][\p{IDC}$_]*$/u;

        bareTemplate = (template, ...items) =>
            Function('a', template.reduce(
                (body, string, index) => {
                    escapeCharactersRegExp.lastIndex = 0;
                    body += string.replace(escapeCharactersRegExp, '\\$1');
                    if (index !== template.length - 1) {
                        const item = items[index], type = typeof item;
                        if (item !== void 0 && item !== null) {
                            body += `\${${
                                type === 'object' && item ? `a[${index}]` :
                                type === 'function' ? `c=a[${index}],c(b)` :
                                identifierRegExp.test(item) ? `b.${item}` :
                                `b[${JSON.stringify(item)}]`
                            }??""}`;
                        }
                    }
                    return body;
                },
                'return b=>{let c;if(typeof b!="object")throw TypeError("' +
                    errMsg + '");return`'
            ) + '`}')(items);
    } catch (e) {
        if (!(e instanceof EvalError)) throw e;
        bareTemplate = (template, ...items) => insert => {
            if (typeof insert !== 'object')
                throw TypeError(errMsg);
            return template.reduce((result, string, index) => {
                result += string;
                if (index !== template.length - 1) {
                    const item = items[index], type = typeof item;
                    if (item !== void 0 && item !== null) {
                        result += `${(
                            type == 'object' ? item :
                            type == 'function' ? item(insert) :
                            insert[item]
                        ) ?? ""}`;
                    }
                }
                return result;
            }, '')
        };
    }

    function template(strings, ...items) {
        if (new.target) throw TypeError('Illegal constructor.');
        return Object.setPrototypeOf(
            bareTemplate(strings, ...items),
            template.prototype);
    }

    return Object.defineProperty(template, 'prototype', {
        value: Object.create(Function.prototype, {
            constructor: { value: template },
            isPrototypeOf: { value: Object.prototype.isPrototypeOf },
            if: { value(cond, delimiter = ' ', callback) {
                if (typeof this !== 'function')
                    throw TypeError('this must be callable.');
    
                if (typeof delimiter === 'function') {
                    callback = delimiter;
                    delimiter = ' ';
                }
    
                const reduce = nextReducer =>
                    cond ? Object.setPrototypeOf(
                        insert =>
                            this(insert) + delimiter + nextReducer(insert),
                        template.prototype
                    ) : this;
    
                return typeof callback === 'function' ?
                    reduce(callback) :
                    (...args) => reduce(bareTemplate(...args));
            } }
        })
    });
});
