"use strict";
exports.response = function response(room, msg, sender, replier, msgJson, db) {
    if (msg === "!hi") {
        replier.reply("hello");
    }
}