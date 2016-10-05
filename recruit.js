$(document).ready(function() {
    var apiKey, opening;
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
        var $info =  $(".job-application-modal .sidebar");
        var names = $info.find("h2").text().split(" ");
        if (names.length == 1) {
            names.push("");
        }

        addToForm(form, "candidate_first_name", names.shift());
        addToForm(form, "candidate_last_name", names.join(" "));
        addToForm(form, "cover_letter", $(".application").text());

        var email = $info.find("a[href^=\"mailto:\"]").attr('href').substring(7);
        if(validateEmail(email)) {
            addToForm(form, "candidate_email", email);
        }

        var url = $info.find("a[href*=\"linkedin\"]").attr("href");
        if(validateURL(url)) {
            addToForm(form, "linkedin_profile", url);
        }

        var url = $info.find("a[href*=\"github\"]").attr("href");
        if(validateURL(url)) {
            addToForm(form, "github_profile", url);
        }


        var url = $info.find(".fa-book + a").attr("href");
        if(validateURL(url)) {
            addToForm(form, "website_blog_portfolio", url);
        }
        console.log(form.fields);

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
                    $("#webpro-contacted input[type=submit]").click();
                }
            }
        );
    }

    function addToForm(form, key, value) {
        form.fields.push(
            { "key": key, "value": value }
        );
    }

    function validateURL(value) {
        var re = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
        return re.test(value);
    }

    function validateEmail(value) {
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(value);
    }

    console.log("Auto-recruit: API Key:", localStorage["apiKey"]);
    console.log("Auto-recruit: Clear API Key from console with: delete localStorage['apiKey']");
    console.log("Auto-recruit: Loaded");
    $(document).on("click", "#autorecruit-add", sendToRecruiterBox);
});


var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
var list = document.querySelector('body');

var observer = new MutationObserver(function(mutations) {
    console.log(mutations);
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        var $buttons = $(".buttons");
        if( $("#autorecruit-add").length == 0 ) {
            var $btn = $("<a id=autorecruit-add>").addClass("btn small teal").html("+ RecruiterBox").css({marginBottom: "8px"});
            $buttons.append($("<div>").append($btn));
        }
      }
  });
});

observer.observe(list, {
    // attributes: true,
    childList: true,
    // characterData: true
});
