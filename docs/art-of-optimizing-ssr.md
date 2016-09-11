# The Art of Optimizing React SSR Performance

React Server Side Rendering (SSR) enable seamless isomorphic webapps, but SSR is synchronous and CPU bound, so optimizing SSR for isomorphic React app is essential to improving your server's response time.

There are two chief things you can do to improve your SSR performance: refactoring your component code or component caching.

If you know your component code well, then you can pick the low hanging fruits and optimize the obvious components.  After that, it may become harder to find components to improve, either for refactoring or caching.

Either way, the next step is to do some detail profiling to find which one to optimize first.

## Setup
 
To be able to quickly analyze and test your components, it's best to setup some static data that you can use to run the SSR instantly.

To prepare the data, it's best if you can get real data or craft some sample data that exercise the most parts of you component.

You can pass your sample data into your component directly, or setup your data model depending on which one you use.

For example, to pass your data into the component directly as props:

```js
const props = {
    // comprehensive sample data
};
renderToString(<MyComponent {...props} />);
```

If you have async data for your props and you use a resolver or if you use Redux to setup the data, you can manually initialize the data before you render.

For example, if you use Redux, here is a rough outline, but depending on your specific setup, you may have to create store with middleware etc.

```js
// imports for renderToString, createStore, Provider, MyComponent, etc

function initializeStore(data) {
    const store = createStore();
    return Promise.resolve((dispatch) => dispatch(data)).then( () => store );
}

const data = {
    // comprehensive sample data to initialize redux store
};

initializeStore(data)
    .then( (store) => renderToString(<Provider store={store}><MyComponent /></Provider>));
```

## Profiling

After you've written profiling code to manually render your component with static data, you can run the rendering quickly as many times as you like.

The first thing you want to do now is run profiling for a single rendering pass to find how long each individual component take.

Here is an example to use electrode-react-ssr-caching to profile a component using Redux:

```js
const data = {
    // sample data to initialize redux store
};

// First prime the JS engine
const renderComponent = () => {
    return initializeStore(data)
        .then( (store) => renderToString(<Provider store={store}><MyComponent /></Provider>));
}

let promise = renderComponent();

for( let i = 0; i < 10; i ++ ) {
    promise = promise.then( renderComponent );
}

// Now profile and save the data for a single rendering pass

promise.then( () => {
    SSRCaching.enableProfiling();
    SSRCaching.clearProfileData();
    return renderComponent()
        .then( () => {
            console.log( SSRCaching.data, null, 2 );
        });
});
```

> You should save the profile data to a file rather than log it to the console.

## Identifying

Once you get the JSON data with timing on your components, you can identify what's happening and which components are the most expensive to render.

Here is a simple example of how the profiling data might look like in YAML format.

> If you are using Redux you would see Redux's helper components such as `Connect` or `Provider`

```yaml
---
  Board:
    -
      time: 3.652683
      Heading:
        -
          time: 0.379035
      InfoCard:
        -
          time: 1.492614
          Hello:
            -
              time: 0.230108
        -
          time: 0.30988
          Hello:
            -
              time: 0.095122
        -
          time: 0.50647
          Hello:
            -
              time: 0.162786
```

The time is in milliseconds.  As you can see from the above data, here is what it means:

   - Component `Board` took `3.652683ms` to render and it contain children `Heading` and `InfoCard`
   - `Heading` took `0.379035ms` to render
   - There are 3 instances of `InfoCard`, each one took slightly different time to render and has `Hello` as child.

> I didn't prime the JS engine when I collected the above data so you can see the first `InfoCard` instance took the longest to render.

## Testing

## Inspecting


