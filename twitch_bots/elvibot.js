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

    const streamlabs = require('../modules/streamlabs.js');

    var nbBo = 0;
    var lastBo = new Date();
    var maxBo = 3;

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
        twitchBot.say(channel, `Merci beaucoup ${username} pour le sub !! Et bienvenue à toi !! elviSub elviSub elviSub`);
        console.log(`${username} s'est abonné avec un tier ${method.plan.charAt(0)} - Prime : ${method.prime}`);
    });

    twitchBot.on("resub", (channel, username, months, message, userstate, method) => {
        if (months >= 1) twitchBot.say(channel, `Merci beaucoup ${username} d'avoir resub !! ${months} mois à la suite !! Tu gères elviSub elviSub elviSub`);
        else twitchBot.say(channel, `Merci beaucoup ${username} pour le resub !! elviSub elviSub elviSub`);
        console.log(`${username} s'est resub avec un tier ${method.plan.charAt(0)} - Prime : ${method.prime}`);
    });

    twitchBot.on("subgift", (channel, username, streakMonths, recipient, method, userstate) => {
        twitchBot.say(channel, `Merci beaucoup ${username} d'avoir offert un sub à ${recipient} !! elviSub elviSub elviSub`);
        console.log(`${username} a offert un sub à ${recipient} avec un tier ${method.plan.charAt(0)}`);
    });

    twitchBot.on("timeout", (channel, username, reason, duration, userstate) => {
        if (duration != 0)
            twitchBot.say(channel, `Bye bye ${username} elviHey Tu pourras reparler dans ${duration} secondes.`)
        console.log(`TimeOut de ${username} pendant ${duration} s.`);
    });

    twitchBot.on("raided", (channel, username, viewers) => {
        twitchBot.say(channel, `${viewers} futurs subs potentiels viennent d'arriver via ${username} ! elviHey elviHey`)
        console.log(`Raid de ${username} avec ${viewers} viewers`);
    });

    twitchBot.on("ban", (channel, username, reason, userstate) => {
        twitchBot.say(channel, `${username}, la tribu réunifiée a décidé de vous éliminer, et leur sentence est irrévocable.`);
        console.log(`${username} a été banni ! ${reason}`);
    });

    twitchBot.on("submysterygift", (channel, username, numbOfSubs, method, userstate) => {
        twitchBot.say(channel, `OMG ${username} offre ${numbOfSubs} subs à la commu ! Débisous et merci à lui !! elviSub elviSub elviSub`);
        console.log(`${username} a offert ${numbOfSubs} subs avec un tier ${method.plan.charAt(0)}`);
    });

    twitchBot.on("cheer", (channel, userstate, message) => {
        twitchBot.say(channel, `Merci beaucoup ${userstate.username} pour ton don de ${userstate.bits} bits !! elviMoney`);
        console.log(`${userstate.username} a donné ${userstate.bits} bits`);
    });

    function bonneAnnee() {
        var minuit = new Date()
        minuit.setHours(0);
        minuit.setMinutes(0);
        minuit.setSeconds(0);
        minuit.setMilliseconds(0)
        minuit = new Date(minuit.getTime() + 79200000);
        console.log(minuit - Date.now());
        if (minuit - Date.now() > 1000) {
            setTimeout(() => {
                console.log("Bonne année");
                twitchBot.say('#mrelvilia', 'elviKappa Bonne année ! elviKappa');
                setTimeout(bonneAnnee(), 1000);
            }, minuit - Date.now());
        } else {
            console.log("ERREUR BONNE ANNEE");
        }
    }

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
        //bonneAnnee();

        streamlabs.on("newDons", dons => {
            dons.forEach(don => {
                var devise;
                switch (don.currency) {
                    case "EUR":
                        devise = "€"
                        break;
                    case "USD":
                        devise = "$"
                        break;
                    default:
                        devise = don.currency;
                        break;
                }
                twitchBot.say('#mrelvilia', `Merci beaucoup ${don.name} pour ton don de ${(+don.amount).toFixed(2).replace(/\.0+$/,'')} ${devise} !! elviMoney`)
            });
        });

    });

    // Connect to Twitch:
    twitchBot.connect();
}