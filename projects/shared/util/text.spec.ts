import { InternalError } from '@INIT__PATH_ALIAS/shared/util/error'
import * as text from '@INIT__PATH_ALIAS/shared/util/text'

describe(text.toConstCase, () => {
  test('camel case input', () => expect(text.toConstCase('helloWorld')).toBe('HELLO_WORLD'))
  test('pascal case input', () => expect(text.toConstCase('HelloWorld')).toBe('HELLO_WORLD'))
  test('const case input', () => expect(text.toConstCase('HELLO_WORLD')).toBe('HELLO_WORLD'))
  test('interface case input', () => expect(text.toConstCase('IHelloWorld')).toBe('IHELLO_WORLD'))
  test('multiple words throws error', () => expect(() => text.toConstCase('hello world')).toThrowError(InternalError))
})

describe(text.toCamelCase, () => {
  test('camel case input', () => expect(text.toCamelCase('helloWorld')).toBe('helloWorld'))
  test('pascal case input', () => expect(text.toCamelCase('HelloWorld')).toBe('helloWorld'))
  test('const case input', () => expect(text.toCamelCase('HELLO_WORLD')).toBe('helloWorld'))
  test('multiple words throws error', () => expect(() => text.toCamelCase('hello world')).toThrowError(InternalError))
})

describe(text.toParamCase, () => {
  test('multiple words input', () => expect(text.toParamCase('hello world')).toBe('hello_world'))
  test('camel case input', () => expect(text.toParamCase('helloWorld')).toBe('hello_world'))
  test('single word input', () => expect(text.toParamCase('helloworld')).toBe('helloworld'))
  test('param case input', () => expect(text.toParamCase('hello_world')).toBe('hello_world'))
})
