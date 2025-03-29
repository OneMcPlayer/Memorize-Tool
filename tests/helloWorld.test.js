const helloWorld = require('../src/helloWorld');
test('hello world!', () => {
	expect(helloWorld()).toBe('Hello, World!');
});