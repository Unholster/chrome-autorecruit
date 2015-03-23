$(document).ready(function() {
    var apiKey, opening,
    var  REGEXES = {
        "www.getonbrd.cl": "(//.*/jobs/[^/]+)"
    };

    function sendToRecruiterBox() {
        var apiKey;
        try {
            needApiKey();
            needOpening(applyForOpening);
        } catch(err) {
            console.log("Auto-recruit:", err);
            return;
        }
    }

    function needApiKey() {
        apiKey = localStorage.apiKey;
        if (typeof apiKey === "undefined" || apiKey === null) {
            apiKey = prompt("RecruiterBox API KEY");
            if (typeof apiKey === "undefined" || apiKey === null) {
                throw "API key not provided";
            }
            localStorage.apiKey = apiKey;
            console.log("Auto-recruit: Set API Key:", apiKey);
        }
    }

    function needOpening(callback) {
        var postingRegex, postingMatches, postingToOpenings, postingUrl;
        postingToOpenings = localStorage.postingToOpenings;
        if (typeof postingToOpenings === "undefined" || postingToOpenings === null) {
            postingToOpenings = {};
            localStorage.postingToOpenings = JSON.stringify(postingToOpenings);
        } else {
            postingToOpenings = JSON.parse(postingToOpenings);
        }

        postingRegex = new RegExp(REGEXES[window.location.hostname]);
        postingMatches = postingRegex.exec(window.location);
        if(postingMatches) {
            postingUrl = postingMatches[1];
        } else {
            console.log("Auto-recruit: Url does not look like a valid posting url", window.location);
            return;
        }

        opening = postingToOpenings[postingUrl];
        if (typeof opening === "undefined" || opening === null) {
            promptOpenings(function (opening) {
                if (typeof opening === "undefined" || opening === null) {
                    throw "Opening not provided";
                }
                postingToOpenings[postingUrl] = opening;
                localStorage.postingToOpenings = JSON.stringify(postingToOpenings);
                callback(opening);
            });
        } else {
            callback(opening);
        }
    }

    function promptOpenings(callback) {
        $.ajax(
            "https://api.recruiterbox.com/v1/openings",
            {
                headers: {
                    "Authorization": "Basic " + btoa(apiKey + ":")
                },
                error: function(xhr, status, error) { 
                    console.error("Auto-recruit: Opening listing failed");
                    console.log(status, error);
                },
                success: function(data, status, xhr) {
                    var $options = $("<div>");
                    $.each(data.objects, function(idx, item){
                        var $opt = $("<a href=# data-dismiss=modal >").html(item.title).on("click", function() {
                            callback(item);
                        });
                        $options.append($opt, "<br/>");
                    });
                    bootbox.dialog({
                        title: "Please choose a RecruiterBox Opening for this Job Board posting",
                        message: $options[0]
                    });
                }
            }
            );
    }

    function applyForOpening(opening) {
        console.log("Applying to opening", opening.title);
        var form = { fields: [], source: window.location.hostname};
        var $info =  $(".webpro_info .col-right");
        var names = $info.find("h3 > strong").text().split(" ");
        if (names.length == 1) {
            names.push("");
        }

        addToForm(form, "candidate_first_name", names.shift());
        addToForm(form, "candidate_last_name", names.join(" "));
        addToForm(form, "candidate_email", $info.find("a[href^=\"mailto:\"]").text());
        addToForm(form, "cover_letter", $(".application").text());
        $.ajax(
            "https://api.recruiterbox.com/v1/openings/"+opening.id+"/apply",
            {
                type: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(apiKey + ":")
                },
                contentType: "application/json",
                data: JSON.stringify(form),
                error: function(xhr, status, error) { 
                    console.error("Auto-recruit: Application failed");
                    console.log(status, error);
                },
                success: function(data, status, xhr) {
                    console.log("Auto-recruit: Application succeeded");
                    $("#autorecruit-add").html("Applied").removeClass("teal").off("click");
                }
            }
        );
    }

    function addToForm(form, key, value) {
        form.fields.push(
            { "key": key, "value": value }
        );
    }

    console.log("Auto-recruit: API Key:", localStorage["apiKey"]);
    console.log("Auto-recruit: Clear API Key from console with: delete localStorage['apiKey']");
    var $btn = $("<a id=autorecruit-add>").addClass("btn small teal").html("+ RecruiterBox").css({marginBottom: "8px"});
    $btn.on("click", sendToRecruiterBox);
    $("#webpro-contacted").before($btn);
    console.log("Auto-recruit: Loaded");
});