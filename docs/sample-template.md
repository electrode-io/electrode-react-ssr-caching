# example template for the template cache strategy:

```js
var props = {
  foo: {
    bar: {
      a: [0, 1, 2, 3, 4],
      b: "hello"
    }
  }
};

var template = {
  foo: {
    bar: {
      a: [`@'0"@`, `@'1"@`, `@'2"@`, `@'3"@`, `@'4"@`],
      b: `@'5"@`
    }
  }
};

var lookup = {
  "@0@": "foo.bar.a.0",
  "@1@": "foo.bar.a.1",
  "@2@": "foo.bar.a.2",
  "@3@": "foo.bar.a.3",
  "@4@": "foo.bar.a.4",
  "@5@": "foo.bar.b"
};
```

