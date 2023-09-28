# String Template Library
A simple ECMAScript >=2015 library which provides a utility for compiling string
template literals into functions. TypeScript support is provided out of the box.

This library is web, CommonJS, and RequireJS compatible. In web browsers, the
global variable `template` contains this library's sole non-type export.

The code which this library consists of is licensed under the [Mozilla Public
License version 2.0](http://mozilla.org/MPL/2.0/). This means that this code can
be reused and integrated into other projects so long as the following conditions
are satisfied:

1. The source code pertaining to this library must be publically accessible and
   available when distributed.
2. A copy of the license and copyright notice must be included with the library.
3. Any modifications to this library must be released under the Mozilla Public
   License version 2.0 or a sufficiently similar license when distributing it.

## Basic Usage
A singular default export is provided by this library: the `template` tag
function, which is used to compile string templates into template functions:

```js
import template from '@simbolco/str-template';

const t1 = template`hello ${0} world`;
t1([1]); //> "hello 1 world"

const t2 = template`This is a ${'event'} from ${'provider'}`;
t2({
	event: 'test',
	provider: 'Speakonia'
}); //> "This is a test from Speakonia"
```

Values which evaluate to `undefined` or `null` are interpolated as empty
strings.

```js
t1([null]); //> "hello  world"
t2({ event: 'thing' }); //> "This is a thing from "
```

## Advanced Usage
String template functions compiled from the `template` function are instances
of the `Template` type, which are both callable and allow for helper methods to
be provided for convenience. As of the time of writing, only one helper method
is provided.

```ts
type Template<S extends (string | number)[]> = {
	(insert: Partial<Record<S[number], unknown>>): string;

	if<T extends (string | number)[]>(
        condition: boolean,
        template: TemplateFunction<T>
    ): Template<(S[number] | T[number])[]>;
    if<T extends (string | number)[]>(
        condition: boolean,
        delimiter: string,
        template: TemplateFunction<T>
    ): Template<(S[number] | T[number])[]>;
    if(condition: boolean, delimiter?: string):
        <T extends (string | number | object)[]>(
            template: TemplateStringsArray,
            ...items: T
        ) => Template<S & Exclude<T[number], object>>;
    };
};
```

### Conditional template fragments
The `if` template method allows one to conditionally concatenate another
template to the end of an existing one. This is not an in-place operation; the
original template function is unmodified.

An optional separating string can be passed in, which is a single space by
default.

```js
const t3 = template`ABC`.if(cond)`123` // if cond, t3() => 'ABC 123'
								       // if not cond, t3() => 'ABC'
```

One can pass a template function to the `if` method in place of providing an
inline literal:

```js
const t4 = template`456`,
      t5 = template`DEF`.if(cond, t4) // if cond, t5() => 'DEF 456'
                                      // if not cond, t5() => 'DEF'
```

### Template concatenation
The `if` method allows for conditional concatenation of another template to the
end of an existing one. There is, however, another method which can be used to
insert another template function within a new one.

In addition to string and numeric indices, `template` also allows one to
"interpolate" template functions directly without issue:

```js
const t6 = template`Hello ${'adjective'} world!`,
	  t7 = template`And the programmer exstatically proclaimed, "${t6}"`;

t6({ adjective: 'shiny' });
//> 'And the programmer exstatically proclaimed, "Hello shiny world!"'
```

Any functions interpolated into the compiled template are not required to have
been compiled via the `template` function. All that is required is that these
callbacks process the first parameter, which corresponds to a context object or
array, and returns a string or value which can be coerced to a string. In
TypeScript, this looser contract is specified via the exported
`TemplateFunction` type:

```ts
type TemplateFunction<S extends (string | number)[], T = unknown> =
	(insert: Partial<Record<S[number], T>>) => string;
```

### Value substitution
**Key substitution** is the primary mechanism from which template functions
operate; string and number keys are interpolated to their corresponding values
in a context parameter provided by the caller of the compiled template.

However, there are instances in which one or more programmatic values must be
interpolated literally -- as is common with untagged ES6 string interpolation --
in addition to parameters provided by a latter caller. To accomplish this means,
the `template` function also supports **value substitution**, albeit in a
roundabout way. Because strings and numbers are already reserved for key
substituion, object wrappers are instead used for this purpose. Thankfully,
JavaScript already provides the `Object` constructor and function as an easy
means of wrapping any JavaScript value to its corresponding object type:

```ts
template`1 + 2 = ${Object(1 + 2)}`() //> "1 + 2 = 3"
```

### Example
Here, we are creating an object descriptor for an SQLite text column. Given a
set of parameters (henceforth referred to as "options"), an appropriate and
minimally sized [CHECK constraint](
https://www.sqlite.org/lang_createtable.html#check_constraints) must be created.
Because the name of the column is not known to the function (the returned
descriptor could be reused for multiple column definitions, after all), a string
template is made use of to provide this name via the parameter corresponding to
key "`0`" (i.e. the first item of an array). Because the options provided by the
caller literally define the constraints of the column, when appropriate they
must be wrapped and substitued by value.

```js
// create an object descriptor for an SQL text column
// signatures:
//   - (maxLength: number, match?: RegExp, not?: RegExp) => TextDescriptor
//   - (match: RegExp, not?: RegExp) => TextDescriptor
//	 - ({
//       maxLength?: number;
//       default?: string;
//       nullable?: boolean;
//       unique?: boolean;
//       match?: RegExp;
//       not?: RegExp;
//	   }) => TextDescriptor
function Text(options, match, not) {
	// converts JS RegExp to SQL string wrapped in an Object
	function regexpToSlot(regexp) {
		return Object(`'${(x =>
            x.slice(1, x.lastIndexOf('/'))
        )(`${regexp}`).replaceAll("'", "''")}'`);
	}

	let maxLength, defaultValue, nullable, unique;
	
	if (typeof options == 'number') {
		maxLength = options;
	} else if (options instanceof RegExp) {
		not = match;
		match = options;
	} else {
		maxLength = options.maxLength;
		defaultValue = options.default;
		match = options.match;
		not = options.not;
		nullable = options.nullable ?? false;
		unique = options.unique ?? false;
	}
	
	return {
		type: 'text',
		default: defaultValue,
		nullable,
		unique,
		check: (max || maxLength || not) ?
			template``.if(
				!!maxLength, ''
			)`length(${0}) <= ${Object(maxLength)}`.if(
				!!match, maxLength ? ' AND ' : ''
			)`${0} REGEXP ${regexpToSlot(match)}`.if(
				!!not, (maxLength || match) ? ' AND ' : ''
			)`${0} NOT REGEXP ${regexpToSlot(not)}`
			: void 0
	};
}

Text(/abcd/).check(['col1'])
//> 'col1 REGEXP "abcd"'

Text(32, void 0, /notallow/).check(['col2'])
//> 'length(col2) AND col2 NOT REGEXP "notallow"'
```

## Programming Interface

### `template`
A tag to apply to a tagged string literal to compile a string template.

#### Behavior
- If an interpolated value is a `function`, when the template is evaluated the
  function will be called with the context parameter as its first argument. The
  result of this callback is coerced to a string and inserted.
- Otherwise if the interpolated value is an `object`, the object is coerced into
  a string and inserted.
- Otherwise, the object is coerced into a property key. The value in the context
  object corresponding to this key is coerced into a string and inserted.

#### Returns
A function which takes a single context parameter and returns a string.

### `Template`
A type corresponding to a string template compiled using the `template`
function.

#### Parameters
- *insert* - A context parameter to provide values when evaluating the template.

#### Returns
A string.

#### Properties
##### `constructor`
Reference to the `template` function.

- **configurable**: false
- **enumerable**: false
- **writable**: false

##### `if`
Conditionally append another template to the end of this template.

###### Signatures
- (*condition*: **boolean**, *template*: **TemplateFunction**) =>
  **Template**
- (*condition*: **boolean**, *delimiter*?: **string**,
  *template*?: **TemplateFunction**) => <**TaggedStringFunction**> =>
  **Template**

###### Parameters
- *condition* - Whether to compile and include the following template.
- *delimiter* - (optional) A string to prefix the following template with if
  *condition* is true.
- *template* - (optional) A template function to provide in place of a tagged
  string literal.

###### Returns
If *template* is not provided, a tag function is returned. When that function,
or this one when provided with a *template* function, is called and *condition*
is truthy, compiles the succeeding interpolated string into a string template.
If *condition* is falsy, the succeeding interpolated string is ignored and the
`this` which called `Template.if` is returned instead.

###### Additional Notes
`Template.if` is a generic function. This means that it be called or applied
to functions which are not `Template` instances. It is intended for use by
`TemplateFunction`s.

### `TemplateFunction`
A type corresponding to a generic string template, interpolation, or
substitution function.

#### Parameters
- *insert* - A context parameter to provide values when evaluating the template.

#### Returns
A string.
