"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Replier = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
class Replier {
    constructor(requestData) {
        const config = this.getConfig();
        this.botUrl = config["bot_endpoint"] + "/reply";
        this.json = requestData["json"];
        this.room = String(this.json["chat_id"]);
        this.queue = [];
        this.lastSentTime = Date.now();
    }
    getConfig() {
        return require('../../config');
    }
    sendHttpRequest(type, data, room) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = {
                type,
                room,
                data
            };
            const headers = { 'Content-Type': 'application/json' };
            try {
                const response = yield axios_1.default.post(this.botUrl, payload, { headers });
                console.log(`HTTP request successful for room ${room}, type ${type}`);
            }
            catch (error) {
                console.error(`HTTP request failed for room ${room}, type ${type}: ${error}`);
            }
        });
    }
    reply(msg, room = null) {
        if (!room) {
            room = this.room;
        }
        this.queueMessage('text', String(msg), String(room));
    }
    replyImageFromFile(room, filepath) {
        fs_1.default.readFile(filepath, (err, data) => {
            if (err) {
                console.error(`Error reading image file: ${err}`);
                return;
            }
            this.replyImageFromImage(room, data);
        });
    }
    replyImageFromImage(room, img) {
        const base64String = img.toString('base64');
        if (!room) {
            room = this.room;
        }
        this.queueMessage('image', base64String, String(room));
    }
    queueMessage(type, data, room) {
        this.queue.push([type, data, room]);
        if (this.queue.length === 1) {
            this.sendMessage();
        }
    }
    sendMessage() {
        const nextMessage = this.queue[0];
        const currentTime = Date.now();
        if (currentTime - this.lastSentTime >= 100) {
            const [msgType, msgData, msgRoom] = nextMessage;
            this.sendHttpRequest(msgType, msgData, msgRoom);
            this.queue.shift();
            this.lastSentTime = currentTime;
        }
        if (this.queue.length > 0) {
            setTimeout(() => this.sendMessage(), 100);
        }
    }
}
exports.Replier = Replier;
