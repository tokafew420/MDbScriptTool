# CefSharpWinFormTemplate #

Starter Template for WinForm Application using CefSharp

## Summary ##

If you're a full time developer (on Windows) like me then you're probably use to writing scripts, batch files, or simple executables to get a simple task done. And you've been frustrated with the crap that you have to work with. (Yes I'm looking at you *.bat files and WinForms.)

Well if you have any front end development experience then maybe the answer lies in [CefSharp](https://github.com/cefsharp/CefSharp). Ok, wait.... I know what you're thinking. "Not another framework!" ME TOO. All I want, is to run some .NET code with nice looking UI. Is that too much to ask?

This project is a starter template used to build a .NET executable with a "Chrome browser" like UI. You use `html`, `css`, and `javascript` for the UI and .NET for the "backend" stuff (i.e. connecting MS SQLServer).

## Interop ##

CefSharp is nice, but I don't need all of that. This template uses an event driven model for simplicity. There are only 2 classes that aid in this effort.

- `ScriptEvent` - When the UI (browser) side needs to tell the managed (.NET) side something, it simply emits an event with the appropriate data (if any).
- `SystemEvent` - And, vice versa, if the managed side wants to tell the UI side something, it can emit it's own event.

This keeps both side nicely separated so you can concentrate on writing you mini app in record time.

## Examples ##

On the browser side:
```javascript
// Send a message to the managed (.NET) code
scriptEvent.emit("test", 'bob');

// Listen for the response
systemEvent.on('test-reply', function (reply) {
    console.log(reply);
});
```

On the managed side:
```cs
// Inside the App.cs file, _scriptEvent is an instance of ScriptEvent
// and _systemEvent is an instance of SystemEvent

// Listen for the "test" event
_scriptEvent.On("test", (args) => {
    var tmp = args as object[];

    _systemEvent.Emit("test-repy", "Hello " + tmp[0]);
});
```

## Misc ##

This template has [Bootstrap 4](https://github.com/twbs/bootstrap/tree/v4-dev) and [JQuery 3.3.x](https://github.com/jquery/jquery) preloaded. Feel free to use whatever front end frameworks you want.

## References ##

- [Using HTML as UI Elements in a WinForms Application with Chrome / Chromium Embedded Framework (CEF)](https://www.codeproject.com/Articles/990346/Using-HTML-as-UI-Elements-in-a-WinForms-Applicatio)
- [Display HTML in WPF and CefSharp Tutorial Part 1](https://www.codeproject.com/Articles/881315/Display-HTML-in-WPF-and-CefSharp-Tutorial-Part)
- [Example from CefSarp GitHub repo](https://github.com/cefsharp/CefSharp)
