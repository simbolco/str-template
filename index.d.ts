/**
 * @file Provides type information pertaining to the string template compiler
 *       and its utilities.
 * @author Simon Struthers
 * @copyright The Simon Bolivar Company 2023
 * @license MPL-2.0
 * @version 1.0
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Items that can be interpolated by the `template` function that aren't
 * template functions.
 */
type TemplateItem = string | number | object;

/** A generic string template function. */
export type TemplateFunction<
    S extends (string | number)[],
    T = unknown
> = (insert: Partial<Record<S[number], T>>) => string;

/** A string template function compiled using the `template` tag function. */
export type Template<
    S extends (string | number)[] = (string | number)[]
> = {
    (insert: Partial<Record<S[number], unknown>>): string;

    readonly constructor: TemplateConstructor;

    if: {
        /**
         * Conditionally append another template to the end of this template.
         * 
         * @param condition Whether to include the provided template.
         * @param template  (optional) A template function to provide in place
         *                  of a tagged string literal.
         */
        <T extends (string | number)[]>(
            condition: boolean,
            template: TemplateFunction<T>
        ): Template<(S[number] | T[number])[]>;

        /**
         * Conditionally append another template to the end of this template.
         * 
         * @param condition Whether to include the provided template.
         * @param delimiter (optional) A string to insert between this template
         *                  and the provided one.
         * @param template  (optional) A template function to provide in place
         *                  of a tagged string literal.
         */
        <T extends (string | number)[]>(
            condition: boolean,
            delimiter: string,
            template: TemplateFunction<T>
        ): Template<(S[number] | T[number])[]>;

        /**
         * Conditionally append another template to the end of this template.
         * 
         * @param condition Whether to compile and include the following
         *                  template literal.
         * @param delimiter (optional) A string to prefix the following template
         *                  literal with if `condition` is true.
         */
        (condition: boolean, delimiter?: string):
            <T extends (string | number | object)[]>(
                template: TemplateStringsArray,
                ...items: T
            ) => Template<S & Exclude<T[number], object>>;
    };
};

/**
 * Creates a new string template function.
 * 
 * @param template The template array of string parts for the template to
 *                 use to construct a string.
 * @param items A set of keys, object wrappers, and templates to include.
 *              Nested templates are evaluated at the same time as the
 *              template returned from this function is evaluated. Object
 *              wrappers provide a means to provide literals or other
 *              external variables into the template function via their
 *              `toString` method.
 * 
 * @returns A compiled string template.
 */
function template<S extends (
    TemplateItem | TemplateFunction<Exclude<S[number], object>[]>
)[]>(
    template: TemplateStringsArray,
    ...items: S
): Template<Exclude<S[number], object>[]>;
namespace template {
    export declare const prototype: Template;
}

export default template;
