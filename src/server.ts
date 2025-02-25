const express = require('express');
import { Request, Response } from 'express';
import { KakaoDB } from './helper/KakaoDB';
import { Replier } from './helper/Replier';
import { response } from './chatbot/Response';

const app = express();
const db = new KakaoDB();

app.use(express.json());

app.post('/db', (req: Request, res: Response) => {
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

        const replier = new Replier(requestData);

        res.on('finish', () => {
            response(
                requestData.room,
                requestData.msg,
                requestData.sender,
                replier,
                requestData.json,
                db
            );
        });

        res.status(200).send('200');
    } catch (e: any) {
        console.error(`Error processing JSON request: ${e}`);
        return res.status(400).json({ error: 'Failed to process JSON data', details: e.message });
    }
});

app.listen(5000, '0.0.0.0', () => {
    console.log('[#] IrisNode started!');
});