const tmi = require('tmi.js');

exports.run = () => {

    const opts = {
        connection: {
            reconnect: true
        },
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
        const commandName = msg.trim().toLowerCase();
        console.log(target);
        console.log(context);
        console.log(msg);
        console.log('');
        // If the command is known, let's execute it
        if (commandName === '!bo') {
            var now = Date.now();
            if (nbBo != 0 && now - lastBo < 20000) {
                ++nbBo;
                lastBo = now;
                if (nbBo == maxBo) {
                    twitchBot.say(target, "/marker");
                    twitchBot.say(target, "/me Un best of a été enregistré");
                }
            } else {
                nbBo = 1;
                lastBo = now;
                twitchBot.say(target, `Est-ce-que ce moment doit resté gravé à tout jamais ? Si tu penses que oui, utilises !bo (${maxBo} commandes sont nécessaires)`);
            }
        }
        
    });

    

    twitchBot.on("subscription", (channel, username, method, message, userstate) => {
        console.log("Subscription");
        console.log(method);
        console.log(userstate);

        twitchBot.say(channel, `Merci beaucoup ${username} pour le sub !! Et bienvenue à toi !! elviSub elviSub elviSub`);
    });

    twitchBot.on("resub", (channel, username, months, message, userstate, methods) => {
        console.log("Resub");
        console.log(userstate);
        console.log(methods);

        let msg = "";
        if (months >= 1) twitchBot.say(channel, `Merci beaucoup ${username} d'avoir resub !! ${months} mois à la suite !! Tu gères elviSub elviSub elviSub`);
        else twitchBot.say(channel, `Merci beaucoup ${username} pour le resub !! elviSub elviSub elviSub`);
    });

    twitchBot.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        console.log("Gift");
        console.log(userstate);
        console.log(methods);
        twitchBot.say(channel, `Merci beaucoup ${username} d'avoir offert un sub à ${recipient} !! elviSub elviSub elviSub`);
    });

    twitchBot.on("timeout", (channel, username, reason, duration, userstate) => {
        console.log("TO");
        console.log(userstate);
        if (duration != 0)
            twitchBot.say(channel, `Bye bye ${username} elviHey Tu pourras reparler dans ${duration} secondes.`)
    });

    twitchBot.on("raided", (channel, username, viewers) => {
        console.log("RAID");
        twitchBot.say(channel, `${viewers} futurs subs potentiels viennent d'arriver via ${username} ! elviHey elviHey`)
    });

    twitchBot.on("ban", (channel, username, reason, userstate) => {
        console.log("BAN");
        console.log(userstate);
        twitchBot.say(channel, `${username}, la tribu réunifiée a décidé de vous éliminer, et leur sentence est irrévocable.`);
    });

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
    });

    // Connect to Twitch:
    twitchBot.connect();
}