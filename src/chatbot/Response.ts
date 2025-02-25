import { Replier } from '../helper/Replier';
import { KakaoDB } from '../helper/KakaoDB';

type MsgJson = {
    chat_id: string;
    sender: string;
    msg: string;
};

export function response(
    room: string,
    msg: string,
    sender: string,
    replier: Replier,
    msgJson: MsgJson,
    db: KakaoDB
) {
    if (msg === "!hi") {
        replier.reply("hello");
    }
}