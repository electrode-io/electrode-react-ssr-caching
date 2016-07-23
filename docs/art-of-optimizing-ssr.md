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

Here is an example to use electrode-react-ssr-profiler to profile a component using Redux:

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
    SSRProfiler.enableProfiling();
    SSRProfiler.clearProfileData();
    return renderComponent()
        .then( () => {
            console.log( SSRProfiler.data, null, 2 );
        });
});
```

## Identifying

- trying out

- inspecting

