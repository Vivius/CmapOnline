var elixir = require("laravel-elixir");

elixir(function(mix) {
    mix.copy("./node_modules/animate.css/animate.min.css", "css/animate.css");

    mix.sass("./resources/sass/app.scss", "./css/app.css");

    mix.webpack("./resources/js/app.js", "./js/app.js");
});
