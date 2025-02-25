"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const KakaoDB_1 = require("./helper/KakaoDB");
const Replier_1 = require("./helper/Replier");
const Response_1 = require("./chatbot/Response");
const app = express();
const db = new KakaoDB_1.KakaoDB();
app.use(express.json());
app.post('/db', (req, res) => {
    try {
        const requestData = req.body;
        if (!requestData) {
            return res.status(400).json({ error: 'No JSON data received' });
        }
        const requiredKeys = ['room', 'msg', 'sender', 'json'];
        const missingKeys = requiredKeys.filter(key => !(key in requestData));
        if (missingKeys.length > 0) {
            return res.status(400).json({ error: `Missing required keys: ${missingKeys}` });
        }
        const replier = new Replier_1.Replier(requestData);
        res.on('finish', () => {
            (0, Response_1.response)(requestData.room, requestData.msg, requestData.sender, replier, requestData.json, db);
        });
        res.status(200).send('200');
    }
    catch (e) {
        console.error(`Error processing JSON request: ${e}`);
        return res.status(400).json({ error: 'Failed to process JSON data', details: e.message });
    }
});
app.listen(5000, '0.0.0.0', () => {
    console.log('[#] IrisNode started!');
});
