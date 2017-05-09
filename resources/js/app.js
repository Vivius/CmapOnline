import $ from 'jquery';
$(document).ready(function() {
    $("#new").click(function() {
        var h = $("body").height() + 'px';
        $("#black_overlay").css({"height":h,"visibility":"visible"});
        $(".added").css('display','block');
        $(".added").css('visibility','visible');
    });

    $(".close").click(function() {
        $(".added").css('display','none');
        $("#black_overlay").css("visibility","hidden");
    });
});