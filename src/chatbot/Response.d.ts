import type { Replier } from '../helper/Replier';
import type { KakaoDB } from '../helper/KakaoDB';

export declare function response(
    room: string,
    msg: string,
    sender: string,
    replier: Replier,
    msgJson: any,
    db: KakaoDB
): void;