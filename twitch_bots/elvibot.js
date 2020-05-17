const tmi = require('tmi.js');

exports.run = () => {

    const opts = {
        identity: {
            username: process.env.BOT_USERNAME,
            password: process.env.OAUTH_TOKEN
        },
        channels: [
            process.env.CHANNEL_NAME
        ]
    };

    const twitchBot = new tmi.client(opts);

    var nbBo = 0;
    var lastBo = new Date();
    var maxBo = 5;

    // Register our event handlers (defined below)
    twitchBot.on('message', (target, context, msg, self) => {
        if (self) return;

        // Remove whitespace from chat message
        const commandName = msg.trim();
        console.log(target);
        console.log(context);
        console.log(msg);

        // If the command is known, let's execute it

        if (commandName === '!bo') {
            var now = Date.now();
            if (nbBo != 0 && now - lastBo < 20000) {
                ++nbBo;
                lastBo = now;
                if (nbBo == maxBo) {
                    twitchBot.say(target, "Un best of a été enregistré");
                }
                console.log("bo reçu");
            } else {
                nbBo = 1;
                lastBo = now;
                twitchBot
                twitchBot.say(target, `Est-ce-que ce moment doit resté gravé à tout jamais ? Si tu penses que oui, utilises !bo (1/${maxBo} commandes sont nécessaires)`);
                console.log("Message envoyé");
            }
        }
    });

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
    });

    // Connect to Twitch:
    twitchBot.connect();

}