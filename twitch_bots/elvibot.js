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
        /*
        console.log(target);
        console.log(context);
        console.log(msg);
        console.log('');
        */
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

        twitchBot.say(channel, `Merci beaucoup à ${username} de s'être abonné !! Et bienvenue à toi !! elviSub elviSub elviSub`);
    });

    twitchBot.on("resub", (channel, username, months, message, userstate, methods) => {
        console.log("Resub");
        console.log(methods);

        let msg = "";
        if (months >= 1) msg = `${months} mois à la suite !! Tu gères ;) `;

        twitchBot.say(channel, `Merci beaucoup à ${username} d'avoir continué de s'abonner !! ${msg}elviSub elviSub elviSub`);
    });

    twitchBot.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
        console.log("Gift");
        console.log(methods);
        twitchBot.say(channel, `Merci beaucoup à ${username} d'avoir fourni un abonnement à ${recipient} !! elviSub elviSub elviSub`);
    });

    twitchBot.on("timeout", (channel, username, reason, duration, userstate) => {
        console.log("TO");
        if (duration != 0)
            twitchBot.say(channel, `Bye bye ${username} elviHey On te rend la parole dans ${duration} secondes`)
    });

    twitchBot.on("raided", (channel, username, viewers) => {
        console.log("RAID");
        twitchBot.say(channel, `${viewers} futurs abonnés potentiels viennent d'arriver de la part de ${username} ! elviHey elviHey`)
    });

    twitchBot.on("ban", (channel, username, reason, userstate) => {
        console.log("BAN");w
        twitchBot.say(channel, `${username}, la tribue réunifiée a décidé à l'unanimité de vous éliminer, et leur sentance est irrévocable.`);
    });

    twitchBot.on("giftpaidupgrade", (channel, username, sender, userstate) => {
        twitchBot.say(channel, `Il semblerait que le sub offert par ${sender} ait plu à ${username} ! C'est pourquoi il a décidé de continuer son abonnement !! elviSub elviSub elviSub`);
    });

    twitchBot.on("anongiftpaidupgrade", (channel, username, userstate) => {
        twitchBot.say(channel, `Il semblerait que le sub offert par un utilisateur anonyme ait plu à ${username} ! C'est pourquoi il a décidé de continuer son abonnement !! elviSub elviSub elviSub`);
    });

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
    });

    // Connect to Twitch:
    twitchBot.connect();
}