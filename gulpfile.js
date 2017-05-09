var elixir = require("laravel-elixir");

elixir(function(mix) {
    // Copies
    mix.copy("./node_modules/animate.css/animate.min.css", "css/animate.css");

    // SASS
    mix.sass("./resources/sass/app.scss", "./css/app.css");
    mix.sass("./resources/sass/editor.scss", "./css/editor.css");
    mix.sass("./resources/sass/homepage.scss", "./css/homepage.css");

    // Controllers
    mix.webpack("./resources/js/app.js", "./js/app.js");
    mix.webpack("./resources/js/editor/editor.js", "./js/editor.js");
});
