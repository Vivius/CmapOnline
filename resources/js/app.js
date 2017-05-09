import $ from 'jquery';
$(document).ready(function() {
    $("#new").click(function() {
        console.log("tokokfzokf");
        var h = $("body").height() + 'px';
        $("#black_overlay").css({"height":h,"visibility":"visible"});
        $(".added").css('display','block');
    });

    $(".close").click(function() {
        $(".added").css('display','none');
        $("#black_overlay").css("visibility","hidden");
    });
});