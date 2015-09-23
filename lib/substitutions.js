"use strict";

// Ordered
var substitutionPairs = [];

function add(slack, matrix) {
    substitutionPairs.push({
        slack: slack,
        matrix: matrix
    });
}

// slack -> matrix substitutions are performed top -> bottom
// matrix -> slack substitutions are performed bottom -> top
//
// The ordering here matters because some characters are present in both the
// "old" and "new" patterns, and we may end up over- or under-escaping things,
// or in an escaping loop, if things aren't properly ordered.
add("&lt;", "<");
add("&gt;", ">");
add("&amp;", "&"); // &amp; must be after all replacements involving &s.

function replaceAll(string, old, replacement) {
    return string.split(old).join(replacement);
}

/**
 * Performs any escaping, unescaping, or substituting required to make the text
 * of a Slack message appear like the text of a Matrix message.
 *
 * @param {string} string the text, in Slack's format.
 */
var slackToMatrix = function(string) {
    for (var i = 0; i < substitutionPairs.length; ++i) {
        var pair = substitutionPairs[i];
        string = replaceAll(string, pair.slack, pair.matrix);
    }
    return string;
};

/**
 * Performs any escaping, unescaping, or substituting required to make the text
 * of a Matrix message appear like the text of a Slack message.
 *
 * @param {MatrixEvent} event the Matrix event.
 * @return An object which can be posted as JSON to the Slack API.
 */
var matrixToSlack = function(event, homeserver) {
    var string = event.content.body;
    for (var i = substitutionPairs.length - 1; i >= 0; --i) {
        var pair = substitutionPairs[i];
        string = replaceAll(string, pair.matrix, pair.slack);
    }
    var ret = {
        username: event.user_id,
        text: string
    }
    if (event.content.msgtype == "m.image" && event.content.url.indexOf("mxc://") === 0) {
        var url = homeserver.url + "/_matrix/media/v1/download/" +
            event.content.url.substring("mxc://".length);
        delete ret.text;
        ret.attachments = [{
            fallback: string,
            image_url: url
        }];
    }

    return ret;
};

module.exports = {
    matrixToSlack: matrixToSlack,
    slackToMatrix: slackToMatrix
};